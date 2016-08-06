/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import {StringMapWrapper} from '../src/facade/collection';
import {isBlank, isPresent, normalizeBlank} from '../src/facade/lang';



/**
 * `RouteParams` is an immutable map of parameters for the given route
 * based on the url matcher and optional parameters for that route.
 *
 * You can inject `RouteParams` into the constructor of a component to use it.
 *
 * ### Example
 *
 * ```
 * import {Component} from '@angular/core';
 * import {bootstrap} from '@angular/platform-browser/browser';
 * import {Router, ROUTER_DIRECTIVES, ROUTER_PROVIDERS, RouteConfig, RouteParams} from
 * 'angular2/router';
 *
 * @Component({directives: [ROUTER_DIRECTIVES]})
 * @RouteConfig([
 *  {path: '/user/:id', component: UserCmp, name: 'UserCmp'},
 * ])
 * class AppCmp {}
 *
 * @Component({ template: 'user: {{id}}' })
 * class UserCmp {
 *   id: string;
 *   constructor(params: RouteParams) {
 *     this.id = params.get('id');
 *   }
 * }
 *
 * bootstrap(AppCmp, ROUTER_PROVIDERS);
 * ```
 */
export class RouteParams {
  constructor(public params: {[key: string]: string}) {}

  get(param: string): string {
    const obj = StringMapWrapper.get(this.params, param);
    return obj === undefined ? null : obj;
  }
}

/**
 * `RouteData` is an immutable map of additional data you can configure in your {@link Route}.
 *
 * You can inject `RouteData` into the constructor of a component to use it.
 *
 * ### Example
 *
 * ```
 * import {Component} from '@angular/core';
 * import {bootstrap} from '@angular/platform-browser/browser';
 * import {Router, ROUTER_DIRECTIVES, ROUTER_PROVIDERS, RouteConfig, RouteData} from
 * 'angular2/router';
 *
 * @Component({directives: [ROUTER_DIRECTIVES]})
 * @RouteConfig([
 *  {path: '/user/:id', component: UserCmp, name: 'UserCmp', data: {isAdmin: true}},
 * ])
 * class AppCmp {}
 *
 * @Component({
 *   ...,
 *   template: 'user: {{isAdmin}}'
 * })
 * class UserCmp {
 *   string: isAdmin;
 *   constructor(data: RouteData) {
 *     this.isAdmin = data.get('isAdmin');
 *   }
 * }
 *
 * bootstrap(AppCmp, ROUTER_PROVIDERS);
 * ```
 */
export class RouteData {
  constructor(public data: {[key: string]: any} = {}) {}

  get(key: string): any {
    const obj = StringMapWrapper.get(this.data, key);
    return obj === undefined ? null : obj;
  }
}

export var BLANK_ROUTE_DATA = new RouteData();

/**
 * `Instruction` is a tree of {@link ComponentInstruction}s with all the information needed
 * to transition each component in the app to a given route, including all auxiliary routes.
 *
 * `Instruction`s can be created using {@link Router#generate}, and can be used to
 * perform route changes with {@link Router#navigateByInstruction}.
 *
 * ### Example
 *
 * ```
 * import {Component} from '@angular/core';
 * import {bootstrap} from '@angular/platform-browser/browser';
 * import {Router, ROUTER_DIRECTIVES, ROUTER_PROVIDERS, RouteConfig} from
 * '@angular/router-deprecated';
 *
 * @Component({directives: [ROUTER_DIRECTIVES]})
 * @RouteConfig([
 *  {...},
 * ])
 * class AppCmp {
 *   constructor(router: Router) {
 *     var instruction = router.generate(['/MyRoute']);
 *     router.navigateByInstruction(instruction);
 *   }
 * }
 *
 * bootstrap(AppCmp, ROUTER_PROVIDERS);
 * ```
 */
export abstract class Instruction {
  constructor(
      public component: ComponentInstruction, public child: Instruction,
      public auxInstruction: {[key: string]: Instruction}) {}

  get urlPath(): string {
    return this.component !== undefined && this.component !== null ? this.component.urlPath : '';
  }

  get urlParams(): string[] {
    return this.component !== undefined && this.component !== null ? this.component.urlParams : [];
  }

  get specificity(): string {
    var total = '';
    if (this.component !== undefined && this.component !== null) {
      total += this.component.specificity;
    }
    if (this.child !== undefined && this.child !== null) {
      total += this.child.specificity;
    }
    return total;
  }

  abstract resolveComponent(): Promise<ComponentInstruction>;

  /**
   * converts the instruction into a URL string
   */
  toRootUrl(): string { return this.toUrlPath() + this.toUrlQuery(); }

  /** @internal */
  _toNonRootUrl(): string {
    return this._stringifyPathMatrixAuxPrefixed() +
        (this.child !== undefined && this.child !== null ? this.child._toNonRootUrl() : '');
  }

  toUrlQuery(): string { return this.urlParams.length > 0 ? ('?' + this.urlParams.join('&')) : ''; }

  /**
   * Returns a new instruction that shares the state of the existing instruction, but with
   * the given child {@link Instruction} replacing the existing child.
   */
  replaceChild(child: Instruction): Instruction {
    return new ResolvedInstruction(this.component, child, this.auxInstruction);
  }

  /**
   * If the final URL for the instruction is ``
   */
  toUrlPath(): string {
    return this.urlPath + this._stringifyAux() +
        (this.child !== undefined && this.child !== null ? this.child._toNonRootUrl() : '');
  }

  // default instructions override these
  toLinkUrl(): string {
    return this.urlPath + this._stringifyAux() +
        (this.child !== undefined && this.child !== null ? this.child._toLinkUrl() : '') +
        this.toUrlQuery();
  }

  // this is the non-root version (called recursively)
  /** @internal */
  _toLinkUrl(): string {
    return this._stringifyPathMatrixAuxPrefixed() +
        (this.child !== undefined && this.child !== null ? this.child._toLinkUrl() : '');
  }

  /** @internal */
  _stringifyPathMatrixAuxPrefixed(): string {
    var primary = this._stringifyPathMatrixAux();
    if (primary.length > 0) {
      primary = '/' + primary;
    }
    return primary;
  }

  /** @internal */
  _stringifyMatrixParams(): string {
    return this.urlParams.length > 0 ? (';' + this.urlParams.join(';')) : '';
  }

  /** @internal */
  _stringifyPathMatrixAux(): string {
    if ((this.component === undefined || this.component === null) &&
        (this.urlPath === undefined || this.urlPath === null)) {
      return '';
    }
    return this.urlPath + this._stringifyMatrixParams() + this._stringifyAux();
  }

  /** @internal */
  _stringifyAux(): string {
    var routes: any[] /** TODO #9100 */ = [];
    StringMapWrapper.forEach(this.auxInstruction, (auxInstruction: Instruction, _: string) => {
      routes.push(auxInstruction._stringifyPathMatrixAux());
    });
    if (routes.length > 0) {
      return '(' + routes.join('//') + ')';
    }
    return '';
  }
}


/**
 * a resolved instruction has an outlet instruction for itself, but maybe not for...
 */
export class ResolvedInstruction extends Instruction {
  constructor(
      component: ComponentInstruction, child: Instruction,
      auxInstruction: {[key: string]: Instruction}) {
    super(component, child, auxInstruction);
  }

  resolveComponent(): Promise<ComponentInstruction> { return Promise.resolve(this.component); }
}


/**
 * Represents a resolved default route
 */
export class DefaultInstruction extends ResolvedInstruction {
  constructor(component: ComponentInstruction, child: DefaultInstruction) {
    super(component, child, {});
  }

  toLinkUrl(): string { return ''; }

  /** @internal */
  _toLinkUrl(): string { return ''; }
}


/**
 * Represents a component that may need to do some redirection or lazy loading at a later time.
 */
export class UnresolvedInstruction extends Instruction {
  constructor(
      private _resolver: () => Promise<Instruction>, private _urlPath: string = '',
      private _urlParams: string[] = []) {
    super(null, null, {});
  }

  get urlPath(): string {
    if (this.component !== undefined && this.component !== null) {
      return this.component.urlPath;
    }
    if (this._urlPath !== undefined && this._urlPath !== null) {
      return this._urlPath;
    }
    return '';
  }

  get urlParams(): string[] {
    if (this.component !== undefined && this.component !== null) {
      return this.component.urlParams;
    }
    if (this._urlParams !== undefined && this._urlParams !== null) {
      return this._urlParams;
    }
    return [];
  }

  resolveComponent(): Promise<ComponentInstruction> {
    if (this.component !== undefined && this.component !== null) {
      return Promise.resolve(this.component);
    }
    return this._resolver().then((instruction: Instruction) => {
      this.child = instruction !== undefined && instruction !== null ? instruction.child : null;
      return this.component =
                 instruction !== undefined && instruction !== null ? instruction.component : null;
    });
  }
}


export class RedirectInstruction extends ResolvedInstruction {
  constructor(
      component: ComponentInstruction, child: Instruction,
      auxInstruction: {[key: string]: Instruction}, private _specificity: string) {
    super(component, child, auxInstruction);
  }

  get specificity(): string { return this._specificity; }
}


/**
 * A `ComponentInstruction` represents the route state for a single component.
 *
 * `ComponentInstructions` is a public API. Instances of `ComponentInstruction` are passed
 * to route lifecycle hooks, like {@link CanActivate}.
 *
 * `ComponentInstruction`s are [hash consed](https://en.wikipedia.org/wiki/Hash_consing). You should
 * never construct one yourself with "new." Instead, rely on router's internal recognizer to
 * construct `ComponentInstruction`s.
 *
 * You should not modify this object. It should be treated as immutable.
 */
export class ComponentInstruction {
  reuse: boolean = false;
  public routeData: RouteData;

  /**
   * @internal
   */
  constructor(
      public urlPath: string, public urlParams: string[], data: RouteData,
      public componentType: any /** TODO #9100 */, public terminal: boolean,
      public specificity: string, public params: {[key: string]: string} = null,
      public routeName: string) {
    this.routeData = data !== undefined && data !== null ? data : BLANK_ROUTE_DATA;
  }
}
