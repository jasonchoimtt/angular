///<reference path="../node_modules/@types/node/index.d.ts"/>
'use strict';

declare var require: any;
var glob = require('glob');
var chalk = require('chalk');

import * as path from 'path';
import * as fs from 'fs';
import * as ts from 'typescript';

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
program.getTypeChecker();
program.getSemanticDiagnostics();

const options = (<any>Object)
                    .assign(
                        {
                          dropMainInTests: false,
                          rewritePackageFacade: false,
                          rewriteFacadeInTests: false,
                          rewritePackage: false,
                          rewritePartitionInTests: false,
                          printUses: false,
                          write: false,
                        },
                        argv);

const usedPartition: {[key: string]: boolean} = {};

for (const sf of program.getSourceFiles()) {
  if (allFiles.indexOf(sf.fileName) === -1) {
    continue;
  }

  const out = stringify(sf);
  if (stringify(sf) !== fs.readFileSync(sf.fileName).toString() && options.write) {
    fs.writeFileSync(sf.fileName, out);
  }
}

if (options.printUses) {
  for (const used of Object.keys(usedPartition)) {
    console.log('[USED]', used);
  }
}

function stringify(node: ts.Node) {
  const children = node.getChildren();
  const fileName = node.getSourceFile().fileName;
  const segments = path.relative(cwd, fileName).split('/');

  if (children.length) {
    const body = children.map(stringify).join('');
    if (options.dropMainInTests && fileName.match(/[_.]spec\.ts$/) &&
        node.kind === ts.SyntaxKind.FunctionDeclaration && (<any>node).name.text === 'main') {
      console.log('Dropping main in ' + fileName);
      return '\n' +
          node.getChildren()
              .filter(x => x.kind === ts.SyntaxKind.Block)
              .map((block: ts.Block) => {
                const body = block.statements.map(stringify).join('');
                return body.split('\n')
                    .map(line => {
                      if (line.substr(0, 2) === '  ') {
                        return line.substr(2);
                      } else {
                        return line;
                      }
                    })
                    .join('\n');
              })
              .join('');
    }
    return body;

  } else {
    if (node.kind === ts.SyntaxKind.StringLiteral) {
      if (node.parent.kind === ts.SyntaxKind.ImportDeclaration) {
        const text = (<any>node).text;

        const print = function print(tag: string) {
          console.log(
              `[${tag}] ${chalk.blue(fileName)}: ${chalk.yellow(text)} => ${chalk.green(changed)}`);
        };

        let changed = text;
        if (text[0] === '.') {
          const resolved =
              path.relative(cwd, path.resolve(path.dirname(fileName), text)).split('/');

          if (process.env.DEBUG) {
            console.log();
            console.log('from   ' + segments.join('/'));
            console.log('import ' + resolved.join('/'));
            console.log('using  ' + text);
          }

          if (resolved[1] === '@angular') {
            if (resolved[2] !== segments[2]) {
              if (options.rewritePackage) {
                changed = resolved.slice(1).join('/');
                print('XPKG');
              }
              usedPartition[resolved.slice(1, 4).join('/')] = true;
            } else if (segments[3] === 'test' && resolved[3] !== 'test') {
              if ((segments[3] === 'test' || segments[3] === 'testing_internal') &&
                  resolved[3] === 'src' && resolved[4] === 'facade') {
                if (options.rewriteFacadeInTests) {
                  changed = '@angular/facade/src/' + resolved.slice(5).join('/');
                  print('FACD');
                }
              } else {
                if (options.rewritePartitionInTests) {
                  changed = resolved.slice(1).join('/');
                  print('XPRT');
                }
                usedPartition[resolved.slice(1, 4).join('/')] = true;
              }
            }
          }
        } else if (text[0] === '@') {
          const resolved = ['modules'].concat(text.split('/'));
          usedPartition[resolved.slice(1, 4).join('/')] = true;
          if (options.rewritePackageFacade && resolved[1] === '@angular' &&
              resolved[4] === 'facade') {
            if (options.rewriteFacadeInTests) {
              changed = '@angular/facade/src/' + resolved.slice(5).join('/');
              print('XFAC');
            } else {
              changed = path.relative(
                  fileName, `modules/@angular/${segments[2]}/` + resolved.slice(3).join('/'));
              print('XFAC');
            }
          }
        }

        if (changed !== text) {
          return node.getFullText().replace(text, changed);
        }
      }
    }

    return node.getFullText();
  }
}
