///<reference path="../node_modules/@types/node/index.d.ts"/>
'use strict';
var glob = require('glob');
var chalk = require('chalk');
var assert = require('assert');
var path = require('path');
var fs = require('fs');
var ts = require('typescript');
var typescript_1 = require('typescript');
var _ = require('lodash');
var TARGET_ANNOTATIONS = [/@(inline)\b/, /@(copy)\b/];
var symbolMetaMap = new Map();
var findUsedSymbols = function (n) { return dfs(n, function (n) {
    var sym = tc.getSymbolAtLocation(n);
    return sym && sym.flags & (ts.SymbolFlags.Variable | ts.SymbolFlags.Alias) ? [sym] : [];
}, function (ss) { return _.uniq(_.flatten(ss)); }); };
var topId = 0;
var idMap = new Map();
function getId(sym) {
    if (!idMap.has(sym)) {
        idMap.set(sym, topId++);
    }
    return idMap.get(sym);
}
function stringifySymbol(symbol) {
    var ret = symbol.name + " " + getId(symbol);
    if (symbol.flags & ts.SymbolFlags.Alias) {
        var alias = tc.getAliasedSymbol(symbol);
        ret += " =(" + stringifySymbol(alias) + ")";
    }
    return ret;
}
function print(node, indent) {
    if (indent === void 0) { indent = ''; }
    var out = "" + indent + chalk.green('+ ' + typescript_1.SyntaxKind[node.kind]) + " " + chalk.gray('0x' + node.flags.toString(16)) + " " + node['name'];
    // Symbol referred to
    var sym = tc.getSymbolAtLocation(node);
    if (sym) {
        out += " [" + stringifySymbol(sym) + " " + chalk.gray('0x' + sym.flags.toString(16)) + "]";
    }
    // Symbol table
    var symTable = node.locals;
    if (symTable) {
        out += '\n' + indent +
            chalk.yellow('  Symbol: ' +
                Object.keys(symTable)
                    .map(function (name) {
                    var sym = symTable[name];
                    return sym.name + " " + getId(sym);
                })
                    .join(', '));
    }
    // Type
    // let type = tc.getTypeAtLocation(node);
    // if (type.symbol && type.symbol.valueDeclaration) {
    //   out += ` ${type.symbol.valueDeclaration.getFullText()}`
    // }
    // Source text
    var text = node.getFullText();
    if (1 < text.length && text.length < 40 && text.indexOf('\n') === -1) {
        out += " " + chalk.gray(text);
    }
    // ts.forEachChild(node, x => print(x, indent + '  '));
    node.getChildren().forEach(function (x) { return print(x, indent + '  '); });
}
var countKind = function (node, kind) { return dfs(node, function (n) { return n.kind === kind ? 1 : 0; }, function (xs) { return _.sum(xs); }); };
var countSymbol = function (node, symbol) {
    return dfs(node, function (n) { return tc.getSymbolAtLocation(n) === symbol ? 1 : 0; }, function (xs) { return _.sum(xs); });
};
var INLINABLE = [
    typescript_1.SyntaxKind.PropertyAccessExpression,
    typescript_1.SyntaxKind.ElementAccessExpression,
    typescript_1.SyntaxKind.Identifier,
    typescript_1.SyntaxKind.NumericLiteral,
    typescript_1.SyntaxKind.StringLiteral,
    typescript_1.SyntaxKind.RegularExpressionLiteral,
    typescript_1.SyntaxKind.NoSubstitutionTemplateLiteral,
];
var STATEMENTS = [
    typescript_1.SyntaxKind.VariableStatement,
    typescript_1.SyntaxKind.EmptyStatement,
    typescript_1.SyntaxKind.ExpressionStatement,
    typescript_1.SyntaxKind.IfStatement,
    typescript_1.SyntaxKind.DoStatement,
    typescript_1.SyntaxKind.WhileStatement,
    typescript_1.SyntaxKind.ForStatement,
    typescript_1.SyntaxKind.ForInStatement,
    typescript_1.SyntaxKind.ForOfStatement,
    typescript_1.SyntaxKind.ContinueStatement,
    typescript_1.SyntaxKind.BreakStatement,
    typescript_1.SyntaxKind.ReturnStatement,
    typescript_1.SyntaxKind.WithStatement,
    typescript_1.SyntaxKind.SwitchStatement,
    typescript_1.SyntaxKind.LabeledStatement,
    typescript_1.SyntaxKind.ThrowStatement,
    typescript_1.SyntaxKind.TryStatement,
    typescript_1.SyntaxKind.DebuggerStatement,
];
var argv = require('minimist')(process.argv.slice(2), { string: 'out', boolean: true });
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
var tsOptions = {
    baseUrl: '.',
    paths: {
        '@angular/*': ['modules/@angular/*']
    }
};
var program = ts.createProgram(allFiles, tsOptions, ts.createCompilerHost(tsOptions));
var tc = program.getTypeChecker();
program.getSemanticDiagnostics();
var options = Object.assign({ write: false, removeImports: false }, argv);
var usedPartition = {};
for (var _i = 0, _a = program.getSourceFiles(); _i < _a.length; _i++) {
    var sf = _a[_i];
    if (allFiles.indexOf(sf.fileName) === -1) {
        continue;
    }
    var out = transform(sf).text;
    if (out !== fs.readFileSync(sf.fileName).toString() && options.write) {
        fs.writeFileSync(sf.fileName, out);
    }
    else if (options.out) {
        fs.writeFileSync(options.out, out);
    }
}
function getInlineMetadata(symbol) {
    if (!symbol)
        return null;
    if (symbol.flags & ts.SymbolFlags.Alias) {
        symbol = tc.getAliasedSymbol(symbol);
    }
    var node = symbol.valueDeclaration || (symbol.declarations && symbol.declarations[0]);
    return getInlineMetadataForDeclaration(node);
}
function getInlineMetadataForDeclaration(node) {
    if (!node) {
        return null;
    }
    var symbol = tc.getSymbolAtLocation(node);
    var meta = symbolMetaMap.get(node);
    if (!meta) {
        meta = null;
        var sourceText = node.getSourceFile().text;
        var trivia = sourceText.substr(node.pos, node.getLeadingTriviaWidth());
        for (var _i = 0, TARGET_ANNOTATIONS_1 = TARGET_ANNOTATIONS; _i < TARGET_ANNOTATIONS_1.length; _i++) {
            var annotation = TARGET_ANNOTATIONS_1[_i];
            var _a = annotation.exec(trivia) || [, null, null], strategy = _a[1], data = _a[2];
            if (strategy) {
                meta = { name: symbol && symbol.name || '<symbol>', strategy: strategy, data: data, declaration: node };
                break;
            }
        }
        symbolMetaMap.set(node, meta);
    }
    return meta;
}
function transform(node, checkInline) {
    if (checkInline === void 0) { checkInline = true; }
    var children = node.getChildren();
    if (!children.length) {
        return { global: '', local: '', text: node.getFullText() };
    }
    else {
        if (checkInline) {
            if (node.kind === typescript_1.SyntaxKind.CallExpression) {
                var func = node.expression;
                var sym = tc.getSymbolAtLocation(func);
                // Note that we also handle iffe
                var meta = sym ? getInlineMetadata(sym) : getInlineMetadataForDeclaration(func);
                if (meta) {
                    return doTransform(node, meta);
                }
            }
            else if (options.removeImports && node.kind === typescript_1.SyntaxKind.ImportDeclaration) {
                var importClause = node.importClause;
                if (importClause && importClause.namedBindings &&
                    importClause.namedBindings.kind === typescript_1.SyntaxKind.NamedImports) {
                    var namedImports = importClause.namedBindings;
                    var specifiers = namedImports.elements;
                    // Skip whole import
                    if (specifiers.every(function (specifier) { return !!getInlineMetadata(tc.getSymbolAtLocation(specifier.name)); })) {
                        return { global: '', local: '', text: '' };
                    }
                }
            }
            else if (options.removeImports && node.kind === typescript_1.SyntaxKind.NamedImports) {
                var specifiers = node
                    .elements
                    .filter(function (specifier) { return !getInlineMetadata(tc.getSymbolAtLocation(specifier.name)); })
                    .map(function (sp) { return (sp.propertyName ? sp.propertyName.text.replace(/^___/, '__') + ' as ' :
                    '') +
                    sp.name.text.replace(/^___/, '__'); });
                return { global: '', local: '', text: " {" + specifiers.join(', ') + "} " };
            }
            else if (node.kind === typescript_1.SyntaxKind.PrefixUnaryExpression) {
                // For !sth(), add parenthesis between substituted sth
                var _a = transform(children[1]), global_1 = _a.global, local = _a.local, text = _a.text;
                if (text !== children[1].getFullText()) {
                    return { global: global_1, local: local, text: children[0].getFullText() + '(' + text + ')' };
                }
                else {
                    return { global: global_1, local: local, text: children[0].getFullText() + text };
                }
            }
        }
        var globals_1 = new Map();
        var locals_1 = new Map();
        var childrenText_1 = [];
        children.forEach(function (n, i) {
            var result = transform(n, checkInline);
            if (result.global) {
                if (!globals_1.has(result.global)) {
                    globals_1.set(result.global, i);
                }
            }
            if (result.local) {
                if (!locals_1.has(result.local)) {
                    locals_1.set(result.local, i);
                }
            }
            childrenText_1.push(result.text);
        });
        if (node.kind === typescript_1.SyntaxKind.SyntaxList &&
            node.getChildren().some(function (x) { return STATEMENTS.indexOf(x.kind) !== -1; })) {
            // Insert local at inter-statement level
            return {
                global: keys(globals_1).join(''),
                local: '',
                text: insertAndSerialize(childrenText_1, locals_1)
            };
        }
        else if (node.kind === typescript_1.SyntaxKind.SyntaxList && node.parent.kind === typescript_1.SyntaxKind.SourceFile) {
            // Insert global at source file level
            locals_1.forEach(function (v, k) {
                if (!globals_1.has(k)) {
                    globals_1.set(k, v);
                }
            });
            return { global: '', local: '', text: insertAndSerialize(childrenText_1, globals_1) };
        }
        else {
            // Propagate everything
            return {
                global: keys(globals_1).join(''),
                local: keys(locals_1).join(''),
                text: childrenText_1.join('')
            };
        }
    }
}
// Emit a tree of nodes while renaming symbols
function transformSymbols(node, map) {
    var children = node.getChildren();
    var transformed = children.map(function (n) { return transformSymbols(n, map); });
    if (node.kind === typescript_1.SyntaxKind.CallExpression) {
        if (!transformed[0].trim().match(/^[_a-zA-Z$0-9]+$/) && transformed[0].indexOf('=>') !== -1) {
            return '/**TODO #facade @inline*/ (' + transformed[0] + ' )' + transformed.slice(1).join('');
        }
    }
    else if (node.kind === typescript_1.SyntaxKind.Identifier) {
        var sym = tc.getSymbolAtLocation(node);
        return map.get(sym) && map.get(sym).text || node.getFullText();
    }
    if (!children.length) {
        return node.getFullText();
    }
    else {
        return transformed.join('');
    }
}
function createMessage(node, message) {
    var sourceFile = node.getSourceFile();
    var position;
    if (sourceFile) {
        var _a = sourceFile.getLineAndCharacterOfPosition(node.getStart()), line = _a.line, character = _a.character;
        var fileName = path.relative(cwd, sourceFile.fileName);
        position = fileName + "(" + (line + 1) + "," + (character + 1) + ")";
    }
    else {
        position = '<unknown>';
    }
    return chalk.bold(chalk.yellow(position + ": " + message));
}
function doTransform(node, meta) {
    var output = '';
    output += createMessage(node, meta.strategy + ' ' + meta.name) + '\n';
    switch (meta.strategy) {
        case 'inline': {
            var call_1 = node;
            var declaration = meta.declaration;
            while (declaration.kind === typescript_1.SyntaxKind.ParenthesizedExpression) {
                declaration = declaration.expression;
            }
            var body_1 = declaration.body;
            var returnExpression = null;
            var remainingStatements = [];
            if (body_1) {
                if (body_1.kind === typescript_1.SyntaxKind.Block) {
                    var statements = body_1.statements;
                    returnExpression = statements[statements.length - 1] &&
                        statements[statements.length - 1].kind === typescript_1.SyntaxKind.ReturnStatement ?
                        statements[statements.length - 1].expression :
                        null;
                    remainingStatements = returnExpression ? statements.slice(0, -1) : statements;
                }
                else {
                    returnExpression = body_1;
                    console.log(returnExpression.getFullText());
                }
                if (countKind(body_1, typescript_1.SyntaxKind.ReturnStatement) > 1) {
                    output += 'Node has more than one return statement, ignoring\n';
                    output += chalk.gray(call_1.getFullText().trim()) + '\n';
                    return { global: '', local: '', text: call_1.getFullText() };
                }
            }
            var actuals_1 = call_1.arguments;
            var formals = declaration.parameters || [];
            var extraVars_1 = [];
            var extraVarMap_1 = {};
            var symbolMap_1 = new Map();
            var formalSymbols_1 = [];
            formals.forEach(function (formal, i) {
                var sym = tc.getSymbolAtLocation(formal.name);
                formalSymbols_1.push(sym);
                var uses = body_1 ? countSymbol(body_1, sym) : 0;
                var actual = actuals_1[i];
                // Replace formal with actual parameters
                if (actual) {
                    if (uses > 1 && INLINABLE.indexOf(actual.kind) === -1) {
                        assert(formal.name.kind === typescript_1.SyntaxKind.Identifier);
                        // Generate identifier with deconflicting
                        var iden_1 = formal.name.text;
                        while (tc.getSymbolsInScope(call_1, ts.SymbolFlags.Variable).find(function (x) { return x.name === iden_1; })) {
                            iden_1 += '$1';
                        }
                        if (iden_1.indexOf('$1') !== -1) {
                            iden_1 += ' /* TODO #facade */';
                        }
                        extraVarMap_1[iden_1] = true;
                        output += chalk.green("Generating extra identifier " + iden_1) + '\n';
                        extraVars_1.push("const " + iden_1 + " = " + actual.getFullText() + ";");
                        symbolMap_1.set(sym, { text: ' ' + iden_1 });
                    }
                    else if (actual.kind === typescript_1.SyntaxKind.ArrowFunction) {
                        symbolMap_1.set(sym, { text: ' ' + actual.getFullText(), addInline: true });
                    }
                    else {
                        symbolMap_1.set(sym, { text: ' ' + actual.getFullText() });
                    }
                }
                else {
                    symbolMap_1.set(sym, { text: '/* TODO #facade */ undefined' });
                }
            });
            var usedSymbols = body_1 ? findUsedSymbols(body_1) : [];
            // Replace other used symbols
            usedSymbols.forEach(function (sym) {
                if (formalSymbols_1.indexOf(sym) !== -1) {
                    return;
                }
                // Deconflict identifier if needed
                var iden = sym.name;
                while (tc.getSymbolsInScope(call_1, ts.SymbolFlags.Variable | ts.SymbolFlags.Alias)
                    .find(function (x) { return x.name === iden && x !== sym; }) ||
                    extraVarMap_1.hasOwnProperty(iden)) {
                    iden += '$1';
                }
                if (iden.indexOf('$1') !== -1) {
                    iden += ' /* TODO #facade */';
                    symbolMap_1.set(sym, { text: ' ' + iden });
                }
            });
            // Do not process cases requiring indirect inlining
            if (usedSymbols.some(function (sym) { return !!getInlineMetadata(sym); })) {
                return { global: '', local: '', text: node.getFullText() };
            }
            var global_2 = '';
            var local = extraVars_1.concat(remainingStatements.map(function (stmt) { return transformSymbols(stmt, symbolMap_1); }))
                .join('');
            var text = leadingTrivia(call_1).replace('/**TODO #facade @inline*/', '');
            if (returnExpression) {
                text += transformSymbols(returnExpression, symbolMap_1);
            }
            else {
                if (call_1.parent.kind !== typescript_1.SyntaxKind.ExpressionStatement) {
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
            return { global: global_2, local: local, text: text };
        }
        case 'copy': {
            var call = node;
            var block = meta.declaration.body;
            // Do not process cases requiring indirect inlining
            if (findUsedSymbols(block).some(function (sym) { return !!getInlineMetadata(sym); })) {
                return { global: '', local: '', text: node.getFullText() };
            }
            var global_3 = meta.declaration.getText(); // Without comments specifically =P
            var local = '';
            var text = node.getFullText();
            output += chalk.gray(global_3) + '\n';
            process.stdout.write(output);
            return { global: global_3, local: local, text: text };
        }
    }
    return { global: '', local: '', text: node.getFullText() };
}
function insertAndSerialize(childrenText, map) {
    var result = [];
    childrenText.forEach(function (text, i) {
        map.forEach(function (value, key) {
            if (value === i) {
                result.push(key);
            }
        });
        result.push(text);
    });
    return result.join('');
}
function findNearest(node, kind) {
    return _findNearest(node, 0).node;
    function _findNearest(node, depth) {
        if (node.kind === kind) {
            return { node: node, depth: depth };
        }
        var children = node.getChildren();
        return _.min(children.map(function (n) { return _findNearest(n, depth + 1); }).filter(function (c) { return !!c.node; }), function (c) { return c.depth; });
    }
}
function dfs(node, map, reduce) {
    var children = node.getChildren();
    if (!children.length) {
        return map(node);
    }
    else {
        return reduce([map(node)].concat(children.map(function (n) { return dfs(n, map, reduce); })), node);
    }
}
function leadingTrivia(node) {
    var sourceFile = node.getSourceFile();
    var sourceText = sourceFile ? node.getSourceFile().text : '';
    return sourceText.substr(node.pos, node.getLeadingTriviaWidth());
}
function keys(x) {
    var ret = [];
    x.forEach(function (v, k) { return ret.push(k); });
    return ret;
}
