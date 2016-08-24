import * as assert from 'assert';
import * as ts from 'typescript';

/**
 * An opaque hashable token that references an identifier in a module.
 *
 * `__symbolNodeBrand` is used to provide nominal typing.
 */
export type SymbolNode = string & {__symbolNodeBrand: any};


export function createSymbolNode(fileName: string, identifier = '*'): SymbolNode {
  // This relies on the fact that '%' is invalid in an identifier.
  return fileName + '%' + identifier as SymbolNode;
}

export function parseSymbolNode(symbolNode: SymbolNode): {fileName: string, identifier: string} {
  const sep = symbolNode.lastIndexOf('%');
  if (sep === -1) {
    throw new Error('Invalid SymbolNode: ' + symbolNode);
  }

  return {fileName: symbolNode.substr(0, sep), identifier: symbolNode.substr(sep + 1)};
}

/**
 * An immutable data structure that represents a module in the
 * SymbolGraph.
 */
export interface ModuleNode {
  fileName: string;

  /**
   * Whether all imported files are properly resolved.
   */
  isValid: boolean;

  /*
   * Whether this module declares symbols into the ambient scope.
   * If this is true, imports, exports, reexports and importedBy will be null.
   */
  isAmbient: boolean;
  /**
   * Symbols that are imported into the local scope.
   * Corresponds to a statement of `import {foo} from './bar';`.
   */
  imports?: Set<SymbolNode>;
  /**
   * Symbols that are exported from the local scope.
   * Corresponds to a statement of `export const foo = 'bar';`.
   *
   * We need to track these symbols since they take precedence over a wildcard
   * reexport. e.g. if
   * ```
   * export * from './foo'; // includes symbols a and b
   * export const a = ...;
   * ```
   * then we need to identify that a is from the local scope.
   */
  exports?: Set<SymbolNode>;
  /**
   * Symbols that are reexported but may not be in scope.
   * Maps the imported SymbolNode to a SymbolNode created locally.
   * Corresponds to a statement of `export {foo} from './bar';`.
   *
   * Note that this can even map multiple some-module.ts%* to one
   * this-module.ts%*, which is fine since we only ever need to look-up this
   * mapping in the downstream direction.
   */
  reexports?: Map<SymbolNode, SymbolNode>;
}

export class SymbolGraph {
  graph = new Map<string, ModuleNode>();
  // fileName -> set of fileNames that import/reexport the said fileName
  reverseLookup: Map<string, Set<string>>;

  constructor(private program: ts.Program, host: ts.CompilerHost, oldGraph?: SymbolGraph) {
    // Create or reuse ModuleNodes
    for (const sourceFile of program.getSourceFiles()) {
      const fileName = sourceFile.fileName;
      const moduleNode = oldGraph && sourceFile === oldGraph.program.getSourceFile(fileName) ?
          oldGraph.graph.get(fileName) :
          createModuleNode(sourceFile, program.getCompilerOptions(), host);
      this.graph.set(fileName, moduleNode);
    }

    this.reverseLookup = createReverseLookup(this.graph);

    // We don't care whether the import symbols are missing, since we will
    // recheck reexports when new symbols are added anyway.

    // We don't care about export collisions:
    // 1) Two locals clash: The sources of the symbols are the same file, so we
    //    will still be invalidating the right things.
    // 2) Two reexports clash: We will only be invalidating more things than
    //    needed since the change of either symbols will invalidate downstream
    //    files.
    // 3) Local and reexport clash: The local symbol takes precedence.
  }
}

/** @internal */
export function createModuleNode(
    sourceFile: ts.SourceFile, options: ts.CompilerOptions, host: ts.CompilerHost): ModuleNode {
  // To make sure our algorithm is correct, we have to ensure that our view of
  // imports and exports is always the same as that of TypeScript -- even when
  // there are syntax errors.
  const ret: ModuleNode = {
    fileName: sourceFile.fileName,
    isValid: true,
    // We currently consider CommonJS modules ambient, but we may be able to
    // relax this constraint if needed.
    isAmbient: !ts.isExternalModule(sourceFile),
  };
  if (!ret.isAmbient) {
    ret.imports = new Set<SymbolNode>();
    ret.exports = new Set<SymbolNode>();
    ret.reexports = new Map<SymbolNode, SymbolNode>();

    for (const statement of sourceFile.statements) {
      switch (statement.kind) {
        case ts.SyntaxKind.ImportDeclaration: {
          const importDecl = statement as ts.ImportDeclaration;
          const keys: string[] = [];
          if (importDecl.importClause) {
            // default import
            if (importDecl.importClause.name) keys.push('default');
            // named import
            if (importDecl.importClause.namedBindings) {
              const namedBindings = importDecl.importClause.namedBindings;
              switch (namedBindings.kind) {
                // import * as foo
                case ts.SyntaxKind.NamespaceImport:
                  keys.push('*');
                  break;
                // import {a, b as c}
                case ts.SyntaxKind.NamedImports:
                  for (const specifier of (namedBindings as ts.NamedImports).elements) {
                    keys.push(
                        specifier.propertyName ? specifier.propertyName.text : specifier.name.text);
                  }
                  break;
              }
            }
          }
          const targetModule =
              resolveModuleName((importDecl.moduleSpecifier as ts.StringLiteral).text);
          if (targetModule) {
            for (const key of keys) {
              ret.imports.add(createSymbolNode(targetModule, key));
            }
          } else {
            ret.isValid = false;
          }
          break;
        }
        case ts.SyntaxKind.ExportDeclaration: {
          const exportDecl = statement as ts.ExportDeclaration;
          const keys: [string, string][] = [];
          if (exportDecl.moduleSpecifier) {
            // reexport
            if (exportDecl.exportClause) {
              // export {a, b as c}
              for (const specifier of exportDecl.exportClause.elements) {
                keys.push([
                  specifier.propertyName ? specifier.propertyName.text : specifier.name.text,
                  specifier.name.text
                ]);
              }
            } else {
              // export *
              keys.push(['*', '*']);
            }
            const targetModule =
                resolveModuleName((exportDecl.moduleSpecifier as ts.StringLiteral).text);
            if (targetModule) {
              for (const [from, to] of keys) {
                ret.reexports.set(
                    createSymbolNode(targetModule, from),
                    createSymbolNode(sourceFile.fileName, to));
              }
            } else {
              ret.isValid = false;
            }
            break;
          } else {
            // export locals
            for (const specifier of exportDecl.exportClause.elements) {
              ret.exports.add(createSymbolNode(sourceFile.fileName, specifier.name.text));
            }
          }
          break;
        }
        default:
          if (statement.flags & ts.NodeFlags.Export) {
            let keys: string[] = [];
            switch (statement.kind) {
              case ts.SyntaxKind.ClassDeclaration:
              case ts.SyntaxKind.EnumDeclaration:
              case ts.SyntaxKind.FunctionDeclaration:
              case ts.SyntaxKind.InterfaceDeclaration:
              case ts.SyntaxKind.VariableDeclaration:
              case ts.SyntaxKind.TypeAliasDeclaration:
              case ts.SyntaxKind.ModuleDeclaration: {
                const decl = statement as ts.DeclarationStatement | ts.VariableDeclaration;
                keys.push(...collectNames(decl.name));
                break;
              }
              case ts.SyntaxKind.VariableStatement: {
                const stmt = statement as ts.VariableStatement;
                for (const d of stmt.declarationList.declarations) {
                  keys.push(...collectNames(d.name));
                }
                break;
              }
              default:
                console.warn(
                    `Warning: Unsupported export type in ${sourceFile.fileName}. ` +
                    'Incremental compilation may be significantly slower.');
                ret.isValid = false;
                break;
            }
            for (const key of keys) {
              ret.exports.add(createSymbolNode(sourceFile.fileName, key));
            }
          }
          break;
      }
    }
  }
  return ret;

  function resolveModuleName(moduleName: string): string {
    let resolvedModule: ts.ResolvedModule = null;
    if (host.resolveModuleNames) {
      resolvedModule = host.resolveModuleNames([moduleName], sourceFile.fileName)[0];
    } else {
      resolvedModule =
          ts.resolveModuleName(moduleName, sourceFile.fileName, options, host).resolvedModule;
    }
    return resolvedModule ? resolvedModule.resolvedFileName : null;
  }

  /**
   * Recursively collect identifiers from a binding pattern or identifier.
   */
  function collectNames(node: ts.BindingPattern | ts.Identifier): string[] {
    switch (node.kind) {
      case ts.SyntaxKind.Identifier:
        return [(node as ts.Identifier).text];
      case ts.SyntaxKind.ObjectBindingPattern:
      case ts.SyntaxKind.ArrayBindingPattern:
        return (node as ts.BindingPattern)
            .elements.map(x => x.name ? collectNames(x.name) : [])
            .reduce((a, b) => a.concat(b), []);
      default:
        throw new Error(`Unexpected SyntaxKind ${node.kind} in collectNames`);
    }
  }
}

/** @internal */
export function createReverseLookup(graph: Map<string, ModuleNode>) {
  const ret = new Map<string, Set<string>>();
  // At this point, all the imports and reexports are valid, so we just
  // directly use those values.
  graph.forEach((moduleNode, importer) => {
    if (!moduleNode.isAmbient) {
      moduleNode.imports.forEach(addImport);
      moduleNode.reexports.forEach((v, k) => addImport(k));
    }

    function addImport(importedSymbol: SymbolNode) {
      const {fileName: importee, identifier} = parseSymbolNode(importedSymbol);
      let entry = ret.get(importee);
      if (!entry) {
        entry = new Set<string>();
        ret.set(importee, entry);
      }
      entry.add(importer);
    }
  });
  return ret;
}

/**
 * Compares two SymbolGraphs and returns the set of nodes invalidated.
 */
export function diffSymbolGraphs(
    oldGraph: SymbolGraph, newGraph: SymbolGraph, changedFiles: Set<string>): Set<string> {
  const ret = new Set<string>(changedFiles);
  changedFiles.forEach(fileName => {
    const newModuleNode = newGraph.graph.get(fileName);
    const oldModuleNode = oldGraph.graph.get(fileName);
    if (!newModuleNode) {
      if (!oldModuleNode) {
        throw new Error(`File not found: ${fileName}`);
      }
      // Removed file: will turn valid files to invalid
      collectByFile(oldGraph, fileName).forEach(file => { ret.add(file); });
    } else if (!oldModuleNode) {
      // Added file: will not turn valid files to invalid
    } else if (oldModuleNode.isAmbient !== newModuleNode.isAmbient || newModuleNode.isAmbient) {
      newGraph.graph.forEach((_, file) => { ret.add(file); });
    } else {
      const oldExports = new Set<SymbolNode>(oldModuleNode.exports);
      oldModuleNode.reexports.forEach(v => { oldExports.add(v); });
      const newExports = new Set<SymbolNode>(newModuleNode.exports);
      newModuleNode.reexports.forEach(v => { newExports.add(v); });
      oldExports.forEach(symbolNode => {
        if (!newExports.has(symbolNode)) {
          // Deleted symbol: may turn valid reexports to invalid
          collectBySymbol(oldGraph, symbolNode, /*includeReexports*/ true).forEach(file => {
            ret.add(file);
          });
        } else {
          // Possibly changed symbol: may not turn valid reexports to invalid
          collectBySymbol(oldGraph, symbolNode, /*includeReexports*/ false).forEach(file => {
            ret.add(file);
          });
        }
      });

      // Added symbol: may turn invalid files to valid, but they will be checked
      // anyway.
    }
  });
  newGraph.graph.forEach((newNode, fileName) => {
    const oldNode = oldGraph.graph.get(fileName);
    if ((oldNode && !oldNode.isValid) || !newNode.isValid) {
      // Their imports might have turned correct. We have to do this expensive
      // invalidation because we don't keep track of invalid imports (only the
      // fact that there are invalid imports).
      collectByFile(oldGraph, fileName).forEach(file => { ret.add(file); });
    }
  });
  // No need to check files that have been removed
  ret.forEach(fileName => {
    if (!newGraph.graph.has(fileName)) {
      ret.delete(fileName);
    }
  });
  return ret;
}

export function collectByFile(graph: SymbolGraph, fileName: string): Set<string> {
  const ret = new Set<string>();
  collectRecursively(fileName);
  return ret;

  function collectRecursively(importee: string) {
    if (ret.has(importee)) {
      return;
    } else {
      ret.add(importee);
      const imports = graph.reverseLookup.get(importee);
      if (imports) {
        imports.forEach(importer => { collectRecursively(importer); });
      }
    }
  }
}

export function collectBySymbol(
    graph: SymbolGraph, symbolNode: SymbolNode, includeReexports: boolean): Set<string> {
  const ret = new Set<string>();
  // First node is always included
  ret.add(parseSymbolNode(symbolNode).fileName);

  // We may need to visit a file more than once due to circular dependencies,
  // but never a symbol more than once.
  const traced = new Set<SymbolNode>();

  collectRecursively(symbolNode);
  return ret;

  function collectRecursively(importee: SymbolNode) {
    const {fileName, identifier} = parseSymbolNode(importee);
    if (traced.has(importee)) {
      return;
    } else {
      if (includeReexports) {
        ret.add(fileName);
      }
      traced.add(importee);
      const imports = graph.reverseLookup.get(fileName);
      if (imports) {
        imports.forEach(importerFileName => {
          const importerModuleNode = graph.graph.get(importerFileName);
          if (identifier === '*') {
            // We don't know what identifiers are actually imported, so we
            // resort to selecting any from our module concerned.
            importerModuleNode.imports.forEach(importee => {
              if (parseSymbolNode(importee).fileName === fileName) {
                ret.add(importerFileName);
              }
            });
            importerModuleNode.reexports.forEach((importedAs, importee) => {
              if (parseSymbolNode(importee).fileName === fileName) {
                collectRecursively(importedAs);
              }
            });
          } else {
            if (importerModuleNode.imports.has(importee) ||
                importerModuleNode.imports.has(createSymbolNode(fileName, '*'))) {
              ret.add(importerFileName);
            }

            if (importerModuleNode.reexports.has(importee)) {
              collectRecursively(importerModuleNode.reexports.get(importee));
            } else if (importerModuleNode.reexports.has(createSymbolNode(fileName, '*'))) {
              collectRecursively(createSymbolNode(importerFileName, identifier));
            }
          }
        });
      }
    }
  }
}
