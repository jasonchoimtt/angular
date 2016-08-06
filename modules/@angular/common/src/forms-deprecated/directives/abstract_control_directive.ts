/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import {unimplemented} from '../../facade/exceptions';
import {isPresent} from '../../facade/lang';
import {AbstractControl} from '../model';


/**
 * Base class for control directives.
 *
 * Only used internally in the forms module.
 *
 * @experimental
 */
export abstract class AbstractControlDirective {
  get control(): AbstractControl { return unimplemented(); }

  get value(): any {
    return this.control !== undefined && this.control !== null ? this.control.value : null;
  }

  get valid(): boolean {
    return this.control !== undefined && this.control !== null ? this.control.valid : null;
  }

  get errors(): {[key: string]: any} {
    return this.control !== undefined && this.control !== null ? this.control.errors : null;
  }

  get pristine(): boolean {
    return this.control !== undefined && this.control !== null ? this.control.pristine : null;
  }

  get dirty(): boolean {
    return this.control !== undefined && this.control !== null ? this.control.dirty : null;
  }

  get touched(): boolean {
    return this.control !== undefined && this.control !== null ? this.control.touched : null;
  }

  get untouched(): boolean {
    return this.control !== undefined && this.control !== null ? this.control.untouched : null;
  }

  get path(): string[] { return null; }
}
