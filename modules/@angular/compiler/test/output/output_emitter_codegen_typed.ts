/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

// ATTENTION: This file will be overwritten with generated code by main()
import * as o from '@angular/compiler/src/output/output_ast';
import {TypeScriptEmitter} from '@angular/compiler/src/output/ts_emitter';
import {BaseException} from '@angular/core';

import {print} from '@angular/facade/src/lang';
import {assetUrl} from '@angular/compiler/src/util';

function unimplemented(): any {
  throw new BaseException('unimplemented');
}

import {SimpleJsImportGenerator, codegenExportsVars, codegenStmts} from './output_emitter_util';

export function getExpressions(): any {
  return unimplemented();
}

// Generator
export function emit() {
  const emitter = new TypeScriptEmitter(new SimpleJsImportGenerator());
  const emittedCode = emitter.emitStatements(
      assetUrl('compiler', 'output/output_emitter_codegen_typed', 'test'), codegenStmts,
      codegenExportsVars);
  return emittedCode;
}

export function main(args: string[]) {
  const emittedCode = emit();
  print(emittedCode);
}
