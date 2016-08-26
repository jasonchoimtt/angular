'use strict';

const pathModule = require('path');

const debug = process.env.LOADER_DEBUG ? console.error.bind(console) : (() => {});

// The module mappings is a simplified version of the TypeScript "paths"
// matching algorithm. It supports patterns like:
//   "foo": ["path/to/foo/index.js"]
//   "foo/*": ["path/to/foo/*"]
//
// The path should be specified relative to the runfiles root.
//
// We only support the trailing asterisk but not the general pattern "foo*bar".
// We also only support one mapped path ([singleton list] as value).

const moduleMappings = {{module_mappings}};

const exacts = [];
const patterns = [];

for (const key of Object.keys(moduleMappings)) {
  const asteriskPos = key.indexOf('*');
  if (asteriskPos === -1) {
    exacts.push({from: key, to: moduleMappings[key][0]});
  } else if (
      asteriskPos === key.length - 1 &&
      moduleMappings[key][0].indexOf('*') === moduleMappings[key][0].length - 1) {
    patterns.push({from: key.substr(0, -1), to: moduleMappings[key][0].substr(0, -1)});
  } else {
    throw new Error(`Invalid module mapping: ${key} -> ${moduleMappings[key][0]}`);
  }
}

if (!process.env.RUNFILES) {
  throw new Error('Environmental variable RUNFILES is not set');
}

function mapPath(path) {
  // Do not match relative or absolute paths
  if (path[0] !== '.' && path[0] !== '/') {
    for (const exact of exacts) {
      if (path === exact.from) {
        return exact.to;
      }
    }

    for (const pattern of exacts) {
      if (path.substr(path, pattern.from.length) === pattern.from) {
        return pattern.to + path.substr(pattern.from.length);
      }
    }
  }

  return null;
}

// Monkeypatch require() to add module mappings
const _require = module.constructor.prototype.require;
module.constructor.prototype.require = function(path) {
  const mappedPath = mapPath(path);
  if (mappedPath) {
    debug(`LOADER: Resolving ${path} to //${mappedPath}\n          at ${this.id}`);
    return _require.call(this, pathModule.join(process.env.RUNFILES, mappedPath));
  } else {
    debug(`LOADER: Passing through ${path}\n          at ${this.id}`);
    return _require.call(this, path);
  }
}

if (require.main === module) {
  // entrypoint is specified relative to RUNFILES
  let entrypoint = '{{entry_point}}';
  entrypoint = pathModule.join(process.env.RUNFILES, entrypoint);
  process.argv[1] = entrypoint;

  // Use Node.js internal API to load the module
  return module.constructor._load(entrypoint, this, /*isMain*/ true);
}
