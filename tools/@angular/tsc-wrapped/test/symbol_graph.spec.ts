import {ModuleNode, SymbolGraph, collectByFile, collectBySymbol, createModuleNode, createSymbolNode, diffSymbolGraphs} from '@angular/tsc-wrapped/src/symbol_graph';
import * as ts from 'typescript';

describe('SymbolGraph', () => {
  describe('createModuleNode', () => {
    it('should identify named imports', () => {
      const node = makeModuleNode(
          {'foo.ts': `export const a = 1;'`, 'index.ts': `import {a} from './foo';`}, 'index.ts');
      // The fileNames are relative because our entry source file is specified
      // relatively.
      expect(Array.from(node.imports)).toEqual(['foo.ts%a']);
    });

    it('should identify named aliased imports', () => {
      const node = makeModuleNode(
          {'foo.ts': `export const a = 1;'`, 'index.ts': `import {a as b} from './foo';`},
          'index.ts');
      expect(Array.from(node.imports)).toEqual(['foo.ts%a']);
    });

    it('should identify namespace imports', () => {
      const node = makeModuleNode(
          {'foo.ts': `export const a = 1;'`, 'index.ts': `import * as foo from './foo';`},
          'index.ts');
      expect(Array.from(node.imports)).toEqual(['foo.ts%*']);
    });

    it('should identify default imports', () => {
      const node = makeModuleNode(
          {'foo.ts': `export default 1;'`, 'index.ts': `import a from './foo';`}, 'index.ts');
      expect(Array.from(node.imports)).toEqual(['foo.ts%default']);
    });

    it('should ignore side effect imports', () => {
      const node = makeModuleNode({'index.ts': `import './foo';`}, 'index.ts');
      expect(Array.from(node.imports)).toEqual([]);
    });

    it('should identify named reexports', () => {
      const node = makeModuleNode(
          {'foo.ts': `export const a = 1;'`, 'index.ts': `export {a} from './foo';`}, 'index.ts');
      expect(Array.from(node.reexports)).toEqual([['foo.ts%a', 'index.ts%a']]);
    });

    it('should identify named aliased reexports', () => {
      const node = makeModuleNode(
          {'foo.ts': `export const a = 1;'`, 'index.ts': `export {a as b} from './foo';`},
          'index.ts');
      expect(Array.from(node.reexports)).toEqual([['foo.ts%a', 'index.ts%b']]);
    });

    it('should identify wildcard reexports', () => {
      const node = makeModuleNode(
          {'foo.ts': `export const a = 1;'`, 'index.ts': `export * from './foo';`}, 'index.ts');
      expect(Array.from(node.reexports)).toEqual([['foo.ts%*', 'index.ts%*']]);
    });

    it('should mark module as valid by default', () => {
      const node = makeModuleNode(
          {'foo.ts': `export const a = 1;'`, 'index.ts': `import {a as b} from './foo';`},
          'index.ts');
      expect(node.isValid).toEqual(true);
    });

    it('should ignore unresolved imports and mark module as invalid', () => {
      const node =
          makeModuleNode({'index.ts': `import {a as b} from './non-existent';`}, 'index.ts');
      expect(Array.from(node.reexports)).toEqual([]);
      expect(node.isValid).toEqual(false);
    });

    it('should use TypeScript-esque escaping on identifiers for __python_case', () => {
      const node = makeModuleNode(
          {'foo.ts': `export const __new = 1;'`, 'index.ts': `import {__new} from './foo';`},
          'index.ts');
      expect(Array.from(node.imports)).toEqual(['foo.ts%___new']);  // three _s
    });

    it('should identify function exports', () => {
      const node = makeModuleNode({'foo.ts': `export function a() {}`}, 'foo.ts');
      expect(Array.from(node.exports)).toEqual(['foo.ts%a']);
    });

    it('should identify class exports', () => {
      const node = makeModuleNode({'foo.ts': `export class A {}`}, 'foo.ts');
      expect(Array.from(node.exports)).toEqual(['foo.ts%A']);
    });

    it('should identify enum exports', () => {
      const node = makeModuleNode({'foo.ts': `export enum A {a = 1, b = 2}`}, 'foo.ts');
      expect(Array.from(node.exports)).toEqual(['foo.ts%A']);
    });

    it('should identify variable exports', () => {
      const node = makeModuleNode({'foo.ts': `export var a = 1;`}, 'foo.ts');
      expect(Array.from(node.exports)).toEqual(['foo.ts%a']);
    });

    it('should identify destructuring exports', () => {
      const node = makeModuleNode(
          {
            'foo.ts': `
              export const [, a, [b, c]] = [1, [2, 3]];
              export const {p: d, q: [e]} = {p: 1, q: [2]}, f = 3;
              export var g: any;
            `
          },
          'foo.ts');
      expect(Array.from(node.exports)).toEqual([
        'foo.ts%a', 'foo.ts%b', 'foo.ts%c', 'foo.ts%d', 'foo.ts%e', 'foo.ts%f', 'foo.ts%g'
      ]);
    });

    it('should identify named exports', () => {
      const node = makeModuleNode(
          {
            'foo.ts': `
              var a = 1;
              export {a, b as c};
            `
          },
          'foo.ts');
      expect(Array.from(node.exports)).toEqual(['foo.ts%a', 'foo.ts%c']);
    });

    it('should identify namespace exports', () => {
      const node = makeModuleNode(
          {
            'foo.ts': `
              export declare namespace ts {
                export function a() {}
              }
            `
          },
          'foo.ts');
      expect(Array.from(node.exports)).toEqual(['foo.ts%ts']);
    });

    it('should identify ambient modules, e.g. namespace modules', () => {
      const node = makeModuleNode(
          {
            'foo.ts': `
              namespace ng {
                export function boostrap() { return 'yay!'; }
              }
            `
          },
          'foo.ts');
      expect(node.isAmbient).toEqual(true);
    });

    it('should identify ambient modules, e.g. empty file', () => {
      const node = makeModuleNode({'foo.ts': ``}, 'foo.ts');
      expect(node.isAmbient).toEqual(true);
    });

    it('should identify ambient modules, e.g. declare var', () => {
      const node = makeModuleNode({'foo.d.ts': `declare var require: any;`}, 'foo.d.ts');
      expect(node.isAmbient).toEqual(true);
    });

    it('should identify non-ambient modules, e.g. export {}', () => {
      const node = makeModuleNode({'foo.ts': `export {};`}, 'foo.ts');
      expect(node.isAmbient).toEqual(false);
    });
  });

  describe('constructor', () => {
    it('should create module nodes from scratch', () => {
      const {host, program, graph} =
          makeGraph({'foo.ts': `export const a = 1;`, 'index.ts': `export * from './foo';`});

      expect(graph.graph.size).toEqual(2);
      const foo = graph.graph.get('foo.ts');
      expect(foo).toBeDefined();
      expect(Array.from(foo.exports)).toEqual(['foo.ts%a']);
      const index = graph.graph.get('index.ts');
      expect(index).toBeDefined();
      expect(Array.from(index.reexports)).toEqual([['foo.ts%*', 'index.ts%*']]);

      const rFoo = graph.reverseLookup.get('foo.ts');
      expect(rFoo).toBeDefined();
      expect(Array.from(rFoo)).toEqual(['index.ts']);
      const rIndex = graph.reverseLookup.get('index.ts');
      expect(rIndex).not.toBeDefined();
    });

    it('should reuse module nodes if AST is unchanged', () => {
      const {host, program, graph} =
          makeGraph({'foo.ts': `export const a = 1;`, 'index.ts': `export * from './foo';`});

      const host2 = getMockHost({
        'foo.ts': 'this will not be read',  // Specifies that foo.ts does exist
        'index.ts': `export {a} from './foo';`
      });
      const _getSourceFile = host2.getSourceFile;
      host2.getSourceFile = (fileName, p, q) => {
        // Simulate the AST being cached
        if (fileName === 'foo.ts') {
          return program.getSourceFile(fileName);
        }
        return _getSourceFile.call(host2, fileName, p, q);
      };

      const program2 = ts.createProgram(['foo.ts', 'index.ts'], {}, host2);
      const graph2 = new SymbolGraph(program2, host2, graph);

      expect(graph2.graph.get('foo.ts')).toBe(graph.graph.get('foo.ts'));
      const index = graph2.graph.get('index.ts');
      expect(index).not.toBe(graph.graph.get('index.ts'));
      expect(Array.from(index.reexports)).toEqual([['foo.ts%a', 'index.ts%a']]);

      const rFoo = graph.reverseLookup.get('foo.ts');
      expect(rFoo).toBeDefined();
      expect(Array.from(rFoo)).toEqual(['index.ts']);
      const rIndex = graph.reverseLookup.get('index.ts');
      expect(rIndex).not.toBeDefined();
    });
  });

  describe('collectByFile', () => {
    it('should collect downstream transitive dependents', () => {
      const {graph} = makeGraph({
        'foo.ts': `export const a = 1;`,
        'bar.ts': `export {a} from './foo';`,
        'baz.ts': `export * from './foo';`,
        'index.ts': `export const number = 42;`
      });

      const foo = collectByFile(graph, 'foo.ts');
      expect(foo.size).toEqual(3);
      expect(Array.from(foo)).toEqual(jasmine.arrayContaining(['foo.ts', 'bar.ts', 'baz.ts']));

      const index = collectByFile(graph, 'index.ts');
      expect(index.size).toEqual(1);
      expect(Array.from(index)).toEqual(jasmine.arrayContaining(['index.ts']));
    });

    it('should collect with circular dependencies', () => {
      const {graph} = makeGraph({
        'foo.ts': `
          export const a = 1;
          export * from './bar';
        `,
        'bar.ts': `
          export const b = 2;
          export * from './foo';
        `,
        'index.ts': `export * from './foo';`
      });

      const bar = collectByFile(graph, 'bar.ts');
      expect(bar.size).toEqual(3);
      expect(Array.from(bar)).toEqual(jasmine.arrayContaining(['foo.ts', 'bar.ts', 'index.ts']));
    });
  });

  describe('collectBySymbol', () => {
    it('should collect downstream transitive dependents when with reexports', () => {
      const {graph} = makeGraph({
        'foo.ts': `
          export const a = 1;
          export const b = 2;
        `,
        'bar.ts': `export {a} from './foo';`,
        'baz.ts': `export * from './foo';`,
        'tar.ts': `import * as foo from './foo';`,
        'car.ts': `import {a} from './baz';`,
        'index.ts': `import {b} from './foo';`
      });

      const foo = collectBySymbol(graph, createSymbolNode('foo.ts', 'a'), true);
      expect(foo.size).toEqual(5);
      expect(Array.from(foo)).toEqual(jasmine.arrayContaining([
        'foo.ts', 'bar.ts', 'baz.ts', 'tar.ts', 'car.ts'
      ]));
    });

    it('should collect downstream transitive dependents when without reexports', () => {
      const {graph} = makeGraph({
        'foo.ts': `export const a = 1;`,
        'bar.ts': `export {a} from './foo';`,
        'baz.ts': `export * from './foo';`,
        'tar.ts': `import * as foo from './foo';`,
        'index.ts': `import {a} from './baz';`
      });

      const foo = collectBySymbol(graph, createSymbolNode('foo.ts', 'a'), false);
      expect(foo.size).toEqual(3);
      expect(Array.from(foo)).toEqual(jasmine.arrayContaining(['foo.ts', 'tar.ts', 'index.ts']));
    });

    it('should collect with circular dependencies', () => {
      const {graph} = makeGraph({
        'foo.ts': `
          export const a = 1;
        `,
        'bar.ts': `
          export {a} from './foo';
          export {b} from './baz';
        `,
        'baz.ts': `
          export {a as b} from './bar';
        `,
        'jar.ts': `
          import {b} from './bar';
        `
      });

      const foo = collectBySymbol(graph, createSymbolNode('foo.ts', 'a'), true);
      expect(foo.size).toEqual(4);
      expect(Array.from(foo)).toEqual(jasmine.arrayContaining([
        'foo.ts', 'bar.ts', 'baz.ts', 'jar.ts'
      ]));

      const foo2 = collectBySymbol(graph, createSymbolNode('foo.ts', 'a'), false);
      expect(foo2.size).toEqual(2);
      expect(Array.from(foo2)).toEqual(jasmine.arrayContaining(['foo.ts', 'jar.ts']));
    });
  });

  fdescribe('diffSymbolGraphs', () => {
    it('should detect change without symbol change and invalidate only imports', () => {
      const {graph: g1} = makeGraph({
        'foo.ts': `export const a = 1;`,
        'bar.ts': `export {a} from './foo';`,
        'index.ts': `import {a} from './bar';`
      });
      const {graph: g2} = makeGraph({
        'foo.ts': `export function a() {}`,
        'bar.ts': `export {a} from './foo';`,
        'index.ts': `import {a} from './bar';`
      });
      const diff = diffSymbolGraphs(g1, g2, new Set(['foo.ts']));
      expect(diff.size).toEqual(2);
      expect(Array.from(diff)).toEqual(jasmine.arrayContaining(['foo.ts', 'index.ts']));
    });

    fit('should detect change without symbol change with wildcards', () => {
      const {graph: g1} = makeGraph({
        'foo.ts': `export const a = 1;`,
        'bar.ts': `export * from './foo';`,
        'index.ts': `import {a} from './bar';`,
        'main.ts': `import * as bar from './bar';`
      });
      const {graph: g2} = makeGraph({
        'foo.ts': `export const a = 1;`,
        'bar.ts': `export * from './foo'; // something changed`,
        'index.ts': `import {a} from './bar';`,
        'main.ts': `import * as bar from './bar';`
      });
      const diff = diffSymbolGraphs(g1, g2, new Set(['bar.ts']));
      expect(diff.size).toEqual(3);
      expect(Array.from(diff)).toEqual(jasmine.arrayContaining(['bar.ts', 'index.ts', 'main.ts']));
    });

    it('should detect validity changes and invalidate all downstream', () => {
      const {graph: g1} = makeGraph({
        'foo.ts': `export {a} from './non-existent';`,
        'bar.ts': `export {a} from './foo';`,
        'index.ts': `import {a} from './bar';`,
        'empty.ts': ''
      });
      const {graph: g2} = makeGraph({
        'foo.ts': `export function a() {}`,
        'bar.ts': `export {a} from './foo';`,
        'index.ts': `import {a} from './bar';`,
        'empty.ts': ''
      });
      const diff = diffSymbolGraphs(g1, g2, new Set(['foo.ts']));
      expect(diff.size).toEqual(3);
      expect(Array.from(diff)).toEqual(jasmine.arrayContaining(['foo.ts', 'bar.ts', 'index.ts']));
    });

    it('should detect ambient changes and invalidate the whole graph', () => {
      const {graph: g1} = makeGraph({
        'node.d.ts': `declare var require: any;`,
        'index.ts': `export const a = 1;`,
        'empty.ts': ''
      });
      const {graph: g2} = makeGraph({
        'node.d.ts': `declare var require: Function;`,
        'index.ts': `export const a = 1;`,
        'empty.ts': ''
      });
      const diff = diffSymbolGraphs(g1, g2, new Set(['node.d.ts']));
      expect(diff.size).toEqual(3);
      expect(Array.from(diff)).toEqual(jasmine.arrayContaining([
        'node.d.ts', 'index.ts', 'empty.ts'
      ]));
    });

    it('should detect symbol adds and invalidate only that file', () => {
      const {graph: g1} = makeGraph({
        'foo.ts': `export {};`,
        'bar.ts': `export {a} from './foo';`,
        'index.ts': `import {a} from './bar';`
      });
      const {graph: g2} = makeGraph({
        'foo.ts': `export function a() {}`,
        'bar.ts': `export {a} from './foo';`,
        'index.ts': `import {a} from './bar';`
      });
      // Invalid files should be rechecked by external code using SymbolGraph
      const diff = diffSymbolGraphs(g1, g2, new Set(['foo.ts']));
      expect(diff.size).toEqual(1);
      expect(Array.from(diff)).toEqual(jasmine.arrayContaining(['foo.ts']));
    });

    it('should detect symbol removals and invalidate all downstream', () => {
      const {graph: g1} = makeGraph({
        'foo.ts': `export function a() {}`,
        'bar.ts': `export {a} from './foo';`,
        'index.ts': `import {a} from './bar';`
      });
      const {graph: g2} = makeGraph({
        'foo.ts': `export {};`,
        'bar.ts': `export {a} from './foo';`,
        'index.ts': `import {a} from './bar';`
      });
      const diff = diffSymbolGraphs(g1, g2, new Set(['foo.ts']));
      expect(diff.size).toEqual(3);
      expect(Array.from(diff)).toEqual(jasmine.arrayContaining(['foo.ts', 'bar.ts', 'index.ts']));
    });

    it('should detect file adds and invalidate only that file', () => {
      const {graph: g1} = makeGraph({
        'bar.ts': `export {a} from './foo';`,
        'baz.ts': `export {a} from './bar';`
      });
      const {graph: g2} = makeGraph({
        'foo.ts': `export function a() {}`,
        'bar.ts': `export {a} from './foo';`,
        'baz.ts': `export {a} from './bar';`
      });
      // Other files are invalidated anyway because they are possibly affected
      // by a file-invalid import
      const diff = diffSymbolGraphs(g1, g2, new Set(['foo.ts']));
      expect(diff.size).toEqual(3);
      expect(Array.from(diff)).toEqual(jasmine.arrayContaining(['foo.ts', 'bar.ts', 'baz.ts']));
    });

    it('should detect file removals and invalidate all downstream', () => {
      const {graph: g1} = makeGraph({
        'foo.ts': `export function a() {}`,
        'bar.ts': `export {a} from './foo';`,
        'index.ts': `import {a} from './bar';`
      });
      const {graph: g2} = makeGraph({
        'bar.ts': `export {a} from './foo';`,
        'index.ts': `import {a} from './bar';`
      });
      // Invalid files should be rechecked by external code using SymbolGraph
      const diff = diffSymbolGraphs(g1, g2, new Set(['foo.ts']));
      expect(diff.size).toEqual(2);
      expect(Array.from(diff)).toEqual(jasmine.arrayContaining(['bar.ts', 'index.ts']));
    });

    it('should recheck invalid files', () => {
      const {graph: g1} = makeGraph({
        'foo.ts': `export {a} from './non-existent';`,
      });
      const {graph: g2} = makeGraph({
        'foo.ts': `export {a} from './non-existent2';`,
      });
      const diff = diffSymbolGraphs(g1, g2, new Set(['foo.ts']));
      expect(diff.size).toEqual(1);
    });
  });
});

function makeGraph(files: {[name: string]: string}):
    {host: ts.CompilerHost, program: ts.Program, graph: SymbolGraph} {
  const host = getMockHost(files);
  const program = ts.createProgram(Object.keys(files), {}, host);
  const graph = new SymbolGraph(program, host);
  return {host, program, graph};
}

function makeModuleNode(files: {[name: string]: string}, fileName: string): ModuleNode {
  const host = getMockHost(files);
  const program = ts.createProgram(Object.keys(files), {}, host);
  return createModuleNode(program.getSourceFile(fileName), {}, host);
}

function getMockHost(files: {[name: string]: string}): ts.CompilerHost {
  return {
    getSourceFile: (sourceName, languageVersion) => {
      if (files[sourceName] === undefined) return undefined;
      return ts.createSourceFile(
          sourceName, stripExtraIndentation(files[sourceName]), languageVersion, true);
    },
    writeFile: (name, text, writeByteOrderMark) => {},
    fileExists: (filename) => files[filename] !== undefined,
    readFile: (filename) => stripExtraIndentation(files[filename]),
    getDefaultLibFileName: () => 'lib.d.ts',
    useCaseSensitiveFileNames: () => true,
    getCanonicalFileName: (filename) => filename,
    getCurrentDirectory: () => '/fake/path',
    getNewLine: () => '\n',
    getDirectories: (path: string) => {
      const directories = new Set<string>();
      for (const file of Object.keys(files)) {
        if (file.indexOf(path + '/') === 0) {
          const segments = file.substr(path.length + 1).split('/');
          if (segments.length > 1) {
            directories.add(segments[0]);
          }
        }
      }
      return Array.from(directories);
    }
  };
}

function stripExtraIndentation(text: string) {
  let lines = text.split('\n');
  // Ignore first and last new line
  if (!lines[0]) lines.shift();
  if (lines.length && !lines[lines.length - 1]) lines.pop();
  const commonIndent = lines.reduce((min, line) => {
    const indent = /^( *)/.exec(line)[1].length;
    // Ignore empty line
    return line.length ? Math.min(min, indent) : min;
  }, text.length);

  return lines.map(line => line.substr(commonIndent)).join('\n') + '\n';
}
