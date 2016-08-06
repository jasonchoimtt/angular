/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import {ListWrapper, StringMapWrapper} from '../../facade/collection';
import {BaseException} from '../../facade/exceptions';
import {hasConstructor, isBlank, isPresent, looseIdentical} from '../../facade/lang';
import {Control, ControlGroup} from '../model';
import {Validators} from '../validators';

import {AbstractControlDirective} from './abstract_control_directive';
import {CheckboxControlValueAccessor} from './checkbox_value_accessor';
import {ControlContainer} from './control_container';
import {ControlValueAccessor} from './control_value_accessor';
import {DefaultValueAccessor} from './default_value_accessor';
import {NgControl} from './ng_control';
import {NgControlGroup} from './ng_control_group';
import {normalizeAsyncValidator, normalizeValidator} from './normalize_validator';
import {NumberValueAccessor} from './number_value_accessor';
import {RadioControlValueAccessor} from './radio_control_value_accessor';
import {SelectControlValueAccessor} from './select_control_value_accessor';
import {SelectMultipleControlValueAccessor} from './select_multiple_control_value_accessor';
import {AsyncValidatorFn, ValidatorFn} from './validators';


export function controlPath(name: string, parent: ControlContainer): string[] {
  var p = ListWrapper.clone(parent.path);
  p.push(name);
  return p;
}

export function setUpControl(control: Control, dir: NgControl): void {
  if (control === undefined || control === null) _throwError(dir, 'Cannot find control with');
  if (dir.valueAccessor === undefined || dir.valueAccessor === null)
    _throwError(dir, 'No value accessor for form control with');

  control.validator = Validators.compose([control.validator, dir.validator]);
  control.asyncValidator = Validators.composeAsync([control.asyncValidator, dir.asyncValidator]);
  dir.valueAccessor.writeValue(control.value);

  // view -> model
  dir.valueAccessor.registerOnChange((newValue: any) => {
    dir.viewToModelUpdate(newValue);
    control.updateValue(newValue, {emitModelToViewChange: false});
    control.markAsDirty();
  });

  // model -> view
  control.registerOnChange((newValue: any) => dir.valueAccessor.writeValue(newValue));

  // touched
  dir.valueAccessor.registerOnTouched(() => control.markAsTouched());
}

export function setUpControlGroup(control: ControlGroup, dir: NgControlGroup) {
  if (control === undefined || control === null) _throwError(dir, 'Cannot find control with');
  control.validator = Validators.compose([control.validator, dir.validator]);
  control.asyncValidator = Validators.composeAsync([control.asyncValidator, dir.asyncValidator]);
}

function _throwError(dir: AbstractControlDirective, message: string): void {
  let messageEnd: string;
  if (dir.path.length > 1) {
    messageEnd = `path: '${dir.path.join(' -> ')}'`;
  } else if (dir.path[0]) {
    messageEnd = `name: '${dir.path}'`;
  } else {
    messageEnd = 'unspecified name';
  }
  throw new BaseException(`${message} ${messageEnd}`);
}

export function composeValidators(validators: /* Array<Validator|Function> */ any[]): ValidatorFn {
  return validators !== undefined && validators !== null ?
      Validators.compose(validators.map(normalizeValidator)) :
      null;
}

export function composeAsyncValidators(validators: /* Array<Validator|Function> */ any[]):
    AsyncValidatorFn {
  return validators !== undefined && validators !== null ?
      Validators.composeAsync(validators.map(normalizeAsyncValidator)) :
      null;
}

export function isPropertyUpdated(changes: {[key: string]: any}, viewModel: any): boolean {
  if (!StringMapWrapper.contains(changes, 'model')) return false;
  var change = changes['model'];

  if (change.isFirstChange()) return true;
  return !looseIdentical(viewModel, change.currentValue);
}

// TODO: vsavkin remove it once https://github.com/angular/angular/issues/3011 is implemented
export function selectValueAccessor(
    dir: NgControl, valueAccessors: ControlValueAccessor[]): ControlValueAccessor {
  if (valueAccessors === undefined || valueAccessors === null) return null;

  var defaultAccessor: ControlValueAccessor;
  var builtinAccessor: ControlValueAccessor;
  var customAccessor: ControlValueAccessor;
  valueAccessors.forEach((v: ControlValueAccessor) => {
    if (v.constructor === DefaultValueAccessor) {
      defaultAccessor = v;

    } else if (
        v.constructor === CheckboxControlValueAccessor || v.constructor === NumberValueAccessor ||
        v.constructor === SelectControlValueAccessor ||
        v.constructor === SelectMultipleControlValueAccessor ||
        v.constructor === RadioControlValueAccessor) {
      if (builtinAccessor !== undefined && builtinAccessor !== null)
        _throwError(dir, 'More than one built-in value accessor matches form control with');
      builtinAccessor = v;

    } else {
      if (customAccessor !== undefined && customAccessor !== null)
        _throwError(dir, 'More than one custom value accessor matches form control with');
      customAccessor = v;
    }
  });

  if (customAccessor !== undefined && customAccessor !== null) return customAccessor;
  if (builtinAccessor !== undefined && builtinAccessor !== null) return builtinAccessor;
  if (defaultAccessor !== undefined && defaultAccessor !== null) return defaultAccessor;

  _throwError(dir, 'No valid value accessor for form control with');
  return null;
}
