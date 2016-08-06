/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import {Pipe, PipeTransform} from '@angular/core';
import {StringWrapper, isBlank, isFunction, isNumber, isString} from '../facade/lang';
import {InvalidPipeArgumentException} from './invalid_pipe_argument_exception';

/**
 * Creates a new String with some or all of the matches of a pattern replaced by
 * a replacement.
 *
 * The pattern to be matched is specified by the 'pattern' parameter.
 *
 * The replacement to be set is specified by the 'replacement' parameter.
 *
 * An optional 'flags' parameter can be set.
 *
 * ### Usage
 *
 *     expression | replace:pattern:replacement
 *
 * All behavior is based on the expected behavior of the JavaScript API
 * String.prototype.replace() function.
 *
 * Where the input expression is a [String] or [Number] (to be treated as a string),
 * the `pattern` is a [String] or [RegExp],
 * the 'replacement' is a [String] or [Function].
 *
 * --Note--: The 'pattern' parameter will be converted to a RegExp instance. Make sure to escape the
 * string properly if you are matching for regular expression special characters like parenthesis,
 * brackets etc.
 *
 * @deprecated The current pipe has limited functionality. The pipe api is not meant to be able
 * express complex yet generic value transformations. We recommend that these transformations happen
 * in the component logic instead.
 */

@Pipe({name: 'replace'})
export class ReplacePipe implements PipeTransform {
  transform(value: any, pattern: string|RegExp, replacement: Function|string): any {
    if (value === undefined || value === null) {
      return value;
    }

    if (!this._supportedInput(value)) {
      throw new InvalidPipeArgumentException(ReplacePipe, value);
    }

    var input = value.toString();

    if (!this._supportedPattern(pattern)) {
      throw new InvalidPipeArgumentException(ReplacePipe, pattern);
    }
    if (!this._supportedReplacement(replacement)) {
      throw new InvalidPipeArgumentException(ReplacePipe, replacement);
    }

    if (typeof replacement === 'function') {
      const rgxPattern = typeof pattern === 'string' ? new RegExp(pattern, 'g') : pattern;

      return StringWrapper.replaceAllMapped(
          input, rgxPattern, <(m: string[]) => string>replacement);
    }

    if (pattern instanceof RegExp) {
      // use the replaceAll variant
      return StringWrapper.replaceAll(input, pattern, <string>replacement);
    }

    return StringWrapper.replace(input, <string>pattern, <string>replacement);
  }

  private _supportedInput(input: any): boolean {
    return typeof input === 'string' || typeof input === 'number';
  }

  private _supportedPattern(pattern: any): boolean {
    return typeof pattern === 'string' || pattern instanceof RegExp;
  }

  private _supportedReplacement(replacement: any): boolean {
    return typeof replacement === 'string' || typeof replacement === 'function';
  }
}
