'use strict';

const fs = require('fs');

const argv = process.argv.slice(2);

const merged = {};
let out = null;

while (argv.length) {
  const arg = argv.shift();
  if (arg === '--file') {
    const file = argv.shift();
    deepMerge(merged, JSON.parse(fs.readFileSync(file).toString()));
  } else if (arg === '--out') {
    out = argv.shift();
  } else {
    if (merged.files && JSON.parse(arg).files) {
      delete merged.files;
    }
    if (merged.compilerOptions && merged.compilerOptions.paths && JSON.parse(arg).compilerOptions &&
        JSON.parse(arg).compilerOptions.paths) {
      delete merged.compilerOptions.paths;
    }
    deepMerge(merged, JSON.parse(arg));
  }
}

if (out) {
  fs.writeFileSync(out, JSON.stringify(merged, null, 2));
} else {
  console.log(JSON.stringify(merged, null, 2));
}

if (merged.files && merged.exclude) {
  delete merged.exclude;
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

  return x;
}
