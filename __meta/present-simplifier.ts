///<reference path="../node_modules/@types/node/index.d.ts"/>
'use strict';

declare var require: any;
var glob = require('glob');
var chalk = require('chalk');

import * as path from 'path';
import * as fs from 'fs';
import * as ts from 'typescript';
import {SyntaxKind} from 'typescript';

const simplifyMap = {
  truthiness: {isPresent: x => `${x}`, isBlank: x => `!${x}`},
};
let total = 0;
let tally = {
  object: 0,
  any: 0,
  union: 0,
  primitive: 0,
};

const argv = require('minimist')(process.argv.slice(2), {boolean: true});

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

const program = ts.createProgram(allFiles, {}, ts.createCompilerHost({}));
const tc = program.getTypeChecker();
program.getSemanticDiagnostics();

const options = (<any>Object).assign({write: false}, argv);

for (const sf of program.getSourceFiles()) {
  if (allFiles.indexOf(sf.fileName) === -1 || sf.fileName.indexOf('facade') !== -1) {
    continue;
  }

  const out = stringify(sf);
  if (stringify(sf) !== fs.readFileSync(sf.fileName).toString() && options.write) {
    fs.writeFileSync(sf.fileName, out);
  }
}

console.log(`total: ${total}`);
for (const key of Object.keys(tally)) {
  console.log(`${key}: ${tally[key]}`);
}

function stringify(node: ts.Node) {
  const children = node.getChildren();
  const fileName = node.getSourceFile().fileName;
  const segments = path.relative(cwd, fileName).split('/');

  if (children.length) {
    const body = children.map(stringify).join('');
    if (node.kind === SyntaxKind.BinaryExpression) {
      const bin = <ts.BinaryExpression>node;
      if (bin.left.kind === SyntaxKind.BinaryExpression &&
          bin.right.kind === SyntaxKind.BinaryExpression) {
        const left = <ts.BinaryExpression>bin.left;
        const right = <ts.BinaryExpression>bin.right;
        // console.log(bin.getFullText(), left.right.getFullText().trim(), right.right.getFullText().trim());
        if (left.right.getFullText().trim() === 'undefined' &&
            right.right.getFullText().trim() === 'null' &&
            left.left.getFullText().trim() === right.left.getFullText().trim() &&
            left.operatorToken.kind === right.operatorToken.kind) {
          if (bin.operatorToken.kind === SyntaxKind.AmpersandAmpersandToken &&
              left.operatorToken.kind === SyntaxKind.ExclamationEqualsEqualsToken) {
            // obj !== undefined && obj !== null
            const simplified = simplify(left.left, 'isPresent', bin.getFullText());
            if (simplified) {
              return simplified;
            }
          } else if (
              bin.operatorToken.kind === SyntaxKind.BarBarToken &&
              left.operatorToken.kind === SyntaxKind.EqualsEqualsEqualsToken) {
            // obj === undefined || obj === null
            const simplified = simplify(left.left, 'isBlank', bin.getFullText());
            if (simplified) {
              return simplified;
            }
          }
        }
      }
    }
    return body;
  } else {
    return node.getFullText();
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

function formatType(type: ts.Type): string {
  let str = '';

  const writeText: (text: string) => void = text => str += text;
  const writer = {
    string: () => str,
      writeKeyword: writeText,
    writeOperator: writeText,
    writePunctuation: writeText,
    writeSpace: writeText,
    writeStringLiteral: writeText,
    writeParameter: writeText,
    writeSymbol: writeText,

    // Completely ignore indentation for string writers.  And map newlines to
    // a single space.
    writeLine: () => str += " ",
      increaseIndent: () => { },
      decreaseIndent: () => { },
      clear: () => str = "",
      trackSymbol: () => { },
      reportInaccessibleThisError: () => { }
  };
  tc.getSymbolDisplayBuilder().buildTypeDisplay(type, writer);

  return writer.string();
}

function simplify(node: ts.Node, mode: string, expr: string): string {
  total += 1;
  const text = node.getFullText();
  const objType = tc.getTypeAtLocation(node);
  console.log(createMessage(node, `${mode}(${formatType(objType)})`));
  if (objType.flags & ts.TypeFlags.Any) {
    tally.any += 1;
    console.log(chalk.gray('any type ignored'));
    return null;
  }

  if (objType.flags & ts.TypeFlags.Union) {
    console.log(chalk.gray('union type ignored'));
    tally.union += 1;
    return null;
  }

  if (objType.flags & ts.TypeFlags.ObjectType) {
    const ret = simplifyMap.truthiness[mode](text);
    console.log(expr.trim(), chalk.gray('=>'), ret.trim());
    tally.object += 1;
    return ret;
  }

  console.log(chalk.gray('primitive type ignored'));
  tally.primitive += 1;
  return null;
}
