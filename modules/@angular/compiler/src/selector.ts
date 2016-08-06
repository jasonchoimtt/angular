/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import {ListWrapper} from './facade/collection';
import {BaseException} from './facade/exceptions';
import {StringWrapper, isBlank, isPresent} from './facade/lang';

const _EMPTY_ATTR_VALUE = '';

const _SELECTOR_REGEXP = new RegExp(
    '(\\:not\\()|' +                              //":not("
        '([-\\w]+)|' +                            // "tag"
        '(?:\\.([-\\w]+))|' +                     // ".class"
        '(?:\\[([-\\w*]+)(?:=([^\\]]*))?\\])|' +  // "[name]", "[name=value]" or "[name*=value]"
        '(\\))|' +                                // ")"
        '(\\s*,\\s*)',                            // ","
    'g');

/**
 * A css selector contains an element name,
 * css classes and attribute/value pairs with the purpose
 * of selecting subsets out of them.
 */
export class CssSelector {
  element: string = null;
  classNames: string[] = [];
  attrs: string[] = [];
  notSelectors: CssSelector[] = [];

  static parse(selector: string): CssSelector[] {
    var results: CssSelector[] = [];
    var _addResult = (res: CssSelector[], cssSel: CssSelector) => {
      if (cssSel.notSelectors.length > 0 &&
          (cssSel.element === undefined || cssSel.element === null) &&
          ListWrapper.isEmpty(cssSel.classNames) && ListWrapper.isEmpty(cssSel.attrs)) {
        cssSel.element = '*';
      }
      res.push(cssSel);
    };
    var cssSelector = new CssSelector();
    var match: string[];
    var current = cssSelector;
    var inNot = false;
    _SELECTOR_REGEXP.lastIndex = 0;
    while ((match = _SELECTOR_REGEXP.exec(selector)) !== null) {
      if (match[1] !== undefined && match[1] !== null) {
        if (inNot) {
          throw new BaseException('Nesting :not is not allowed in a selector');
        }
        inNot = true;
        current = new CssSelector();
        cssSelector.notSelectors.push(current);
      }
      if (match[2] !== undefined && match[2] !== null) {
        current.setElement(match[2]);
      }
      if (match[3] !== undefined && match[3] !== null) {
        current.addClassName(match[3]);
      }
      if (match[4] !== undefined && match[4] !== null) {
        current.addAttribute(match[4], match[5]);
      }
      if (match[6] !== undefined && match[6] !== null) {
        inNot = false;
        current = cssSelector;
      }
      if (match[7] !== undefined && match[7] !== null) {
        if (inNot) {
          throw new BaseException('Multiple selectors in :not are not supported');
        }
        _addResult(results, cssSelector);
        cssSelector = current = new CssSelector();
      }
    }
    _addResult(results, cssSelector);
    return results;
  }

  isElementSelector(): boolean {
    return this.element !== undefined && this.element !== null &&
        ListWrapper.isEmpty(this.classNames) && ListWrapper.isEmpty(this.attrs) &&
        this.notSelectors.length === 0;
  }

  setElement(element: string = null) { this.element = element; }

  /** Gets a template string for an element that matches the selector. */
  getMatchingElementTemplate(): string {
    let tagName = this.element !== undefined && this.element !== null ? this.element : 'div';
    let classAttr = this.classNames.length > 0 ? ` class="${this.classNames.join(' ')}"` : '';

    let attrs = '';
    for (let i = 0; i < this.attrs.length; i += 2) {
      let attrName = this.attrs[i];
      let attrValue = this.attrs[i + 1] !== '' ? `="${this.attrs[i + 1]}"` : '';
      attrs += ` ${attrName}${attrValue}`;
    }

    return `<${tagName}${classAttr}${attrs}></${tagName}>`;
  }

  addAttribute(name: string, value: string = _EMPTY_ATTR_VALUE) {
    this.attrs.push(name);
    if (value !== undefined && value !== null) {
      value = value.toLowerCase();
    } else {
      value = _EMPTY_ATTR_VALUE;
    }
    this.attrs.push(value);
  }

  addClassName(name: string) { this.classNames.push(name.toLowerCase()); }

  toString(): string {
    var res = '';
    if (this.element !== undefined && this.element !== null) {
      res += this.element;
    }
    if (this.classNames !== undefined && this.classNames !== null) {
      for (var i = 0; i < this.classNames.length; i++) {
        res += '.' + this.classNames[i];
      }
    }
    if (this.attrs !== undefined && this.attrs !== null) {
      for (var i = 0; i < this.attrs.length;) {
        var attrName = this.attrs[i++];
        var attrValue = this.attrs[i++];
        res += '[' + attrName;
        if (attrValue.length > 0) {
          res += '=' + attrValue;
        }
        res += ']';
      }
    }
    this.notSelectors.forEach(notSelector => res += `:not(${notSelector})`);
    return res;
  }
}

/**
 * Reads a list of CssSelectors and allows to calculate which ones
 * are contained in a given CssSelector.
 */
export class SelectorMatcher {
  static createNotMatcher(notSelectors: CssSelector[]): SelectorMatcher {
    var notMatcher = new SelectorMatcher();
    notMatcher.addSelectables(notSelectors, null);
    return notMatcher;
  }

  private _elementMap = new Map<string, SelectorContext[]>();
  private _elementPartialMap = new Map<string, SelectorMatcher>();
  private _classMap = new Map<string, SelectorContext[]>();
  private _classPartialMap = new Map<string, SelectorMatcher>();
  private _attrValueMap = new Map<string, Map<string, SelectorContext[]>>();
  private _attrValuePartialMap = new Map<string, Map<string, SelectorMatcher>>();
  private _listContexts: SelectorListContext[] = [];

  addSelectables(cssSelectors: CssSelector[], callbackCtxt?: any) {
    var listContext: SelectorListContext = null;
    if (cssSelectors.length > 1) {
      listContext = new SelectorListContext(cssSelectors);
      this._listContexts.push(listContext);
    }
    for (var i = 0; i < cssSelectors.length; i++) {
      this._addSelectable(cssSelectors[i], callbackCtxt, listContext);
    }
  }

  /**
   * Add an object that can be found later on by calling `match`.
   * @param cssSelector A css selector
   * @param callbackCtxt An opaque object that will be given to the callback of the `match` function
   */
  private _addSelectable(
      cssSelector: CssSelector, callbackCtxt: any, listContext: SelectorListContext) {
    var matcher: SelectorMatcher = this;
    var element = cssSelector.element;
    var classNames = cssSelector.classNames;
    var attrs = cssSelector.attrs;
    var selectable = new SelectorContext(cssSelector, callbackCtxt, listContext);

    if (element !== undefined && element !== null) {
      var isTerminal = attrs.length === 0 && classNames.length === 0;
      if (isTerminal) {
        this._addTerminal(matcher._elementMap, element, selectable);
      } else {
        matcher = this._addPartial(matcher._elementPartialMap, element);
      }
    }

    if (classNames !== undefined && classNames !== null) {
      for (var index = 0; index < classNames.length; index++) {
        var isTerminal = attrs.length === 0 && index === classNames.length - 1;
        var className = classNames[index];
        if (isTerminal) {
          this._addTerminal(matcher._classMap, className, selectable);
        } else {
          matcher = this._addPartial(matcher._classPartialMap, className);
        }
      }
    }

    if (attrs !== undefined && attrs !== null) {
      for (var index = 0; index < attrs.length;) {
        var isTerminal = index === attrs.length - 2;
        var attrName = attrs[index++];
        var attrValue = attrs[index++];
        if (isTerminal) {
          var terminalMap = matcher._attrValueMap;
          var terminalValuesMap = terminalMap.get(attrName);
          if (terminalValuesMap === undefined || terminalValuesMap === null) {
            terminalValuesMap = new Map<string, SelectorContext[]>();
            terminalMap.set(attrName, terminalValuesMap);
          }
          this._addTerminal(terminalValuesMap, attrValue, selectable);
        } else {
          var parttialMap = matcher._attrValuePartialMap;
          var partialValuesMap = parttialMap.get(attrName);
          if (partialValuesMap === undefined || partialValuesMap === null) {
            partialValuesMap = new Map<string, SelectorMatcher>();
            parttialMap.set(attrName, partialValuesMap);
          }
          matcher = this._addPartial(partialValuesMap, attrValue);
        }
      }
    }
  }

  private _addTerminal(
      map: Map<string, SelectorContext[]>, name: string, selectable: SelectorContext) {
    var terminalList = map.get(name);
    if (terminalList === undefined || terminalList === null) {
      terminalList = [];
      map.set(name, terminalList);
    }
    terminalList.push(selectable);
  }

  private _addPartial(map: Map<string, SelectorMatcher>, name: string): SelectorMatcher {
    var matcher = map.get(name);
    if (matcher === undefined || matcher === null) {
      matcher = new SelectorMatcher();
      map.set(name, matcher);
    }
    return matcher;
  }

  /**
   * Find the objects that have been added via `addSelectable`
   * whose css selector is contained in the given css selector.
   * @param cssSelector A css selector
   * @param matchedCallback This callback will be called with the object handed into `addSelectable`
   * @return boolean true if a match was found
  */
  match(cssSelector: CssSelector, matchedCallback: (c: CssSelector, a: any) => void): boolean {
    var result = false;
    var element = cssSelector.element;
    var classNames = cssSelector.classNames;
    var attrs = cssSelector.attrs;

    for (var i = 0; i < this._listContexts.length; i++) {
      this._listContexts[i].alreadyMatched = false;
    }

    result = this._matchTerminal(this._elementMap, element, cssSelector, matchedCallback) || result;
    result = this._matchPartial(this._elementPartialMap, element, cssSelector, matchedCallback) ||
        result;

    if (classNames !== undefined && classNames !== null) {
      for (var index = 0; index < classNames.length; index++) {
        var className = classNames[index];
        result =
            this._matchTerminal(this._classMap, className, cssSelector, matchedCallback) || result;
        result =
            this._matchPartial(this._classPartialMap, className, cssSelector, matchedCallback) ||
            result;
      }
    }

    if (attrs !== undefined && attrs !== null) {
      for (var index = 0; index < attrs.length;) {
        var attrName = attrs[index++];
        var attrValue = attrs[index++];

        var terminalValuesMap = this._attrValueMap.get(attrName);
        if (!StringWrapper.equals(attrValue, _EMPTY_ATTR_VALUE)) {
          result = this._matchTerminal(
                       terminalValuesMap, _EMPTY_ATTR_VALUE, cssSelector, matchedCallback) ||
              result;
        }
        result = this._matchTerminal(terminalValuesMap, attrValue, cssSelector, matchedCallback) ||
            result;

        var partialValuesMap = this._attrValuePartialMap.get(attrName);
        if (!StringWrapper.equals(attrValue, _EMPTY_ATTR_VALUE)) {
          result = this._matchPartial(
                       partialValuesMap, _EMPTY_ATTR_VALUE, cssSelector, matchedCallback) ||
              result;
        }
        result =
            this._matchPartial(partialValuesMap, attrValue, cssSelector, matchedCallback) || result;
      }
    }
    return result;
  }

  /** @internal */
  _matchTerminal(
      map: Map<string, SelectorContext[]>, name: string, cssSelector: CssSelector,
      matchedCallback: (c: CssSelector, a: any) => void): boolean {
    if (map === undefined || map === null || name === undefined || name === null) {
      return false;
    }

    var selectables = map.get(name);
    var starSelectables = map.get('*');
    if (starSelectables !== undefined && starSelectables !== null) {
      selectables = selectables.concat(starSelectables);
    }
    if (selectables === undefined || selectables === null) {
      return false;
    }
    var selectable: SelectorContext;
    var result = false;
    for (var index = 0; index < selectables.length; index++) {
      selectable = selectables[index];
      result = selectable.finalize(cssSelector, matchedCallback) || result;
    }
    return result;
  }

  /** @internal */
  _matchPartial(
      map: Map<string, SelectorMatcher>, name: string, cssSelector: CssSelector,
      matchedCallback: (c: CssSelector, a: any) => void): boolean {
    if (map === undefined || map === null || name === undefined || name === null) {
      return false;
    }
    var nestedSelector = map.get(name);
    if (nestedSelector === undefined || nestedSelector === null) {
      return false;
    }
    // TODO(perf): get rid of recursion and measure again
    // TODO(perf): don't pass the whole selector into the recursion,
    // but only the not processed parts
    return nestedSelector.match(cssSelector, matchedCallback);
  }
}


export class SelectorListContext {
  alreadyMatched: boolean = false;

  constructor(public selectors: CssSelector[]) {}
}

// Store context to pass back selector and context when a selector is matched
export class SelectorContext {
  notSelectors: CssSelector[];

  constructor(
      public selector: CssSelector, public cbContext: any,
      public listContext: SelectorListContext) {
    this.notSelectors = selector.notSelectors;
  }

  finalize(cssSelector: CssSelector, callback: (c: CssSelector, a: any) => void): boolean {
    var result = true;
    if (this.notSelectors.length > 0 &&
        (this.listContext === undefined || this.listContext === null ||
         !this.listContext.alreadyMatched)) {
      var notMatcher = SelectorMatcher.createNotMatcher(this.notSelectors);
      result = !notMatcher.match(cssSelector, null);
    }
    if (result && callback !== undefined && callback !== null &&
        (this.listContext === undefined || this.listContext === null ||
         !this.listContext.alreadyMatched)) {
      if (this.listContext !== undefined && this.listContext !== null) {
        this.listContext.alreadyMatched = true;
      }
      callback(this.selector, this.cbContext);
    }
    return result;
  }
}
