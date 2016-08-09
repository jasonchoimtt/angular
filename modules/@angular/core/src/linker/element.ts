/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import {Injector} from '../di/injector';
import {ListWrapper} from '../facade/collection';
import {BaseException} from '../facade/exceptions';

import {ElementRef} from './element_ref';
import {QueryList} from './query_list';
import {AppView} from './view';
import {ViewContainerRef_} from './view_container_ref';
import {ViewType} from './view_type';


/**
 * An AppElement is created for elements that have a ViewContainerRef,
 * a nested component or a <template> element to keep data around
 * that is needed for later instantiations.
 */
export class AppElement {
  public nestedViews: AppView<any>[] = null;
  public componentView: AppView<any> = null;

  public component: any;
  public componentConstructorViewQueries: QueryList<any>[];

  constructor(
      public index: number, public parentIndex: number, public parentView: AppView<any>,
      public nativeElement: any) {}

  get elementRef(): ElementRef { return new ElementRef(this.nativeElement); }

  get vcRef(): ViewContainerRef_ { return new ViewContainerRef_(this); }

  initComponent(
      component: any, componentConstructorViewQueries: QueryList<any>[], view: AppView<any>) {
    this.component = component;
    this.componentConstructorViewQueries = componentConstructorViewQueries;
    this.componentView = view;
  }

  get parentInjector(): Injector { return this.parentView.injector(this.parentIndex); }
  get injector(): Injector { return this.parentView.injector(this.index); }

  mapNestedViews(nestedViewClass: any, callback: Function): any[] {
    var result: any[] /** TODO #9100 */ = [];
    if (this.nestedViews) {
      this.nestedViews.forEach((nestedView) => {
        if (nestedView.clazz === nestedViewClass) {
          result.push(callback(nestedView));
        }
      });
    }
    return result;
  }

  moveView(view: AppView<any>, currentIndex: number) {
    var previousIndex = this.nestedViews.indexOf(view);
    if (view.type === ViewType.COMPONENT) {
      throw new BaseException(`Component views can't be moved!`);
    }
    var nestedViews = this.nestedViews;
    if (nestedViews == null) {
      nestedViews = [];
      this.nestedViews = nestedViews;
    }
    ListWrapper.removeAt(nestedViews, previousIndex);
    ListWrapper.insert(nestedViews, currentIndex, view);
    var refRenderNode: any /** TODO #9100 */;
    if (currentIndex > 0) {
      var prevView = nestedViews[currentIndex - 1];
      refRenderNode = prevView.lastRootNode;
    } else {
      refRenderNode = this.nativeElement;
    }
    if (refRenderNode !== undefined && refRenderNode !== null) {
      view.renderer.attachViewAfter(refRenderNode, view.flatRootNodes);
    }
    view.markContentChildAsMoved(this);
  }

  attachView(view: AppView<any>, viewIndex: number) {
    if (view.type === ViewType.COMPONENT) {
      throw new BaseException(`Component views can't be moved!`);
    }
    var nestedViews = this.nestedViews;
    if (nestedViews == null) {
      nestedViews = [];
      this.nestedViews = nestedViews;
    }
    ListWrapper.insert(nestedViews, viewIndex, view);
    var refRenderNode: any /** TODO #9100 */;
    if (viewIndex > 0) {
      var prevView = nestedViews[viewIndex - 1];
      refRenderNode = prevView.lastRootNode;
    } else {
      refRenderNode = this.nativeElement;
    }
    if (refRenderNode !== undefined && refRenderNode !== null) {
      view.renderer.attachViewAfter(refRenderNode, view.flatRootNodes);
    }
    view.addToContentChildren(this);
  }

  detachView(viewIndex: number): AppView<any> {
    var view = ListWrapper.removeAt(this.nestedViews, viewIndex);
    if (view.type === ViewType.COMPONENT) {
      throw new BaseException(`Component views can't be moved!`);
    }
    view.detach();

    view.removeFromContentChildren(this);
    return view;
  }
}
