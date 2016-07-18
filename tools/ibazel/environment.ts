import * as assert from 'assert';
import * as child_process from 'child_process';

const chokidar = require('chokidar');

/**
 * Name of the bazel binary.
 */
export const BAZEL = 'bazel';

/**
 * Our name.
 */
export const IBAZEL = 'ibazel';

/**
 * Encapsulates the execution environment of ibazel.
 */
export interface IBazelEnvironment {
  /**
   * Runs the specified bazel command.
   */
  execute(argv: string[], options?: {inheritStdio?: boolean}): BazelResult;
  /**
   * Gets bazel info.
   */
  info(): BazelInfo;
  /**
   * Queries the build files (analysis stage) of the specified targets.
   */
  queryBuildFiles(targets: string[]): string[];
  /**
   * Queries the source files of the specified targets.
   */
  querySourceFiles(targets: string[]): string[];
  /**
   * Gets a map of command-line flag to boolean indicating whether it is a
   * boolean flag.
   * e.g.{'--foo': true} means --foo does not take any argument
   */
  getFlags(): {[option: string]: boolean};
  /**
   * Gets the current working directory of the process.
   */
  cwd(): string;
  /**
   * Creates a file watcher that triggers callback on file changes.
   */
  createWatcher(callback: () => void, options?: any): FileWatcher;
}

export interface BazelInfo { ['workspace']: string; }

export const REQUIRED_INFO_KEYS = ['workspace'];

export interface BazelResult {
  stdout: string;
  status: number;
}

export interface FileWatcher {
  add(paths: string[]): void;
  unwatch(paths: string[]): void;
  close(): void;
}

export class ProcessIBazelEnvironment implements IBazelEnvironment {
  execute(argv: string[], {inheritStdio = false} = {}): BazelResult {
    const outMode = inheritStdio ? 'inherit' : 'pipe';
    const result = child_process.spawnSync(BAZEL, argv, {stdio: ['ignore', outMode, 'inherit']});

    return {stdout: result.stdout ? result.stdout.toString() : null, status: result.status};
  }

  info() {
    const result = this.execute(['info']);
    assert(!result.status, `${IBAZEL}: "${BAZEL} info" exited with status ${result.status}\n`);

    const ret: any = {};
    for (const line of result.stdout.split('\n').slice(0, -1)) {
      const [key, value] = line.split(': ');
      ret[key] = value;
    }
    for (const key of REQUIRED_INFO_KEYS) {
      assert(ret[key], `${IBAZEL}: "${BAZEL} info" did not provide required key "${key}"`);
    }
    return ret;
  }

  queryBuildFiles(targets: string[]): string[] {
    const result = this.execute(['query', `buildfiles(deps(set(${targets.join(' ')})))`]);
    assert(!result.status, `${IBAZEL}: "${BAZEL} query" exited with status ${result.status}`);

    return result.stdout.split('\n').slice(0, -1).sort();
  }

  querySourceFiles(targets: string[]): string[] {
    const result = this.execute(['query', `kind("source file", deps(set(${targets.join(' ')})))`]);
    assert(!result.status, `${IBAZEL}: "${BAZEL} query" exited with status ${result.status}`);

    return result.stdout.split('\n').slice(0, -1).sort();
  }

  getFlags(): {[option: string]: boolean} {
    const result = this.execute(['help', 'completion']);
    assert(
        !result.status,
        `${IBAZEL}: "${BAZEL} help completion" exited with status ${result.status}`);

    const ret: {[option: string]: boolean} = {};

    const flags = result.stdout.split('\n').slice(0, -1).filter(line => line[0] === '-');

    for (const flag of flags) {
      const [, key, hasArg] = /^(-[^=]+)(=?)/.exec(flag);
      ret[key] = !hasArg;
    }

    // These single-character flags can be found in "bazel help build"
    ret['-c'] = false;
    ret['-j'] = false;
    ret['-k'] = true;
    ret['-t'] = true;
    ret['-s'] = true;

    return ret;
  }

  cwd(): string { return process.cwd(); }

  createWatcher(callback: Function, options: any = {}): FileWatcher {
    const chokidorFlags =
        Object.assign({}, options, {events: ['change', 'unlink'], ignoreInitial: true});
    const watcher = chokidar.watch([], chokidorFlags);

    watcher.on('all', callback);

    return watcher;
  }
}
