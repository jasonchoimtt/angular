/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import {Directive, Self} from '@angular/core';

import {NgControl} from './ng_control';


/**
 * Directive automatically applied to Angular forms that sets CSS classes
 * based on control status (valid/invalid/dirty/etc).
 *
 * @experimental
 */
@Directive({
  selector: '[formControlName],[ngModel],[formControl]',
  host: {
    '[class.ng-untouched]': 'ngClassUntouched',
    '[class.ng-touched]': 'ngClassTouched',
    '[class.ng-pristine]': 'ngClassPristine',
    '[class.ng-dirty]': 'ngClassDirty',
    '[class.ng-valid]': 'ngClassValid',
    '[class.ng-invalid]': 'ngClassInvalid'
  }
})
export class NgControlStatus {
  private _cd: NgControl;

  constructor(@Self() cd: NgControl) { this._cd = cd; }

  get ngClassUntouched(): boolean { return this._cd.control ? this._cd.control.untouched : false; }
  get ngClassTouched(): boolean { return this._cd.control ? this._cd.control.touched : false; }
  get ngClassPristine(): boolean { return this._cd.control ? this._cd.control.pristine : false; }
  get ngClassDirty(): boolean { return this._cd.control ? this._cd.control.dirty : false; }
  get ngClassValid(): boolean { return this._cd.control ? this._cd.control.valid : false; }
  get ngClassInvalid(): boolean { return this._cd.control ? !this._cd.control.valid : false; }
}
