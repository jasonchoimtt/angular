///<reference path="../node_modules/@types/node/index.d.ts"/>
'use strict';

declare var require: any;
var glob = require('glob');
var chalk = require('chalk');

import * as assert from 'assert';
import * as path from 'path';
import * as fs from 'fs';
import * as ts from 'typescript';
import {SyntaxKind} from 'typescript';
const _ = require('lodash');

const TARGET_ANNOTATIONS = [/@(inline)\b/, /@(copy)\b/];

const symbolMetaMap: Map<ts.Node, InlineMetadata> = new Map<ts.Node, InlineMetadata>();

const findUsedSymbols = n => dfs(n, n => {
  const sym = tc.getSymbolAtLocation(n);
  return sym && sym.flags & (ts.SymbolFlags.Variable | ts.SymbolFlags.Alias) ? [sym] : [];
}, ss => _.uniq(_.flatten(ss)));

let topId = 0;
let idMap: Map<ts.Symbol, number> = new Map<ts.Symbol, number>();
function getId(sym: ts.Symbol) {
  if (!idMap.has(sym)) {
    idMap.set(sym, topId++);
  }
  return idMap.get(sym);
}

function stringifySymbol(symbol: ts.Symbol) {
  let ret = `${symbol.name} ${getId(symbol)}`;

  if (symbol.flags & ts.SymbolFlags.Alias) {
    const alias = tc.getAliasedSymbol(symbol);
    ret += ` =(${stringifySymbol(alias)})`;
  }
  return ret;
}

function print(node: ts.Node, indent: string = '') {
  let out =
      `${indent}${chalk.green('+ ' + SyntaxKind[node.kind])} ${chalk.gray('0x' + node.flags.toString(16))} ${node['name']}`;

  // Symbol referred to
  let sym = tc.getSymbolAtLocation(node);
  if (sym) {
    out += ` [${stringifySymbol(sym)} ${chalk.gray('0x' + sym.flags.toString(16))}]`;
  }

  // Symbol table
  let symTable = (<any>node).locals;
  if (symTable) {
    out += '\n' + indent +
        chalk.yellow(
            '  Symbol: ' +
            Object.keys(symTable)
                .map(name => {
                  let sym = symTable[name];
                  return `${sym.name} ${getId(sym)}`;
                })
                .join(', '));
  }

  // Type
  // let type = tc.getTypeAtLocation(node);
  // if (type.symbol && type.symbol.valueDeclaration) {
  //   out += ` ${type.symbol.valueDeclaration.getFullText()}`
  // }

  // Source text
  let text = node.getFullText();
  if (1 < text.length && text.length < 40 && text.indexOf('\n') === -1) {
    out += ` ${chalk.gray(text)}`;
  }

  // ts.forEachChild(node, x => print(x, indent + '  '));
  node.getChildren().forEach(x => print(x, indent + '  '));
}

const countKind = (node, kind) => dfs(node, n => n.kind === kind ? 1 : 0, xs => _.sum(xs));
const countSymbol = (node, symbol: ts.Symbol) =>
    dfs(node, n => tc.getSymbolAtLocation(n) === symbol ? 1 : 0, xs => _.sum(xs));

const INLINABLE = [
  SyntaxKind.PropertyAccessExpression,
  SyntaxKind.ElementAccessExpression,
  SyntaxKind.Identifier,
  SyntaxKind.NumericLiteral,
  SyntaxKind.StringLiteral,
  SyntaxKind.RegularExpressionLiteral,
  SyntaxKind.NoSubstitutionTemplateLiteral,
];

const STATEMENTS =
    [
      SyntaxKind.VariableStatement,
      SyntaxKind.EmptyStatement,
      SyntaxKind.ExpressionStatement,
      SyntaxKind.IfStatement,
      SyntaxKind.DoStatement,
      SyntaxKind.WhileStatement,
      SyntaxKind.ForStatement,
      SyntaxKind.ForInStatement,
      SyntaxKind.ForOfStatement,
      SyntaxKind.ContinueStatement,
      SyntaxKind.BreakStatement,
      SyntaxKind.ReturnStatement,
      SyntaxKind.WithStatement,
      SyntaxKind.SwitchStatement,
      SyntaxKind.LabeledStatement,
      SyntaxKind.ThrowStatement,
      SyntaxKind.TryStatement,
      SyntaxKind.DebuggerStatement,
    ]

    const argv = require('minimist')(process.argv.slice(2), {string: 'out', boolean: true});

const cwd = process.cwd();
if (!fs.existsSync('modules')) {
  throw new Error('Incorrect cwd!');
}

if (!argv._.length) {
  throw new Error('No glob given!');
}

const allFiles: string[] = <any>argv._.map(x => glob.sync(x))
                               .reduce((x: string[], y) => x.concat(y), [])
                               .map(x => path.resolve(x));

const tsOptions = {
  baseUrl: '.',
  paths: {
    '@angular/*': ['modules/@angular/*']
  }
};
const program = ts.createProgram(allFiles, tsOptions, ts.createCompilerHost(tsOptions));
const tc = program.getTypeChecker();
program.getSemanticDiagnostics();

const options = (<any>Object).assign({write: false, removeImports: false}, argv);

const usedPartition: {[key: string]: boolean} = {};

for (const sf of program.getSourceFiles()) {
  if (allFiles.indexOf(sf.fileName) === -1) {
    continue;
  }

  const out = transform(sf).text;
  if (out !== fs.readFileSync(sf.fileName).toString() && options.write) {
    fs.writeFileSync(sf.fileName, out);
  } else if (options.out) {
    fs.writeFileSync(options.out, out);
  }
}

interface InlineMetadata {
  name: string;
  strategy: string;
  data?: string;  // Not used currently
  declaration?: ts.Node;
}

interface TransformResult {
  global: string;
  local: string;
  text: string;
}

interface SymbolTransform {
  text: string;
  addInline?: boolean;
}

function getInlineMetadata(symbol: ts.Symbol): InlineMetadata {
  if (!symbol) return null;
  if (symbol.flags & ts.SymbolFlags.Alias) {
    symbol = tc.getAliasedSymbol(symbol);
  }
  const node = symbol.valueDeclaration || (symbol.declarations && symbol.declarations[0]);

  return getInlineMetadataForDeclaration(node);
}

function getInlineMetadataForDeclaration(node: ts.Node): InlineMetadata {
  if (!node) {
    return null;
  }
  const symbol = tc.getSymbolAtLocation(node);

  let meta = symbolMetaMap.get(node);
  if (!meta) {
    meta = null;

    const sourceText = node.getSourceFile().text;
    const trivia = sourceText.substr(node.pos, node.getLeadingTriviaWidth());

    for (const annotation of TARGET_ANNOTATIONS) {
      const [, strategy, data] = annotation.exec(trivia) || [, null, null];
      if (strategy) {
        meta = {name: symbol && symbol.name || '<symbol>', strategy, data, declaration: node};
        break;
      }
    }

    symbolMetaMap.set(node, meta);
  }
  return meta;
}

function transform(node: ts.Node, checkInline: boolean = true): TransformResult {
  const children = node.getChildren();
  if (!children.length) {
    return {global: '', local: '', text: node.getFullText()};
  } else {
    if (checkInline) {
      if (node.kind === SyntaxKind.CallExpression) {
        const func = (<ts.CallExpression>node).expression;
        const sym = tc.getSymbolAtLocation(func);
        // Note that we also handle iffe
        const meta = sym ? getInlineMetadata(sym) : getInlineMetadataForDeclaration(func);
        if (meta) {
          return doTransform(node, meta);
        }
      } else if (options.removeImports && node.kind === SyntaxKind.ImportDeclaration) {
        const importClause = (<ts.ImportDeclaration>node).importClause;
        if (importClause && importClause.namedBindings &&
            importClause.namedBindings.kind === SyntaxKind.NamedImports) {
          const namedImports = <ts.NamedImports>importClause.namedBindings;
          const specifiers = namedImports.elements;
          // Skip whole import
          if (specifiers.every(
                  specifier => !!getInlineMetadata(tc.getSymbolAtLocation(specifier.name)))) {
            return {global: '', local: '', text: ''};
          }
        }
      } else if (options.removeImports && node.kind === SyntaxKind.NamedImports) {
        const specifiers =
            (<ts.NamedImports>node)
                .elements
                .filter(specifier => !getInlineMetadata(tc.getSymbolAtLocation(specifier.name)))
                .map(
                    sp => (sp.propertyName ? sp.propertyName.text.replace(/^___/, '__') + ' as ' :
                                             '') +
                        sp.name.text.replace(/^___/, '__'));
        return {global: '', local: '', text: ` {${specifiers.join(', ')}} `};
      } else if (node.kind === SyntaxKind.PrefixUnaryExpression) {
        // For !sth(), add parenthesis between substituted sth
        const {global, local, text} = transform(children[1]);
        if (text !== children[1].getFullText()) {
          return {global, local, text: children[0].getFullText() + '(' + text + ')'};
        } else {
          return {global, local, text: children[0].getFullText() + text};
        }
      }
    }

    let globals: Map<string, number> = new Map<string, number>();
    let locals: Map<string, number> = new Map<string, number>();
    let childrenText: string[] = [];

    children.forEach((n, i) => {
      const result = transform(n, checkInline);
      if (result.global) {
        if (!globals.has(result.global)) {
          globals.set(result.global, i);
        }
      }
      if (result.local) {
        if (!locals.has(result.local)) {
          locals.set(result.local, i);
        }
      }
      childrenText.push(result.text);
    });

    if (node.kind === SyntaxKind.SyntaxList &&
        node.getChildren().some(x => STATEMENTS.indexOf(x.kind) !== -1)) {
      // Insert local at inter-statement level
      return {
        global: keys(globals).join(''),
        local: '',
        text: insertAndSerialize(childrenText, locals)
      };
    } else if (node.kind === SyntaxKind.SyntaxList && node.parent.kind === SyntaxKind.SourceFile) {
      // Insert global at source file level
      locals.forEach((v, k) => {
        if (!globals.has(k)) {
          globals.set(k, v);
        }
      });
      return {global: '', local: '', text: insertAndSerialize(childrenText, globals)};
    } else {
      // Propagate everything
      return {
        global: keys(globals).join(''),
        local: keys(locals).join(''),
        text: childrenText.join('')
      };
    }
  }
}

// Emit a tree of nodes while renaming symbols
function transformSymbols(node: ts.Node, map: Map<ts.Symbol, SymbolTransform>): string {
  const children = node.getChildren();
  const transformed = children.map(n => transformSymbols(n, map));
  if (node.kind === SyntaxKind.CallExpression) {
    if (!transformed[0].trim().match(/^[_a-zA-Z$0-9]+$/) && transformed[0].indexOf('=>') !== -1) {
      return '/**TODO #facade @inline*/ (' + transformed[0] + ' )' + transformed.slice(1).join('');
    }
  } else if (node.kind === SyntaxKind.Identifier) {
    const sym = tc.getSymbolAtLocation(node);
    return map.get(sym) && map.get(sym).text || node.getFullText();
  }

  if (!children.length) {
    return node.getFullText();
  } else {
    return transformed.join('');
  }
}

function createMessage(node: ts.Node, message: string): string {
  const sourceFile = node.getSourceFile();
  let position;
  if (sourceFile) {
    const {line, character} = sourceFile.getLineAndCharacterOfPosition(node.getStart());
    const fileName = path.relative(cwd, sourceFile.fileName);
    position = `${fileName}(${line + 1},${character + 1})`;
  } else {
    position = '<unknown>';
  }

  return chalk.bold(chalk.yellow(`${position}: ${message}`));
}

function doTransform(node: ts.Node, meta: InlineMetadata): TransformResult {
  let output = '';
  output += createMessage(node, meta.strategy + ' ' + meta.name) + '\n';
  switch (meta.strategy) {
    case 'inline': {
      const call = <ts.CallExpression>node;
      let declaration = <ts.FunctionLikeDeclaration>meta.declaration;
      while (declaration.kind === SyntaxKind.ParenthesizedExpression) {
        declaration = <any>(<any>declaration).expression;
      }
      const body = declaration.body;

      let returnExpression: ts.Expression = null;
      let remainingStatements: ts.Statement[] = [];

      if (body) {
        if (body.kind === SyntaxKind.Block) {
          const statements = (<ts.Block>body).statements;
          returnExpression = statements[statements.length - 1] &&
                  statements[statements.length - 1].kind === SyntaxKind.ReturnStatement ?
              (<ts.ReturnStatement>statements[statements.length - 1]).expression :
              null;
          remainingStatements = returnExpression ? statements.slice(0, -1) : statements;
        } else {  // Expression
          returnExpression = <ts.Expression>body;
          console.log(returnExpression.getFullText());
        }

        if (countKind(body, SyntaxKind.ReturnStatement) > 1) {
          output += 'Node has more than one return statement, ignoring\n';
          output += chalk.gray(call.getFullText().trim()) + '\n';
          return {global: '', local: '', text: call.getFullText()};
        }
      }


      const actuals = call.arguments;
      const formals = declaration.parameters || [];

      const extraVars: string[] = [];
      const extraVarMap: {[key: string]: boolean} = {};
      const symbolMap = new Map<ts.Symbol, SymbolTransform>();

      const formalSymbols: ts.Symbol[] = [];

      formals.forEach((formal: ts.ParameterDeclaration, i: number) => {
        const sym = tc.getSymbolAtLocation(formal.name);
        formalSymbols.push(sym);

        const uses = body ? countSymbol(body, sym) : 0;
        const actual = actuals[i];

        // Replace formal with actual parameters
        if (actual) {
          if (uses > 1 && INLINABLE.indexOf(actual.kind) === -1) {
            assert(formal.name.kind === SyntaxKind.Identifier);

            // Generate identifier with deconflicting
            let iden = (<ts.Identifier>formal.name).text;
            while (tc.getSymbolsInScope(call, ts.SymbolFlags.Variable).find(x => x.name === iden)) {
              iden += '$1';
            }
            if (iden.indexOf('$1') !== -1) {
              iden += ' /* TODO #facade */';
            }
            extraVarMap[iden] = true;

            output += chalk.green(`Generating extra identifier ${iden}`) + '\n';
            extraVars.push(`const ${iden} = ${actual.getFullText()};`);
            symbolMap.set(sym, {text: ' ' + iden});
          } else if (actual.kind === SyntaxKind.ArrowFunction) {
            symbolMap.set(sym, {text: ' ' + actual.getFullText(), addInline: true});
          } else {
            symbolMap.set(sym, {text: ' ' + actual.getFullText()});
          }
        } else {
          symbolMap.set(sym, {text: '/* TODO #facade */ undefined'});
        }
      });

      const usedSymbols = body ? findUsedSymbols(body) : [];

      // Replace other used symbols
      usedSymbols.forEach((sym: ts.Symbol) => {
        if (formalSymbols.indexOf(sym) !== -1) {
          return;
        }

        // Deconflict identifier if needed
        let iden = sym.name;
        while (tc.getSymbolsInScope(call, ts.SymbolFlags.Variable | ts.SymbolFlags.Alias)
                   .find(x => x.name === iden && x !== sym) ||
               extraVarMap.hasOwnProperty(iden)) {
          iden += '$1';
        }
        if (iden.indexOf('$1') !== -1) {
          iden += ' /* TODO #facade */';
          symbolMap.set(sym, {text: ' ' + iden});
        }
      });

      // Do not process cases requiring indirect inlining
      if (usedSymbols.some(sym => !!getInlineMetadata(sym))) {
        return {global: '', local: '', text: node.getFullText()};
      }

      const global = '';
      const local =
          extraVars.concat(remainingStatements.map(stmt => transformSymbols(stmt, symbolMap)))
              .join('');
      let text = leadingTrivia(call).replace('/**TODO #facade @inline*/', '');
      if (returnExpression) {
        text += transformSymbols(returnExpression, symbolMap);
      } else {
        if (call.parent.kind !== SyntaxKind.ExpressionStatement) {
          text += '(void 0) /* TODO #facade */';
        }
      }

      output += node.getFullText().trim() + '\n';
      output += chalk.gray('=>') + '\n';
      if (local) {
        output += chalk.gray(local) + '\n';
      }
      output += text.trim() + '\n';
      process.stdout.write(output);
      return {global, local, text};
    }
    case 'copy': {
      const call = <ts.CallExpression>node;
      const block = <ts.Block>(<ts.FunctionLikeDeclaration>meta.declaration).body;

      // Do not process cases requiring indirect inlining
      if (findUsedSymbols(block).some(sym => !!getInlineMetadata(sym))) {
        return {global: '', local: '', text: node.getFullText()};
      }
      const global = meta.declaration.getText();  // Without comments specifically =P
      const local = '';
      const text = node.getFullText();
      output += chalk.gray(global) + '\n';
      process.stdout.write(output);
      return {global, local, text};
    }
  }
  return {global: '', local: '', text: node.getFullText()};
}

function insertAndSerialize(childrenText: string[], map: Map<string, number>): string {
  const result: string[] = [];

  childrenText.forEach((text, i) => {
    map.forEach((value, key) => {
      if (value === i) {
        result.push(key);
      }
    });
    result.push(text);
  });

  return result.join('');
}

function findNearest(node: ts.Node, kind: SyntaxKind): ts.Node {
  return _findNearest(node, 0).node;
  function _findNearest(node: ts.Node, depth: number): {node: ts.Node, depth: number} {
    if (node.kind === kind) {
      return {node, depth};
    }
    const children = node.getChildren();
    return _.min(children.map(n => _findNearest(n, depth + 1)).filter(c => !!c.node), c => c.depth);
  }
}

function dfs<T>(
    node: ts.Node, map: (node: ts.Node) => T, reduce: (ts: T[], node: ts.Node) => T): T {
  const children = node.getChildren();
  if (!children.length) {
    return map(node);
  } else {
    return reduce([map(node)].concat(children.map(n => dfs(n, map, reduce))), node);
  }
}

function leadingTrivia(node: ts.Node): string {
  const sourceFile = node.getSourceFile();
  const sourceText = sourceFile ? node.getSourceFile().text : '';
  return sourceText.substr(node.pos, node.getLeadingTriviaWidth());
}

function keys<U, V>(x: Map<U, V>): U[] {
  const ret: U[] = [];
  x.forEach((v, k) => ret.push(k));
  return ret;
}
