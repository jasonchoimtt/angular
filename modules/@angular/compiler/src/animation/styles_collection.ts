/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import {ListWrapper} from '../facade/collection';
import {isBlank, isPresent} from '../facade/lang';

export class StylesCollectionEntry {
  constructor(public time: number, public value: string|number) {}

  matches(time: number, value: string|number): boolean {
    return time == this.time && value == this.value;
  }
}

export class StylesCollection {
  styles: {[key: string]: StylesCollectionEntry[]} = {};

  insertAtTime(property: string, time: number, value: string|number) {
    var tuple = new StylesCollectionEntry(time, value);
    var entries = this.styles[property];
    if (entries === undefined || entries === null) {
      entries = this.styles[property] = [];
    }

    // insert this at the right stop in the array
    // this way we can keep it sorted
    var insertionIndex = 0;
    for (var i = entries.length - 1; i >= 0; i--) {
      if (entries[i].time <= time) {
        insertionIndex = i + 1;
        break;
      }
    }

    ListWrapper.insert(entries, insertionIndex, tuple);
  }

  getByIndex(property: string, index: number): StylesCollectionEntry {
    var items = this.styles[property];
    if (items !== undefined && items !== null) {
      return index >= items.length ? null : items[index];
    }
    return null;
  }

  indexOfAtOrBeforeTime(property: string, time: number): number {
    var entries = this.styles[property];
    if (entries !== undefined && entries !== null) {
      for (var i = entries.length - 1; i >= 0; i--) {
        if (entries[i].time <= time) return i;
      }
    }
    return null;
  }
}
