/**
 * Checks if a given string satisfies the syntax of a target.
 */
export function looksLikeFullTarget(str: string): boolean {
  if (str === 'build' || str === 'test' || str === 'run') {
    return false;
  }
  return FULL_TARGET_PATTERNS.some(pattern => pattern.test(str));
}

export function isMainWorkspace(target: string): boolean {
  return MAIN_WORKSPACE_PATTERN.test(target);
}

/**
 * Converts a given target to a path relative to cwd.
 */
export function targetToPath(target: string): string {
  if (target.substr(0, '//'.length) === '//') {
    target = target.substr(2);
  }

  if (target[0] === ':') {
    target = target.substr(1);
  }

  return target.replace(':', '/');
}

// Note that //foo/... and :* are not supported yet.
const PACKAGE_PATTERN = /^((@[a-z][a-z0-9_]*)?\/\/)?([a-z][a-z0-9_]*\/)*[a-z][a-z0-9_]*/;
const TARGET_PATTERN = /:([a-zA-Z0-9_\/.+=,@~-]+|)$/;

const FULL_TARGET_PATTERNS = [
  new RegExp(PACKAGE_PATTERN.source + '$'),
  new RegExp('^' + TARGET_PATTERN.source),
  new RegExp(PACKAGE_PATTERN.source + TARGET_PATTERN.source),
];

const MAIN_WORKSPACE_PATTERN = /^\/\//;

export function debounce(fn: Function, delay: number = 200): DebouncedFunction {
  let timeout: number = null;
  const ret = <DebouncedFunction>function debouncer() {
    if (timeout) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(fn.bind(this), delay);
  };

  ret.cancel = function cancel() {
    if (timeout) {
      clearTimeout(timeout);
      timeout = null;
    }
  };

  return ret;
}

export interface DebouncedFunction {
  (...args: any[]): any;
  cancel(): void;
}

/**
 * Find the difference between the two input arrays, considering them as sets of
 * strings.
 */
export function difference(
    oldArray: string[], newArray: string[]): {removed: string[], added: string[]} {
  const newMap: {[key: string]: boolean} = {};
  for (const i of oldArray) {
    newMap[i] = false;
  }

  const added: string[] = [];
  const removed: string[] = [];

  for (const i of newArray) {
    if (!(i in newMap)) {
      added.push(i);
    }
    newMap[i] = true;
  }

  for (const i in newMap) {
    if (!newMap[i]) {
      removed.push(i);
    }
  }

  return {removed, added};
}
