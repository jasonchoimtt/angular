```typescript
interface ModuleNode {
  fileName: string;
  /**
   * Whether this module declares symbols into the ambient scope.
   * If this is true, imports, exports, reexports and importedBy will be null.
   */
  isAmbient: boolean;
  /**
   * Symbols that are imported into the local scope.
   * Corresponds to a statement of `import {foo} from './bar';`.
   */
  imports?: Map<string, Set<string>>;
  /**
   * Symbols that are exported from the local scope.
   * Corresponds to a statement of `export const foo = 'bar';`.
   */
  exports?: Set<string>;
  /**
   * Symbols that are reexported but may not be in scope.
   * Corresponds to a statement of `export {foo} from './bar';`.
   */
  reexports?: Set<string>;
  /**
   * For each symbol, the set of modules that directly import that node, either
   * with an import or a reexport.
   */
  importedBy?: Map<string, Set<string>>;
}

class SymbolDependencyGraph {
  graph: Map<string, ModuleNode> = new Map<string, ModuleName>();

  static createFromProgram(program: ts.Program): SymbolDependencyGraph;

  updateFromProgram(program: ts.Program): SymbolDependencyGraph;

  collectUses(fileName: string, symbol?: string): Set<string>;

  collectReexports(fileName: string, symbol?: string): Set<string>;
}

function diffSymbolDependencyGraphs(
    oldGraph: SymbolDependencyGraph, newGraph: SymbolDependencyGraph): Set<string> {

}

        default:
          if (sourceFile.flags & ts.NodeFlags.Export) {
            switch (statement.kind) {
              case ts.SyntaxKind.ClassDeclaration:
              case ts.SyntaxKind.InterfaceDeclaration:
              case ts.SyntaxKind.EnumDeclaration:
              case ts.SyntaxKind.FunctionDeclaration:
              case ts.SyntaxKind.VariableDeclaration:
              case ts.SyntaxKind.TypeAliasDeclaration: {
                const decl = statement as ts.DeclarationStatement | ts.VariableDeclaration;
                switch (decl.name.kind) {
                  case ts.SyntaxKind.Identifier:
                    break;
                  case ts.SyntaxKind.ObjectBindingPattern:
                  case ts.SyntaxKind.ArrayBindingPattern:
                    break;
                  default:
                    console.warn(
                        `Warning: Unsupported "export" type in ${sourceFile.fileName}. ` +
                        'Incremental compilation may be significantly slower.');
                    ret.isValid = false;
                    break;
                }
                break;
              }
              default:
                console.warn(
                    `Warning: Unsupported "export" type in ${sourceFile.fileName}. ` +
                    'Incremental compilation may be significantly slower.');
                ret.isValid = false;
                break;
            }
          }
          break;
```
