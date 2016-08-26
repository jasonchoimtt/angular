///<reference path="../node_modules/@types/node/index.d.ts"/>
'use strict';
var glob = require('glob');
var chalk = require('chalk');
var path = require('path');
var fs = require('fs');
var ts = require('typescript');
var argv = require('minimist')(process.argv.slice(2), { boolean: true });
var cwd = process.cwd();
if (!fs.existsSync('modules')) {
    throw new Error('Incorrect cwd!');
}
if (!argv._.length) {
    throw new Error('No glob given!');
}
var allFiles = argv._.map(function (x) { return glob.sync(x); })
    .reduce(function (x, y) { return x.concat(y); }, [])
    .map(function (x) { return path.resolve(x); });
var program = ts.createProgram(allFiles, {}, ts.createCompilerHost({}, true));
program.getTypeChecker();
program.getSemanticDiagnostics();
var options = Object
    .assign({
    dropMainInTests: false,
    callMainInTests: false,
    rewritePackageFacade: false,
    rewriteFacadeInTests: false,
    rewritePackage: false,
    rewritePartitionInTests: false,
    printUses: false,
    write: false
}, argv);
var usedPartition = {};
for (var _i = 0, _a = program.getSourceFiles(); _i < _a.length; _i++) {
    var sf = _a[_i];
    if (allFiles.indexOf(sf.fileName) === -1) {
        continue;
    }
    var out = stringify(sf);
    if (options.callMainInTests && out.indexOf('function main') !== -1) {
        out += '\nmain();\n';
    }
    if (out !== fs.readFileSync(sf.fileName).toString() && options.write) {
        fs.writeFileSync(sf.fileName, out);
    }
}
if (options.printUses) {
    for (var _b = 0, _c = Object.keys(usedPartition); _b < _c.length; _b++) {
        var used = _c[_b];
        console.log('[USED]', used);
    }
}
function stringify(node) {
    var children = node.getChildren();
    var fileName = node.getSourceFile().fileName;
    var segments = path.relative(cwd, fileName).split('/');
    if (children.length) {
        var body = children.map(stringify).join('');
        if (options.dropMainInTests && fileName.match(/[_.]spec\.ts$/) &&
            node.kind === ts.SyntaxKind.FunctionDeclaration && node.name.text === 'main') {
            console.log('Dropping main in ' + fileName);
            return '\n' +
                node.getChildren()
                    .filter(function (x) { return x.kind === ts.SyntaxKind.Block; })
                    .map(function (block) {
                    var body = block.statements.map(stringify).join('');
                    return body.split('\n')
                        .map(function (line) {
                        if (line.substr(0, 2) === '  ') {
                            return line.substr(2);
                        }
                        else {
                            return line;
                        }
                    })
                        .join('\n');
                })
                    .join('');
        }
        return body;
    }
    else {
        if (node.kind === ts.SyntaxKind.StringLiteral) {
            if (node.parent.kind === ts.SyntaxKind.ImportDeclaration) {
                var text_1 = node.text;
                var print_1 = function print(tag) {
                    console.log("[" + tag + "] " + chalk.blue(fileName) + ": " + chalk.yellow(text_1) + " => " + chalk.green(changed_1));
                };
                var changed_1 = text_1;
                if (text_1[0] === '.') {
                    var resolved = path.relative(cwd, path.resolve(path.dirname(fileName), text_1)).split('/');
                    if (process.env.DEBUG) {
                        console.log();
                        console.log('from   ' + segments.join('/'));
                        console.log('import ' + resolved.join('/'));
                        console.log('using  ' + text_1);
                    }
                    if (resolved[1] === '@angular') {
                        if (resolved[2] !== segments[2]) {
                            if (options.rewritePackage) {
                                changed_1 = resolved.slice(1).join('/');
                                print_1('XPKG');
                            }
                            usedPartition[resolved.slice(1, 4).join('/')] = true;
                        }
                        else if (segments[3] === 'test' && resolved[3] !== 'test') {
                            if ((segments[3] === 'test' || segments[3] === 'testing_internal') &&
                                resolved[3] === 'src' && resolved[4] === 'facade') {
                                if (options.rewriteFacadeInTests) {
                                    changed_1 = '@angular/facade/src/' + resolved.slice(5).join('/');
                                    print_1('FACD');
                                }
                            }
                            else {
                                if (options.rewritePartitionInTests) {
                                    changed_1 = resolved.slice(1).join('/');
                                    print_1('XPRT');
                                }
                                usedPartition[resolved.slice(1, 4).join('/')] = true;
                            }
                        }
                    }
                }
                else if (text_1[0] === '@') {
                    var resolved = ['modules'].concat(text_1.split('/'));
                    usedPartition[resolved.slice(1, 4).join('/')] = true;
                    if (options.rewritePackageFacade && resolved[1] === '@angular' &&
                        resolved[4] === 'facade') {
                        if (options.rewriteFacadeInTests) {
                            changed_1 = '@angular/facade/src/' + resolved.slice(5).join('/');
                            print_1('XFAC');
                        }
                        else {
                            changed_1 = path.relative(fileName, ("modules/@angular/" + segments[2] + "/") + resolved.slice(3).join('/'));
                            print_1('XFAC');
                        }
                    }
                }
                if (changed_1 !== text_1) {
                    return node.getFullText().replace(text_1, changed_1);
                }
            }
        }
        return node.getFullText();
    }
}
