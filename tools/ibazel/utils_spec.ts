require('source-map-support').install();

import {difference, isMainWorkspace, looksLikeFullTarget, targetToPath} from './utils';

fdescribe('looksLikeFullTarget', () => {
  it('identifies cwd targets', () => {
    expect(looksLikeFullTarget(':target')).toBe(true);
    expect(looksLikeFullTarget(':a1234')).toBe(true);
    expect(looksLikeFullTarget(':@angular')).toBe(true);
    expect(looksLikeFullTarget(':12345')).toBe(true);
    expect(looksLikeFullTarget(':-----')).toBe(true);
    expect(looksLikeFullTarget(':target/42')).toBe(true);

    expect(looksLikeFullTarget(':target$!')).toBe(false);
    expect(looksLikeFullTarget(':target*')).toBe(false);
  });

  it('identifies package default targets', () => {
    expect(looksLikeFullTarget('angular/core')).toBe(true);
    expect(looksLikeFullTarget('ng2/core')).toBe(true);
    expect(looksLikeFullTarget('@correct//angular/core')).toBe(true);

    expect(looksLikeFullTarget('/angular/core')).toBe(false);
    expect(looksLikeFullTarget('Angular/core')).toBe(false);
    expect(looksLikeFullTarget('angular/core...')).toBe(false);
    expect(looksLikeFullTarget('angular/core/')).toBe(false);
    expect(looksLikeFullTarget('wrong//angular/core')).toBe(false);
    expect(looksLikeFullTarget('@angular/core')).toBe(false);
  });

  it('identifiers absolute targets', () => {
    expect(looksLikeFullTarget('//angular/core:core')).toBe(true);
    expect(looksLikeFullTarget('@ws//angular/core:42')).toBe(true);

    expect(looksLikeFullTarget('//angular/core:core$')).toBe(false);
  });
});

fdescribe('isMainWorkspace', () => {
  it('identifies main workspace', () => {
    expect(isMainWorkspace('//hello')).toBe(true);

    expect(isMainWorkspace('@ws//bello')).toBe(false);
    expect(isMainWorkspace('hello:world')).toBe(false);
  });
});

fdescribe(
    'targetToPath',
    () => {it('converts target to path', () => {
      expect(targetToPath('//:angular/core/index.ts')).toEqual('angular/core/index.ts');
      expect(targetToPath('//angular/core:index.ts')).toEqual('angular/core/index.ts');
    })});

fdescribe('difference', () => {
  it('diffs two empty arrays',
     () => { expect(difference([], [])).toEqual({removed: [], added: []}); });

  it('diffs two equal arrays',
     () => { expect(difference(['a'], ['a'])).toEqual({removed: [], added: []}); });

  it('diffs an added element',
     () => { expect(difference([], ['a'])).toEqual({removed: [], added: ['a']}); });

  it('diffs a deleted element',
     () => { expect(difference(['b'], [])).toEqual({removed: ['b'], added: []}); });

  it('diffs unsorted arrays', () => {
    expect(difference(['a', 'b'], ['b', 'a'])).toEqual({removed: [], added: []});
  });

  it('diffs everything', () => {
    const diff = difference(['a', 'b', 'c'], ['b', 'd', 'e']);
    expect(diff).toEqual({
      removed: jasmine.arrayContaining(['a', 'c']),
      added: jasmine.arrayContaining(['d', 'e'])
    });
    expect(diff.removed.length).toEqual(2);
    expect(diff.added.length).toEqual(2);
  })
});
