/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import {Injector} from '../di';
import {StringMapWrapper} from '../facade/collection';
import {isBlank, isPresent} from '../facade/lang';
import {RenderDebugInfo} from '../render/api';

import {DebugAppView} from './view';
import {ViewType} from './view_type';


export class StaticNodeDebugInfo {
  constructor(
      public providerTokens: any[], public componentToken: any,
      public refTokens: {[key: string]: any}) {}
}

export class DebugContext implements RenderDebugInfo {
  constructor(
      private _view: DebugAppView<any>, private _nodeIndex: number, private _tplRow: number,
      private _tplCol: number) {}

  private get _staticNodeInfo(): StaticNodeDebugInfo {
    return this._nodeIndex !== undefined && this._nodeIndex !== null ?
        this._view.staticNodeDebugInfos[this._nodeIndex] :
        null;
  }

  get context() { return this._view.context; }
  get component() {
    var staticNodeInfo = this._staticNodeInfo;
    if (staticNodeInfo !== undefined && staticNodeInfo !== null &&
        staticNodeInfo.componentToken !== undefined && staticNodeInfo.componentToken !== null) {
      return this.injector.get(staticNodeInfo.componentToken);
    }
    return null;
  }
  get componentRenderElement() {
    var componentView = this._view;
    while (componentView.declarationAppElement !== undefined &&
           componentView.declarationAppElement !== null &&
           componentView.type !== ViewType.COMPONENT) {
      componentView = <DebugAppView<any>>componentView.declarationAppElement.parentView;
    }
    return componentView.declarationAppElement !== undefined &&
            componentView.declarationAppElement !== null ?
        componentView.declarationAppElement.nativeElement :
        null;
  }
  get injector(): Injector { return this._view.injector(this._nodeIndex); }
  get renderNode(): any {
    if (this._nodeIndex !== undefined && this._nodeIndex !== null && this._view.allNodes) {
      return this._view.allNodes[this._nodeIndex];
    } else {
      return null;
    }
  }
  get providerTokens(): any[] {
    var staticNodeInfo = this._staticNodeInfo;
    return staticNodeInfo !== undefined && staticNodeInfo !== null ? staticNodeInfo.providerTokens :
                                                                     null;
  }
  get source(): string {
    return `${this._view.componentType.templateUrl}:${this._tplRow}:${this._tplCol}`;
  }
  get references(): {[key: string]: any} {
    var varValues: {[key: string]: string} = {};
    var staticNodeInfo = this._staticNodeInfo;
    if (staticNodeInfo !== undefined && staticNodeInfo !== null) {
      var refs = staticNodeInfo.refTokens;
      StringMapWrapper.forEach(refs, (refToken: any, refName: string) => {
        let varValue: any;
        if (refToken === undefined || refToken === null) {
          varValue = this._view.allNodes ? this._view.allNodes[this._nodeIndex] : null;
        } else {
          varValue = this._view.injectorGet(refToken, this._nodeIndex, null);
        }
        varValues[refName] = varValue;
      });
    }
    return varValues;
  }
}
