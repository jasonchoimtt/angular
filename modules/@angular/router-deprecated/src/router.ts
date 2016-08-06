/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import {Location} from '@angular/common';
import {Inject, Injectable} from '@angular/core';

import {EventEmitter} from '../src/facade/async';
import {Map, StringMapWrapper} from '../src/facade/collection';
import {BaseException} from '../src/facade/exceptions';
import {Type, isBlank, isPresent} from '../src/facade/lang';

import {RouterOutlet} from './directives/router_outlet';
import {ComponentInstruction, DefaultInstruction, Instruction} from './instruction';
import {getCanActivateHook} from './lifecycle/route_lifecycle_reflector';
import {RouteDefinition} from './route_config/route_config_impl';
import {ROUTER_PRIMARY_COMPONENT, RouteRegistry} from './route_registry';

let _resolveToTrue = Promise.resolve(true);
let _resolveToFalse = Promise.resolve(false);

/**
 * The `Router` is responsible for mapping URLs to components.
 *
 * You can see the state of the router by inspecting the read-only field `router.navigating`.
 * This may be useful for showing a spinner, for instance.
 *
 * ## Concepts
 *
 * Routers and component instances have a 1:1 correspondence.
 *
 * The router holds reference to a number of {@link RouterOutlet}.
 * An outlet is a placeholder that the router dynamically fills in depending on the current URL.
 *
 * When the router navigates from a URL, it must first recognize it and serialize it into an
 * `Instruction`.
 * The router uses the `RouteRegistry` to get an `Instruction`.
 */
@Injectable()
export class Router {
  navigating: boolean = false;
  lastNavigationAttempt: string;
  /**
   * The current `Instruction` for the router
   */
  public currentInstruction: Instruction = null;

  private _currentNavigation: Promise<any> = _resolveToTrue;
  private _outlet: RouterOutlet = null;

  private _auxRouters = new Map<string, Router>();
  private _childRouter: Router;

  private _subject: EventEmitter<any> = new EventEmitter();


  constructor(
      public registry: RouteRegistry, public parent: Router, public hostComponent: any,
      public root?: Router) {}

  /**
   * Constructs a child router. You probably don't need to use this unless you're writing a reusable
   * component.
   */
  childRouter(hostComponent: any): Router {
    return this._childRouter = new ChildRouter(this, hostComponent);
  }


  /**
   * Constructs a child router. You probably don't need to use this unless you're writing a reusable
   * component.
   */
  auxRouter(hostComponent: any): Router { return new ChildRouter(this, hostComponent); }

  /**
   * Register an outlet to be notified of primary route changes.
   *
   * You probably don't need to use this unless you're writing a reusable component.
   */
  registerPrimaryOutlet(outlet: RouterOutlet): Promise<any> {
    if (outlet.name !== undefined && outlet.name !== null) {
      throw new BaseException(`registerPrimaryOutlet expects to be called with an unnamed outlet.`);
    }

    if (this._outlet !== undefined && this._outlet !== null) {
      throw new BaseException(`Primary outlet is already registered.`);
    }

    this._outlet = outlet;
    if (this.currentInstruction !== undefined && this.currentInstruction !== null) {
      return this.commit(this.currentInstruction, false);
    }
    return _resolveToTrue;
  }

  /**
   * Unregister an outlet (because it was destroyed, etc).
   *
   * You probably don't need to use this unless you're writing a custom outlet implementation.
   */
  unregisterPrimaryOutlet(outlet: RouterOutlet): void {
    if (outlet.name !== undefined && outlet.name !== null) {
      throw new BaseException(`registerPrimaryOutlet expects to be called with an unnamed outlet.`);
    }
    this._outlet = null;
  }


  /**
   * Register an outlet to notified of auxiliary route changes.
   *
   * You probably don't need to use this unless you're writing a reusable component.
   */
  registerAuxOutlet(outlet: RouterOutlet): Promise<any> {
    var outletName = outlet.name;
    if (outletName === undefined || outletName === null) {
      throw new BaseException(`registerAuxOutlet expects to be called with an outlet with a name.`);
    }

    var router = this.auxRouter(this.hostComponent);

    this._auxRouters.set(outletName, router);
    router._outlet = outlet;

    if (this.currentInstruction !== undefined && this.currentInstruction !== null) {
      var auxInstruction = this.currentInstruction.auxInstruction[outletName];
      if (auxInstruction !== undefined && auxInstruction !== null) {
        return router.commit(auxInstruction);
      }
    }
    return _resolveToTrue;
  }


  /**
   * Given an instruction, returns `true` if the instruction is currently active,
   * otherwise `false`.
   */
  isRouteActive(instruction: Instruction): boolean {
    var router: Router = this;
    var currentInstruction = this.currentInstruction;

    if (currentInstruction === undefined || currentInstruction === null) {
      return false;
    }

    // `instruction` corresponds to the root router
    while (router.parent !== undefined && router.parent !== null &&
           instruction.child !== undefined && instruction.child !== null) {
      router = router.parent;
      instruction = instruction.child;
    }

    let reason = true;

    // check the instructions in depth
    do {
      if (instruction.component === undefined || instruction.component === null ||
          currentInstruction.component === undefined || currentInstruction.component === null ||
          currentInstruction.component.routeName != instruction.component.routeName) {
        return false;
      }
      if (instruction.component.params !== undefined && instruction.component.params !== null) {
        StringMapWrapper.forEach(
            instruction.component.params,
            (value: any /** TODO #9100 */, key: any /** TODO #9100 */) => {
              if (currentInstruction.component.params[key] !== value) {
                reason = false;
              }
            });
      }
      currentInstruction = currentInstruction.child;
      instruction = instruction.child;
    } while (currentInstruction !== undefined && currentInstruction !== null &&
             instruction !== undefined && instruction !== null &&
             !(instruction instanceof DefaultInstruction) && reason);

    // ignore DefaultInstruction
    return reason && (instruction === undefined || instruction === null ||
                      instruction instanceof DefaultInstruction);
  }


  /**
   * Dynamically update the routing configuration and trigger a navigation.
   *
   * ### Usage
   *
   * ```
   * router.config([
   *   { 'path': '/', 'component': IndexComp },
   *   { 'path': '/user/:id', 'component': UserComp },
   * ]);
   * ```
   */
  config(definitions: RouteDefinition[]): Promise<any> {
    definitions.forEach(
        (routeDefinition) => { this.registry.config(this.hostComponent, routeDefinition); });
    return this.renavigate();
  }


  /**
   * Navigate based on the provided Route Link DSL. It's preferred to navigate with this method
   * over `navigateByUrl`.
   *
   * ### Usage
   *
   * This method takes an array representing the Route Link DSL:
   * ```
   * ['./MyCmp', {param: 3}]
   * ```
   * See the {@link RouterLink} directive for more.
   */
  navigate(linkParams: any[]): Promise<any> {
    var instruction = this.generate(linkParams);
    return this.navigateByInstruction(instruction, false);
  }


  /**
   * Navigate to a URL. Returns a promise that resolves when navigation is complete.
   * It's preferred to navigate with `navigate` instead of this method, since URLs are more brittle.
   *
   * If the given URL begins with a `/`, router will navigate absolutely.
   * If the given URL does not begin with `/`, the router will navigate relative to this component.
   */
  navigateByUrl(url: string, _skipLocationChange: boolean = false): Promise<any> {
    return this._currentNavigation = this._currentNavigation.then((_) => {
      this.lastNavigationAttempt = url;
      this._startNavigating();
      return this._afterPromiseFinishNavigating(this.recognize(url).then((instruction) => {
        if (instruction === undefined || instruction === null) {
          return false;
        }
        return this._navigate(instruction, _skipLocationChange);
      }));
    });
  }


  /**
   * Navigate via the provided instruction. Returns a promise that resolves when navigation is
   * complete.
   */
  navigateByInstruction(instruction: Instruction, _skipLocationChange: boolean = false):
      Promise<any> {
    if (instruction === undefined || instruction === null) {
      return _resolveToFalse;
    }
    return this._currentNavigation = this._currentNavigation.then((_) => {
      this._startNavigating();
      return this._afterPromiseFinishNavigating(this._navigate(instruction, _skipLocationChange));
    });
  }

  /** @internal */
  _settleInstruction(instruction: Instruction): Promise<any> {
    return instruction.resolveComponent().then((_) => {
      var unsettledInstructions: Array<Promise<any>> = [];

      if (instruction.component !== undefined && instruction.component !== null) {
        instruction.component.reuse = false;
      }

      if (instruction.child !== undefined && instruction.child !== null) {
        unsettledInstructions.push(this._settleInstruction(instruction.child));
      }

      StringMapWrapper.forEach(
          instruction.auxInstruction, (instruction: Instruction, _: any /** TODO #9100 */) => {
            unsettledInstructions.push(this._settleInstruction(instruction));
          });
      return Promise.all(unsettledInstructions);
    });
  }

  /** @internal */
  _navigate(instruction: Instruction, _skipLocationChange: boolean): Promise<any> {
    return this._settleInstruction(instruction)
        .then((_) => this._routerCanReuse(instruction))
        .then((_) => this._canActivate(instruction))
        .then((result: boolean) => {
          if (!result) {
            return false;
          }
          return this._routerCanDeactivate(instruction).then((result: boolean) => {
            if (result) {
              return this.commit(instruction, _skipLocationChange).then((_) => {
                this._emitNavigationFinish(instruction.component);
                return true;
              });
            }
          });
        });
  }

  private _emitNavigationFinish(instruction: ComponentInstruction): void {
    this._subject.emit({status: 'success', instruction});
  }
  /** @internal */
  _emitNavigationFail(url: string): void { this._subject.emit({status: 'fail', url}); }

  private _afterPromiseFinishNavigating(promise: Promise<any>): Promise<any> {
    return promise.then(() => this._finishNavigating()).catch((err) => {
      this._finishNavigating();
      throw err;
    });
  }

  /*
   * Recursively set reuse flags
   */
  /** @internal */
  _routerCanReuse(instruction: Instruction): Promise<any> {
    if (this._outlet === undefined || this._outlet === null) {
      return _resolveToFalse;
    }
    if (instruction.component === undefined || instruction.component === null) {
      return _resolveToTrue;
    }
    return this._outlet.routerCanReuse(instruction.component).then((result) => {
      instruction.component.reuse = result;
      if (result && this._childRouter !== undefined && this._childRouter !== null &&
          instruction.child !== undefined && instruction.child !== null) {
        return this._childRouter._routerCanReuse(instruction.child);
      }
    });
  }

  private _canActivate(nextInstruction: Instruction): Promise<boolean> {
    return canActivateOne(nextInstruction, this.currentInstruction);
  }

  private _routerCanDeactivate(instruction: Instruction): Promise<boolean> {
    if (this._outlet === undefined || this._outlet === null) {
      return _resolveToTrue;
    }
    var next: Promise<boolean>;
    var childInstruction: Instruction = null;
    var reuse: boolean = false;
    var componentInstruction: ComponentInstruction = null;
    if (instruction !== undefined && instruction !== null) {
      childInstruction = instruction.child;
      componentInstruction = instruction.component;
      reuse = instruction.component === undefined || instruction.component === null ||
          instruction.component.reuse;
    }
    if (reuse) {
      next = _resolveToTrue;
    } else {
      next = this._outlet.routerCanDeactivate(componentInstruction);
    }
    // TODO: aux route lifecycle hooks
    return next.then<boolean>((result): boolean | Promise<boolean> => {
      if (result == false) {
        return false;
      }
      if (this._childRouter !== undefined && this._childRouter !== null) {
        // TODO: ideally, this closure would map to async-await in Dart.
        // For now, casting to any to suppress an error.
        return <any>this._childRouter._routerCanDeactivate(childInstruction);
      }
      return true;
    });
  }

  /**
   * Updates this router and all descendant routers according to the given instruction
   */
  commit(instruction: Instruction, _skipLocationChange: boolean = false): Promise<any> {
    this.currentInstruction = instruction;

    var next: Promise<any> = _resolveToTrue;
    if (this._outlet !== undefined && this._outlet !== null &&
        instruction.component !== undefined && instruction.component !== null) {
      var componentInstruction = instruction.component;
      if (componentInstruction.reuse) {
        next = this._outlet.reuse(componentInstruction);
      } else {
        next =
            this.deactivate(instruction).then((_) => this._outlet.activate(componentInstruction));
      }
      if (instruction.child !== undefined && instruction.child !== null) {
        next = next.then((_) => {
          if (this._childRouter !== undefined && this._childRouter !== null) {
            return this._childRouter.commit(instruction.child);
          }
        });
      }
    }

    var promises: Promise<any>[] = [];
    this._auxRouters.forEach((router, name) => {
      if (instruction.auxInstruction[name] !== undefined &&
          instruction.auxInstruction[name] !== null) {
        promises.push(router.commit(instruction.auxInstruction[name]));
      }
    });

    return next.then((_) => Promise.all(promises));
  }


  /** @internal */
  _startNavigating(): void { this.navigating = true; }

  /** @internal */
  _finishNavigating(): void { this.navigating = false; }


  /**
   * Subscribe to URL updates from the router
   */
  subscribe(onNext: (value: any) => void, onError?: (value: any) => void): Object {
    return this._subject.subscribe({next: onNext, error: onError});
  }


  /**
   * Removes the contents of this router's outlet and all descendant outlets
   */
  deactivate(instruction: Instruction): Promise<any> {
    var childInstruction: Instruction = null;
    var componentInstruction: ComponentInstruction = null;
    if (instruction !== undefined && instruction !== null) {
      childInstruction = instruction.child;
      componentInstruction = instruction.component;
    }
    var next: Promise<any> = _resolveToTrue;
    if (this._childRouter !== undefined && this._childRouter !== null) {
      next = this._childRouter.deactivate(childInstruction);
    }
    if (this._outlet !== undefined && this._outlet !== null) {
      next = next.then((_) => this._outlet.deactivate(componentInstruction));
    }

    // TODO: handle aux routes

    return next;
  }


  /**
   * Given a URL, returns an instruction representing the component graph
   */
  recognize(url: string): Promise<Instruction> {
    var ancestorComponents = this._getAncestorInstructions();
    return this.registry.recognize(url, ancestorComponents);
  }

  private _getAncestorInstructions(): Instruction[] {
    var ancestorInstructions: Instruction[] = [this.currentInstruction];
    var ancestorRouter: Router = this;
    while ((ancestorRouter = ancestorRouter.parent) ||
           ancestorRouter !== undefined && ancestorRouter !== null) {
      ancestorInstructions.unshift(ancestorRouter.currentInstruction);
    }
    return ancestorInstructions;
  }


  /**
   * Navigates to either the last URL successfully navigated to, or the last URL requested if the
   * router has yet to successfully navigate.
   */
  renavigate(): Promise<any> {
    if (this.lastNavigationAttempt === undefined || this.lastNavigationAttempt === null) {
      return this._currentNavigation;
    }
    return this.navigateByUrl(this.lastNavigationAttempt);
  }


  /**
   * Generate an `Instruction` based on the provided Route Link DSL.
   */
  generate(linkParams: any[]): Instruction {
    var ancestorInstructions = this._getAncestorInstructions();
    return this.registry.generate(linkParams, ancestorInstructions);
  }
}

@Injectable()
export class RootRouter extends Router {
  /** @internal */
  _location: Location;
  /** @internal */
  _locationSub: Object;

  constructor(
      registry: RouteRegistry, location: Location,
      @Inject(ROUTER_PRIMARY_COMPONENT) primaryComponent: Type) {
    super(registry, null, primaryComponent);
    this.root = this;
    this._location = location;
    this._locationSub = this._location.subscribe((change) => {
      // we call recognize ourselves
      this.recognize(change['url']).then((instruction) => {
        if (instruction !== undefined && instruction !== null) {
          this.navigateByInstruction(
                  instruction, change['pop'] !== undefined && change['pop'] !== null)
              .then((_) => {
                // this is a popstate event; no need to change the URL
                if (change['pop'] !== undefined && change['pop'] !== null &&
                    change['type'] != 'hashchange') {
                  return;
                }
                var emitPath = instruction.toUrlPath();
                var emitQuery = instruction.toUrlQuery();
                if (emitPath.length > 0 && emitPath[0] != '/') {
                  emitPath = '/' + emitPath;
                }

                // We've opted to use pushstate and popState APIs regardless of whether you
                // an app uses HashLocationStrategy or PathLocationStrategy.
                // However, apps that are migrating might have hash links that operate outside
                // angular to which routing must respond.
                // Therefore we know that all hashchange events occur outside Angular.
                // To support these cases where we respond to hashchanges and redirect as a
                // result, we need to replace the top item on the stack.
                if (change['type'] == 'hashchange') {
                  if (instruction.toRootUrl() != this._location.path()) {
                    this._location.replaceState(emitPath, emitQuery);
                  }
                } else {
                  this._location.go(emitPath, emitQuery);
                }
              });
        } else {
          this._emitNavigationFail(change['url']);
        }
      });
    });

    this.registry.configFromComponent(primaryComponent);
    this.navigateByUrl(location.path());
  }

  commit(instruction: Instruction, _skipLocationChange: boolean = false): Promise<any> {
    var emitPath = instruction.toUrlPath();
    var emitQuery = instruction.toUrlQuery();
    if (emitPath.length > 0 && emitPath[0] != '/') {
      emitPath = '/' + emitPath;
    }
    var promise = super.commit(instruction);
    if (!_skipLocationChange) {
      if (this._location.isCurrentPathEqualTo(emitPath, emitQuery)) {
        promise = promise.then((_) => { this._location.replaceState(emitPath, emitQuery); });
      } else {
        promise = promise.then((_) => { this._location.go(emitPath, emitQuery); });
      }
    }
    return promise;
  }

  ngOnDestroy() { this.dispose(); }

  dispose(): void {
    if (this._locationSub !== undefined && this._locationSub !== null) {
      (<any>this._locationSub).unsubscribe();
      this._locationSub = null;
    }
  }
}

class ChildRouter extends Router {
  constructor(parent: Router, hostComponent: any /** TODO #9100 */) {
    super(parent.registry, parent, hostComponent, parent.root);
    this.parent = parent;
  }


  navigateByUrl(url: string, _skipLocationChange: boolean = false): Promise<any> {
    // Delegate navigation to the root router
    return this.parent.navigateByUrl(url, _skipLocationChange);
  }

  navigateByInstruction(instruction: Instruction, _skipLocationChange: boolean = false):
      Promise<any> {
    // Delegate navigation to the root router
    return this.parent.navigateByInstruction(instruction, _skipLocationChange);
  }
}


function canActivateOne(
    nextInstruction: Instruction, prevInstruction: Instruction): Promise<boolean> {
  var next = _resolveToTrue;
  if (nextInstruction.component === undefined || nextInstruction.component === null) {
    return next;
  }
  if (nextInstruction.child !== undefined && nextInstruction.child !== null) {
    next = canActivateOne(
        nextInstruction.child,
        prevInstruction !== undefined && prevInstruction !== null ? prevInstruction.child : null);
  }
  return next.then<boolean>((result: boolean): boolean => {
    if (result == false) {
      return false;
    }
    if (nextInstruction.component.reuse) {
      return true;
    }
    var hook = getCanActivateHook(nextInstruction.component.componentType);
    if (hook !== undefined && hook !== null) {
      return hook(
          nextInstruction.component, prevInstruction !== undefined && prevInstruction !== null ?
              prevInstruction.component :
              null);
    }
    return true;
  });
}
