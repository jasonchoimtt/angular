/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import {Inject, Injectable, OpaqueToken} from '@angular/core';

import {reflector} from '../core_private';
import {ListWrapper, Map, StringMapWrapper} from '../src/facade/collection';
import {BaseException} from '../src/facade/exceptions';
import {Math, StringWrapper, Type} from '../src/facade/lang';

import {DefaultInstruction, Instruction, RedirectInstruction, ResolvedInstruction, UnresolvedInstruction} from './instruction';
import {AuxRoute, Route, RouteConfig, RouteDefinition} from './route_config/route_config_impl';
import {assertComponentExists, normalizeRouteConfig} from './route_config/route_config_normalizer';
import {GeneratedUrl} from './rules/route_paths/route_path';
import {RuleSet} from './rules/rule_set';
import {PathMatch, RedirectMatch, RouteMatch} from './rules/rules';
import {Url, convertUrlParamsToArray, parser} from './url_parser';

var _resolveToNull = Promise.resolve(null);

// A LinkItemArray is an array, which describes a set of routes
// The items in the array are found in groups:
// - the first item is the name of the route
// - the next items are:
//   - an object containing parameters
//   - or an array describing an aux route
// export type LinkRouteItem = string | Object;
// export type LinkItem = LinkRouteItem | Array<LinkRouteItem>;
// export type LinkItemArray = Array<LinkItem>;

/**
 * Token used to bind the component with the top-level {@link RouteConfig}s for the
 * application.
 *
 * ### Example ([live demo](http://plnkr.co/edit/iRUP8B5OUbxCWQ3AcIDm))
 *
 * ```
 * import {Component} from '@angular/core';
 * import {
 *   ROUTER_DIRECTIVES,
 *   ROUTER_PROVIDERS,
 *   RouteConfig
 * } from '@angular/router-deprecated';
 *
 * @Component({directives: [ROUTER_DIRECTIVES]})
 * @RouteConfig([
 *  {...},
 * ])
 * class AppCmp {
 *   // ...
 * }
 *
 * bootstrap(AppCmp, [ROUTER_PROVIDERS]);
 * ```
 */
export const ROUTER_PRIMARY_COMPONENT: OpaqueToken = new OpaqueToken('RouterPrimaryComponent');


/**
 * The RouteRegistry holds route configurations for each component in an Angular app.
 * It is responsible for creating Instructions from URLs, and generating URLs based on route and
 * parameters.
 */
@Injectable()
export class RouteRegistry {
  private _rules = new Map<any, RuleSet>();

  constructor(@Inject(ROUTER_PRIMARY_COMPONENT) private _rootComponent: Type) {}

  /**
   * Given a component and a configuration object, add the route to this registry
   */
  config(parentComponent: any, config: RouteDefinition): void {
    config = normalizeRouteConfig(config, this);

    // this is here because Dart type guard reasons
    if (config instanceof Route) {
      assertComponentExists(config.component, config.path);
    } else if (config instanceof AuxRoute) {
      assertComponentExists(config.component, config.path);
    }

    var rules = this._rules.get(parentComponent);

    if (rules === undefined || rules === null) {
      rules = new RuleSet();
      this._rules.set(parentComponent, rules);
    }

    var terminal = rules.config(config);

    if (config instanceof Route) {
      if (terminal) {
        assertTerminalComponent(config.component, config.path);
      } else {
        this.configFromComponent(config.component);
      }
    }
  }

  /**
   * Reads the annotations of a component and configures the registry based on them
   */
  configFromComponent(component: any): void {
    if (typeof component !== 'function') {
      return;
    }

    // Don't read the annotations from a type more than once –
    // this prevents an infinite loop if a component routes recursively.
    if (this._rules.has(component)) {
      return;
    }
    var annotations = reflector.annotations(component);
    if (annotations !== undefined && annotations !== null) {
      for (var i = 0; i < annotations.length; i++) {
        var annotation = annotations[i];

        if (annotation instanceof RouteConfig) {
          let routeCfgs: RouteDefinition[] = annotation.configs;
          routeCfgs.forEach(config => this.config(component, config));
        }
      }
    }
  }


  /**
   * Given a URL and a parent component, return the most specific instruction for navigating
   * the application into the state specified by the url
   */
  recognize(url: string, ancestorInstructions: Instruction[]): Promise<Instruction> {
    var parsedUrl = parser.parse(url);
    return this._recognize(parsedUrl, []);
  }


  /**
   * Recognizes all parent-child routes, but creates unresolved auxiliary routes
   */
  private _recognize(parsedUrl: Url, ancestorInstructions: Instruction[], _aux = false):
      Promise<Instruction> {
    var parentInstruction = ListWrapper.last(ancestorInstructions);
    var parentComponent =
        parentInstruction ? parentInstruction.component.componentType : this._rootComponent;

    var rules = this._rules.get(parentComponent);
    if (rules === undefined || rules === null) {
      return _resolveToNull;
    }

    // Matches some beginning part of the given URL
    var possibleMatches: Promise<RouteMatch>[] =
        _aux ? rules.recognizeAuxiliary(parsedUrl) : rules.recognize(parsedUrl);

    var matchPromises: Promise<Instruction>[] = possibleMatches.map(
        (candidate: Promise<RouteMatch>) => candidate.then((candidate: RouteMatch) => {

          if (candidate instanceof PathMatch) {
            var auxParentInstructions: Instruction[] =
                ancestorInstructions.length > 0 ? [ListWrapper.last(ancestorInstructions)] : [];
            var auxInstructions =
                this._auxRoutesToUnresolved(candidate.remainingAux, auxParentInstructions);

            var instruction = new ResolvedInstruction(candidate.instruction, null, auxInstructions);

            if (!candidate.instruction || candidate.instruction.terminal) {
              return instruction;
            }

            var newAncestorInstructions: Instruction[] = ancestorInstructions.concat([instruction]);

            return this._recognize(candidate.remaining, newAncestorInstructions)
                .then((childInstruction) => {
                  if (childInstruction === undefined || childInstruction === null) {
                    return null;
                  }

                  // redirect instructions are already absolute
                  if (childInstruction instanceof RedirectInstruction) {
                    return childInstruction;
                  }
                  instruction.child = childInstruction;
                  return instruction;
                });
          }

          if (candidate instanceof RedirectMatch) {
            var instruction =
                this.generate(candidate.redirectTo, ancestorInstructions.concat([null]));
            return new RedirectInstruction(
                instruction.component, instruction.child, instruction.auxInstruction,
                candidate.specificity);
          }
        }));

    if ((!parsedUrl || parsedUrl.path == '') && possibleMatches.length == 0) {
      return Promise.resolve(this.generateDefault(parentComponent));
    }

    return Promise.all<Instruction>(matchPromises).then(mostSpecific);
  }

  private _auxRoutesToUnresolved(auxRoutes: Url[], parentInstructions: Instruction[]):
      {[key: string]: Instruction} {
    var unresolvedAuxInstructions: {[key: string]: Instruction} = {};

    auxRoutes.forEach((auxUrl: Url) => {
      unresolvedAuxInstructions[auxUrl.path] = new UnresolvedInstruction(
          () => { return this._recognize(auxUrl, parentInstructions, true); });
    });

    return unresolvedAuxInstructions;
  }


  /**
   * Given a normalized list with component names and params like: `['user', {id: 3 }]`
   * generates a url with a leading slash relative to the provided `parentComponent`.
   *
   * If the optional param `_aux` is `true`, then we generate starting at an auxiliary
   * route boundary.
   */
  generate(linkParams: any[], ancestorInstructions: Instruction[], _aux = false): Instruction {
    var params = splitAndFlattenLinkParams(linkParams);
    var prevInstruction: any /** TODO #9100 */;

    // The first segment should be either '.' (generate from parent) or '' (generate from root).
    // When we normalize above, we strip all the slashes, './' becomes '.' and '/' becomes ''.
    if (ListWrapper.first(params) == '') {
      params.shift();
      prevInstruction = ListWrapper.first(ancestorInstructions);
      ancestorInstructions = [];
    } else {
      prevInstruction = ancestorInstructions.length > 0 ? ancestorInstructions.pop() : null;

      if (ListWrapper.first(params) == '.') {
        params.shift();
      } else if (ListWrapper.first(params) == '..') {
        while (ListWrapper.first(params) == '..') {
          if (ancestorInstructions.length <= 0) {
            throw new BaseException(
                `Link "${ListWrapper.toJSON(linkParams)}" has too many "../" segments.`);
          }
          prevInstruction = ancestorInstructions.pop();
          params = ListWrapper.slice(params, 1);
        }

        // we're on to implicit child/sibling route
      } else {
        // we must only peak at the link param, and not consume it
        let routeName = ListWrapper.first(params);
        let parentComponentType = this._rootComponent;
        let grandparentComponentType: any /** TODO #9100 */ = null;

        if (ancestorInstructions.length > 1) {
          let parentComponentInstruction = ancestorInstructions[ancestorInstructions.length - 1];
          let grandComponentInstruction = ancestorInstructions[ancestorInstructions.length - 2];

          parentComponentType = parentComponentInstruction.component.componentType;
          grandparentComponentType = grandComponentInstruction.component.componentType;
        } else if (ancestorInstructions.length == 1) {
          parentComponentType = ancestorInstructions[0].component.componentType;
          grandparentComponentType = this._rootComponent;
        }

        // For a link with no leading `./`, `/`, or `../`, we look for a sibling and child.
        // If both exist, we throw. Otherwise, we prefer whichever exists.
        var childRouteExists = this.hasRoute(routeName, parentComponentType);
        var parentRouteExists = grandparentComponentType !== undefined &&
            grandparentComponentType !== null && this.hasRoute(routeName, grandparentComponentType);

        if (parentRouteExists && childRouteExists) {
          let msg =
              `Link "${ListWrapper.toJSON(linkParams)}" is ambiguous, use "./" or "../" to disambiguate.`;
          throw new BaseException(msg);
        }

        if (parentRouteExists) {
          prevInstruction = ancestorInstructions.pop();
        }
      }
    }

    if (params[params.length - 1] == '') {
      params.pop();
    }

    if (params.length > 0 && params[0] == '') {
      params.shift();
    }

    if (params.length < 1) {
      let msg = `Link "${ListWrapper.toJSON(linkParams)}" must include a route name.`;
      throw new BaseException(msg);
    }

    var generatedInstruction =
        this._generate(params, ancestorInstructions, prevInstruction, _aux, linkParams);

    // we don't clone the first (root) element
    for (var i = ancestorInstructions.length - 1; i >= 0; i--) {
      let ancestorInstruction = ancestorInstructions[i];
      if (!ancestorInstruction) {
        break;
      }
      generatedInstruction = ancestorInstruction.replaceChild(generatedInstruction);
    }

    return generatedInstruction;
  }


  /*
   * Internal helper that does not make any assertions about the beginning of the link DSL.
   * `ancestorInstructions` are parents that will be cloned.
   * `prevInstruction` is the existing instruction that would be replaced, but which might have
   * aux routes that need to be cloned.
   */
  private _generate(
      linkParams: any[], ancestorInstructions: Instruction[], prevInstruction: Instruction,
      _aux = false, _originalLink: any[]): Instruction {
    let parentComponentType = this._rootComponent;
    let componentInstruction: any /** TODO #9100 */ = null;
    let auxInstructions: {[key: string]: Instruction} = {};

    let parentInstruction: Instruction = ListWrapper.last(ancestorInstructions);
    if (parentInstruction && parentInstruction.component !== undefined &&
        parentInstruction.component !== null) {
      parentComponentType = parentInstruction.component.componentType;
    }

    if (linkParams.length == 0) {
      let defaultInstruction = this.generateDefault(parentComponentType);
      if (!defaultInstruction) {
        throw new BaseException(
            `Link "${ListWrapper.toJSON(_originalLink)}" does not resolve to a terminal instruction.`);
      }
      return defaultInstruction;
    }

    // for non-aux routes, we want to reuse the predecessor's existing primary and aux routes
    // and only override routes for which the given link DSL provides
    if (prevInstruction && !_aux) {
      auxInstructions = StringMapWrapper.merge(prevInstruction.auxInstruction, auxInstructions);
      componentInstruction = prevInstruction.component;
    }

    var rules = this._rules.get(parentComponentType);
    if (rules === undefined || rules === null) {
      throw new BaseException(
          `Component "${parentComponentType['name'] || typeof parentComponentType}" has no route config.`);
    }

    let linkParamIndex = 0;
    let routeParams: {[key: string]: any} = {};

    // first, recognize the primary route if one is provided
    if (linkParamIndex < linkParams.length && typeof linkParams[linkParamIndex] === 'string') {
      let routeName = linkParams[linkParamIndex];
      if (routeName == '' || routeName == '.' || routeName == '..') {
        throw new BaseException(`"${routeName}/" is only allowed at the beginning of a link DSL.`);
      }
      linkParamIndex += 1;
      if (linkParamIndex < linkParams.length) {
        let linkParam = linkParams[linkParamIndex];
        if (typeof linkParam === 'object' && linkParam !== null && !Array.isArray(linkParam)) {
          routeParams = linkParam;
          linkParamIndex += 1;
        }
      }
      var routeRecognizer = (_aux ? rules.auxRulesByName : rules.rulesByName).get(routeName);

      if (routeRecognizer === undefined || routeRecognizer === null) {
        throw new BaseException(
            `Component "${parentComponentType['name'] || typeof parentComponentType}" has no route named "${routeName}".`);
      }

      // Create an "unresolved instruction" for async routes
      // we'll figure out the rest of the route when we resolve the instruction and
      // perform a navigation
      if (routeRecognizer.handler.componentType === undefined ||
          routeRecognizer.handler.componentType === null) {
        var generatedUrl: GeneratedUrl = routeRecognizer.generateComponentPathValues(routeParams);
        return new UnresolvedInstruction(() => {
          return routeRecognizer.handler.resolveComponentType().then((_) => {
            return this._generate(
                linkParams, ancestorInstructions, prevInstruction, _aux, _originalLink);
          });
        }, generatedUrl.urlPath, convertUrlParamsToArray(generatedUrl.urlParams));
      }

      componentInstruction = _aux ? rules.generateAuxiliary(routeName, routeParams) :
                                    rules.generate(routeName, routeParams);
    }

    // Next, recognize auxiliary instructions.
    // If we have an ancestor instruction, we preserve whatever aux routes are active from it.
    while (linkParamIndex < linkParams.length && Array.isArray(linkParams[linkParamIndex])) {
      let auxParentInstruction: Instruction[] = [parentInstruction];
      let auxInstruction = this._generate(
          linkParams[linkParamIndex], auxParentInstruction, null, true, _originalLink);

      // TODO: this will not work for aux routes with parameters or multiple segments
      auxInstructions[auxInstruction.component.urlPath] = auxInstruction;
      linkParamIndex += 1;
    }

    var instruction = new ResolvedInstruction(componentInstruction, null, auxInstructions);

    // If the component is sync, we can generate resolved child route instructions
    // If not, we'll resolve the instructions at navigation time
    if (componentInstruction !== undefined && componentInstruction !== null &&
        componentInstruction.componentType !== undefined &&
        componentInstruction.componentType !== null) {
      let childInstruction: Instruction = null;
      if (componentInstruction.terminal) {
        if (linkParamIndex >= linkParams.length) {
          // TODO: throw that there are extra link params beyond the terminal component
        }
      } else {
        let childAncestorComponents: Instruction[] = ancestorInstructions.concat([instruction]);
        let remainingLinkParams = linkParams.slice(linkParamIndex);
        childInstruction = this._generate(
            remainingLinkParams, childAncestorComponents, null, false, _originalLink);
      }
      instruction.child = childInstruction;
    }

    return instruction;
  }

  public hasRoute(name: string, parentComponent: any): boolean {
    var rules = this._rules.get(parentComponent);
    if (rules === undefined || rules === null) {
      return false;
    }
    return rules.hasRoute(name);
  }

  public generateDefault(componentCursor: Type): Instruction {
    if (!componentCursor) {
      return null;
    }

    var rules = this._rules.get(componentCursor);
    if (rules === undefined || rules === null || rules.defaultRule === undefined ||
        rules.defaultRule === null) {
      return null;
    }

    var defaultChild: any /** TODO #9100 */ = null;
    if (rules.defaultRule.handler.componentType !== undefined &&
        rules.defaultRule.handler.componentType !== null) {
      var componentInstruction = rules.defaultRule.generate({});
      if (!rules.defaultRule.terminal) {
        defaultChild = this.generateDefault(rules.defaultRule.handler.componentType);
      }
      return new DefaultInstruction(componentInstruction, defaultChild);
    }

    return new UnresolvedInstruction(() => {
      return rules.defaultRule.handler.resolveComponentType().then(
          (_) => this.generateDefault(componentCursor));
    });
  }
}

/*
 * Given: ['/a/b', {c: 2}]
 * Returns: ['', 'a', 'b', {c: 2}]
 */
function splitAndFlattenLinkParams(linkParams: any[]): any[] {
  var accumulation: any[] /** TODO #9100 */ = [];
  linkParams.forEach(function(item: any) {
    if (typeof item === 'string') {
      var strItem: string = <string>item;
      accumulation = accumulation.concat(strItem.split('/'));
    } else {
      accumulation.push(item);
    }
  });
  return accumulation;
}


/*
 * Given a list of instructions, returns the most specific instruction
 */
function mostSpecific(instructions: Instruction[]): Instruction {
  instructions = instructions.filter((instruction) => !!instruction);
  if (instructions.length == 0) {
    return null;
  }
  if (instructions.length == 1) {
    return instructions[0];
  }
  var first = instructions[0];
  var rest = instructions.slice(1);
  return rest.reduce((instruction: Instruction, contender: Instruction) => {
    if (compareSpecificityStrings(contender.specificity, instruction.specificity) == -1) {
      return contender;
    }
    return instruction;
  }, first);
}

/*
 * Expects strings to be in the form of "[0-2]+"
 * Returns -1 if string A should be sorted above string B, 1 if it should be sorted after,
 * or 0 if they are the same.
 */
function compareSpecificityStrings(a: string, b: string): number {
  var l = Math.min(a.length, b.length);
  for (var i = 0; i < l; i += 1) {
    var ai = StringWrapper.charCodeAt(a, i);
    var bi = StringWrapper.charCodeAt(b, i);
    var difference = bi - ai;
    if (difference != 0) {
      return difference;
    }
  }
  return a.length - b.length;
}

function assertTerminalComponent(component: any /** TODO #9100 */, path: any /** TODO #9100 */) {
  if (typeof component !== 'function') {
    return;
  }

  var annotations = reflector.annotations(component);
  if (annotations !== undefined && annotations !== null) {
    for (var i = 0; i < annotations.length; i++) {
      var annotation = annotations[i];

      if (annotation instanceof RouteConfig) {
        throw new BaseException(
            `Child routes are not allowed for "${path}". Use "..." on the parent's route path.`);
      }
    }
  }
}
