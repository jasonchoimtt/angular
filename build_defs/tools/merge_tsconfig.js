'use strict';

const fs = require('fs');
const ts = require('typescript');

const argv = process.argv.slice(2);

const merged = {};
let out = null;

while (argv.length) {
  const arg = argv.shift();
  if (arg === '--file') {
    const file = argv.shift();
    merge(merged, parse(file, fs.readFileSync(file).toString()));
  } else if (arg === '--out') {
    out = argv.shift();
  } else {
    merge(merged, parse(/* filename */ '<input argument>', arg));
  }
}

if (merged.files && merged.exclude) {
  delete merged.exclude;
}

if (out) {
  fs.writeFileSync(out, JSON.stringify(merged, null, 2));
} else {
  console.log(JSON.stringify(merged, null, 2));
}

function merge(merged, next) {
  if (merged.files && next.files) {
    delete merged.files;
  }
  if (merged.compilerOptions && next.compilerOptions) {
    if (merged.compilerOptions.paths && next.compilerOptions.paths) {
      delete merged.compilerOptions.paths;
    }
  }
  deepMerge(merged, next);
}

function deepMerge(x, y) {
  if (Array.isArray(x) && Array.isArray(y)) {
    for (const i of y) {
      if (x.indexOf(i) === -1) {
        x.push(i);
      }
    }
  } else {
    for (const key in x) {
      if (key in y) {
        if (typeof x[key] === 'object' && typeof y[key] === 'object') {
          deepMerge(x[key], y[key]);
        } else {
          x[key] = y[key];
        }
      }
    }

    for (const key in y) {
      if (!(key in x)) {
        x[key] = y[key];
      }
    }
  }
}

function parse(fileName, jsonText) {
  // This parses a JSON-ish file with comments.
  const result = ts.parseConfigFileTextToJson(fileName, jsonText);

  if (result.error) {
    throw new Error(result.error.messageText);
  }

  return result.config;
}
