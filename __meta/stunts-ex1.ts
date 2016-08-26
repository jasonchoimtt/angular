import * as ts from 'typescript';
import {SyntaxKind, Matcher, Matchers, Select, Helper, Utils, symbol} from 'stunts';
import {isPresent} from '@angular/facade/src/lang';
import {arrayFromMap} from '@angular/facade/src/collection';

import {Component as ComponentOld, provide} from '@angular/core';
import {Component} from '@angular/component';

class Inline_isPresent_Object extends SimpleTransform {
  @Matcher.Expression() match(@Match.Complex() i: Object) { isPresent(i); }

  @Template() substitute$1(i) { i; }

  @Template() substitute$2(i) { !!i; }

  substitute = [this.substitute$1, this.substitute$2];
}

class Inline_isPresent_any extends SimpleTransform {
  @Matcher.Expression()
  match(i: any) { isPresent(i); }

  @Template()
  substitute(i) { i !== null && i !== undefined; }
}

class Inline_isPresent_complex_if extends SimpleTransform {
  @Matcher()
  match(@Match.Complex() i: any) {
    if ((isPresent(i))) {
      Matchers.Statements();
    }
  }

  @Template()
  substitute(i) {
    const val = i;
    if (val !== null && val !== undefined) {
      Matchers.Statements();
    }
  }
}

export const Inline_isPresent = transformGroup('Inline isPresent()', [
  Inline_isPresent_Object,
  Inline_isPresent_any,
  Inline_isPresent_complex_if,
]);

export class Inline_provide_ {
  @Matcher.Expression()
  match(token: any, provider: any) {
    provide(token, provider);
  }

  @Template()
  substitute(token) {
    Object.assign({provide: sth}, provider);
  }
}

export const Inline_provide = transformGroup('Inline provide()', [
  Inline_provide_,
  Fixups.simplifyObjectAssign,
]);

class Inline_provide_v2_ implements Transform {
  @Matcher.Expression()
  matcher(token: any, provider: any) {
    provide(token, provider);
  }

  @Template()
  template(token, provider) {
    Object.assign({provide: sth}, provider);
  }

  apply(sf: ts.SourceFile) {
    return Utils.mapMatched(sf, this.matcher, (matched) => {
      let node = template.expand(matched);
      node = Fixups.simplifyObjectAssign(node);
      return node;
    });
  }
}

export const Inline_provide_v2 = transformGroup('Inline provide() v2', [
  Inline_provide_v2_
]);

class Copy_arrayFromMap implements Transform {
  @Matcher.Expression()
  matcher(@Match.Complex() i: any) {
    arrayFromMap(i);
  }

  apply(sf: sf.SourceFile) {
    return.mapMatched(sf, this.matcher, (matched) => {
      Utils.attachMetadata(matched.root, Helper.REQUIRE_HELPER, {symbol: symbol(arrayFromMap)});
      return matched.root;
    });
  }
}

export const Copy_arrayFromMap = transformGroup('Copy arrayFromMap()', [
  Copy_arrayFromMap_,
  Helper.emitHelper,
]);
