/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import {DomAdapter} from '../dom/dom_adapter';
import {StringMapWrapper} from '../facade/collection';
import {Type} from '../facade/lang';



/**
 * Provides DOM operations in any browser environment.
 */
export abstract class GenericBrowserDomAdapter extends DomAdapter {
  private _animationPrefix: string = null;
  private _transitionEnd: string = null;
  constructor() {
    super();
    try {
      var element = this.createElement('div', this.defaultDoc());
      const obj = this.getStyle(element, 'animationName');
      if (obj !== undefined && obj !== null) {
        this._animationPrefix = '';
      } else {
        var domPrefixes = ['Webkit', 'Moz', 'O', 'ms'];
        for (var i = 0; i < domPrefixes.length; i++) {
          const obj = this.getStyle(element, domPrefixes[i] + 'AnimationName');
          if (obj !== undefined && obj !== null) {
            this._animationPrefix = '-' + domPrefixes[i].toLowerCase() + '-';
            break;
          }
        }
      }
      var transEndEventNames: {[key: string]: string} = {
        WebkitTransition: 'webkitTransitionEnd',
        MozTransition: 'transitionend',
        OTransition: 'oTransitionEnd otransitionend',
        transition: 'transitionend'
      };
      StringMapWrapper.forEach(transEndEventNames, (value: string, key: string) => {
        const obj = this.getStyle(element, key);
        if (obj !== undefined && obj !== null) {
          this._transitionEnd = value;
        }
      });
    } catch (e) {
      this._animationPrefix = null;
      this._transitionEnd = null;
    }
  }

  getDistributedNodes(el: HTMLElement): Node[] { return (<any>el).getDistributedNodes(); }
  resolveAndSetHref(el: HTMLAnchorElement, baseUrl: string, href: string) {
    el.href = href == null ? baseUrl : baseUrl + '/../' + href;
  }
  supportsDOMEvents(): boolean { return true; }
  supportsNativeShadowDOM(): boolean {
    return typeof(<any>this.defaultDoc().body).createShadowRoot === 'function';
  }
  getAnimationPrefix(): string {
    return this._animationPrefix !== undefined && this._animationPrefix !== null ?
        this._animationPrefix :
        '';
  }
  getTransitionEnd(): string {
    return this._transitionEnd !== undefined && this._transitionEnd !== null ? this._transitionEnd :
                                                                               '';
  }
  supportsAnimation(): boolean {
    return this._animationPrefix !== undefined && this._animationPrefix !== null &&
        this._transitionEnd !== undefined && this._transitionEnd !== null;
  }
}
