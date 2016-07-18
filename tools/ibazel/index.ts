#!/usr/bin/env node

///<reference path="../../node_modules/@types/node/index.d.ts"/>

'use strict';

import * as path from 'path';

import {BazelInfo, BAZEL, FileWatcher, IBazelEnvironment, ProcessIBazelEnvironment} from './environment';
import {parse} from './parser';
import {debounce, difference, isMainWorkspace, targetToPath} from './utils';

export class IBazel {
  private env: IBazelEnvironment;

  private info: BazelInfo;
  /** Current directory relative to the workspace. */
  private cwd: string;
  private command: string[];
  private targets: string[];

  private buildWatcher: FileWatcher;
  private sourceWatcher: FileWatcher;
  private shouldReconfigure: boolean;
  private dependencies: BazelDependencies;

  constructor(env: IBazelEnvironment) { this.env = env; }

  start(argv: string[]) {
    this.info = this.env.info();

    this.cwd = path.relative(this.info.workspace, this.env.cwd());

    const parseResult = parse(this.env, argv);
    this.command = parseResult.command;
    this.targets = parseResult.targets;

    const watcherOptions = {cwd: this.info.workspace};
    this.buildWatcher = this.env.createWatcher(() => this.triggerReconfigure(), watcherOptions);
    this.sourceWatcher = this.env.createWatcher(() => this.triggerRun(), watcherOptions);
    this.shouldReconfigure = false;
    this.dependencies = {buildFiles: [], sourceFiles: []};

    this.reconfigure();
  }

  stop() {
    this.buildWatcher.close();
    this.sourceWatcher.close();
    this.triggerRun.cancel();
  }

  /** @internal */
  private reconfigure() {
    const newDependencies = {
      buildFiles: this.env.queryBuildFiles(this.targets),
      sourceFiles: this.env.querySourceFiles(this.targets)
    }

    // Hopefully there will not be a race condition after query and before watch

    const buildDiff = difference(this.dependencies.buildFiles, newDependencies.buildFiles);
    this.buildWatcher.unwatch(buildDiff.removed.filter(isMainWorkspace).map(targetToPath));
    this.buildWatcher.add(buildDiff.added.filter(isMainWorkspace).map(targetToPath));

    const sourceDiff = difference(this.dependencies.sourceFiles, newDependencies.sourceFiles);
    this.sourceWatcher.unwatch(sourceDiff.removed.filter(isMainWorkspace).map(targetToPath));
    this.sourceWatcher.add(sourceDiff.added.filter(isMainWorkspace).map(targetToPath));

    this.dependencies = newDependencies;

    // TODO: review if we need to use debounced trigger here
    this.run();
  }

  /** @internal */
  private run() { this.env.execute(this.command, {inheritStdio: true}); }

  /** @internal */
  private triggerReconfigure() {
    this.shouldReconfigure = true;
    this.triggerRun();
  }

  /** @internal */
  private triggerRun = debounce(function triggerRun() {
    if (this.shouldReconfigure) {
      this.reconfigure();
    } else {
      this.run();
    }
    this.shouldReconfigure = false;
  });
}

export interface BazelDependencies {
  buildFiles: string[];
  sourceFiles: string[];
}

if (require.main === module) {
  new IBazel(new ProcessIBazelEnvironment()).start(process.argv.slice(2));
}
