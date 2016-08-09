/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import {OpaqueToken} from '@angular/core';
import {toPromise} from 'rxjs/operator/toPromise';

import {StringMapWrapper} from '../facade/collection';
import {isBlank, isPresent, isPromise, isString} from '../facade/lang';

import {AsyncValidatorFn, ValidatorFn} from './directives/validators';
import {AbstractControl} from './model';


/**
 * Providers for validators to be used for {@link Control}s in a form.
 *
 * Provide this using `multi: true` to add validators.
 *
 * ### Example
 *
 * {@example core/forms/ts/ng_validators/ng_validators.ts region='ng_validators'}
 * @experimental
 */
export const NG_VALIDATORS: OpaqueToken = new OpaqueToken('NgValidators');

/**
 * Providers for asynchronous validators to be used for {@link Control}s
 * in a form.
 *
 * Provide this using `multi: true` to add validators.
 *
 * See {@link NG_VALIDATORS} for more details.
 *
 * @experimental
 */
export const NG_ASYNC_VALIDATORS: OpaqueToken = new OpaqueToken('NgAsyncValidators');

/**
 * Provides a set of validators used by form controls.
 *
 * A validator is a function that processes a {@link Control} or collection of
 * controls and returns a map of errors. A null map means that validation has passed.
 *
 * ### Example
 *
 * ```typescript
 * var loginControl = new Control("", Validators.required)
 * ```
 *
 * @experimental
 */
export class Validators {
  /**
   * Validator that requires controls to have a non-empty value.
   */
  static required(control: AbstractControl): {[key: string]: boolean} {
    return control.value === undefined || control.value === null ||
            (typeof control.value === 'string' && control.value == '') ?
        {'required': true} :
        null;
  }

  /**
   * Validator that requires controls to have a value of a minimum length.
   */
  static minLength(minLength: number): ValidatorFn {
    return (control: AbstractControl): {[key: string]: any} => {
      const obj = Validators.required(control);
      if (obj) return null;
      var v: string = control.value;
      return v.length < minLength ?
          {'minlength': {'requiredLength': minLength, 'actualLength': v.length}} :
          null;
    };
  }

  /**
   * Validator that requires controls to have a value of a maximum length.
   */
  static maxLength(maxLength: number): ValidatorFn {
    return (control: AbstractControl): {[key: string]: any} => {
      const obj = Validators.required(control);
      if (obj) return null;
      var v: string = control.value;
      return v.length > maxLength ?
          {'maxlength': {'requiredLength': maxLength, 'actualLength': v.length}} :
          null;
    };
  }

  /**
   * Validator that requires a control to match a regex to its value.
   */
  static pattern(pattern: string): ValidatorFn {
    return (control: AbstractControl): {[key: string]: any} => {
      const obj = Validators.required(control);
      if (obj) return null;
      let regex = new RegExp(`^${pattern}$`);
      let v: string = control.value;
      return regex.test(v) ? null :
                             {'pattern': {'requiredPattern': `^${pattern}$`, 'actualValue': v}};
    };
  }

  /**
   * No-op validator.
   */
  static nullValidator(c: AbstractControl): {[key: string]: boolean} { return null; }

  /**
   * Compose multiple validators into a single function that returns the union
   * of the individual error maps.
   */
  static compose(validators: ValidatorFn[]): ValidatorFn {
    if (!validators) return null;
    var presentValidators = validators.filter(v => !!v);
    if (presentValidators.length == 0) return null;

    return function(control: AbstractControl) {
      return _mergeErrors(_executeValidators(control, presentValidators));
    };
  }

  static composeAsync(validators: AsyncValidatorFn[]): AsyncValidatorFn {
    if (!validators) return null;
    var presentValidators = validators.filter(v => !!v);
    if (presentValidators.length == 0) return null;

    return function(control: AbstractControl) {
      let promises = _executeAsyncValidators(control, presentValidators).map(_convertToPromise);
      return Promise.all(promises).then(_mergeErrors);
    };
  }
}

function _convertToPromise(obj: any): Promise<any> {
  return obj !== undefined && obj !== null && typeof(<any>obj).then === 'function' ?
      obj :
      toPromise.call(obj);
}

function _executeValidators(control: AbstractControl, validators: ValidatorFn[]): any[] {
  return validators.map(v => v(control));
}

function _executeAsyncValidators(control: AbstractControl, validators: AsyncValidatorFn[]): any[] {
  return validators.map(v => v(control));
}

function _mergeErrors(arrayOfErrors: any[]): {[key: string]: any} {
  var res: {[key: string]: any} =
      arrayOfErrors.reduce((res: {[key: string]: any}, errors: {[key: string]: any}) => {
        return errors ? StringMapWrapper.merge(res, errors) : res;
      }, {});
  return StringMapWrapper.isEmpty(res) ? null : res;
}
