/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

// ATTENTION: This file will be overwritten with generated code by main()
import {JavaScriptEmitter} from '@angular/compiler/src/output/js_emitter';
import {BaseException} from '@angular/core';

import {print} from '@angular/facade/src/lang';
import {assetUrl} from '@angular/compiler/src/util';

import {SimpleJsImportGenerator, codegenExportsVars, codegenStmts} from './output_emitter_util';

// Generator
export function emit() {
  var emitter = new JavaScriptEmitter(new SimpleJsImportGenerator());
  var emittedCode = emitter.emitStatements(
      assetUrl('compiler', 'output/output_emitter_codegen_untyped', 'test'), codegenStmts,
      codegenExportsVars);
  return emittedCode;
}

export function main(args: string[]) {
  var emittedCode = emit();
  // debug: console.error(emittedCode);
  print(emittedCode);
}
