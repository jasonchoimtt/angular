/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import {Injectable} from './di/decorators';

@Injectable()
export class Console {
  log(message: string): void {
    console.log(message);
    ;
  }
  // Note: for reporting errors use `DOM.logError()` as it is platform specific
  warn(message: string): void {
    console.warn(message);
    ;
  }
}
