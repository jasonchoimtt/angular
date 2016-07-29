import {ChildProcess} from 'child_process';

import {FileWatcher, IBazelEnvironment} from './environment';
import {createMockIBazelEnvironment} from './environment_mock';
import {IBazel} from './index';

describe('IBazel', () => {
  beforeEach(() => { jasmine.clock().install(); });
  afterEach(() => { jasmine.clock().uninstall(); });

  it('should watch build files', () => {
    const env = createMockIBazelEnvironment(
        {queryBuildFiles: () => ['//build_defs:build_defs.bzl', '//:BUILD']});
    const ibazel: IBazelWithPrivates = <any>new IBazel(env);
    ibazel.start([]);

    expect(ibazel.buildWatcher.add).toHaveBeenCalledWith(jasmine.arrayContaining([
      'build_defs/build_defs.bzl', 'BUILD'
    ]));
  });

  it('should watch source files', () => {
    const env = createMockIBazelEnvironment(
        {querySourceFiles: () => ['//:index.ts', '//subdir:included.ts']});
    const ibazel: IBazelWithPrivates = <any>new IBazel(env);
    ibazel.start([]);

    expect(ibazel.sourceWatcher.add).toHaveBeenCalledWith(jasmine.arrayContaining([
      'index.ts', 'subdir/included.ts'
    ]));
  });

  it('should not watch external workspaces', () => {
    const env = createMockIBazelEnvironment(
        {queryBuildFiles: () => ['@nodejs//:node', '@bazel_tools//genrule:genrule-setup.sh']});
    const ibazel: IBazelWithPrivates = <any>new IBazel(env);
    ibazel.start([]);

    expect(ibazel.buildWatcher.add).toHaveBeenCalledWith([]);
  });

  it('should trigger initial run', () => {
    const env = createMockIBazelEnvironment();
    const ibazel: IBazelWithPrivates = <any>new IBazel(env);
    ibazel.start(['--verbose_failures', 'build', ':it']);

    expect(env.execute)
        .toHaveBeenCalledWith(['--verbose_failures', 'build', ':it'], jasmine.any(Object));
  });

  it('should retrigger when source files are changed', () => {
    const env = createMockIBazelEnvironment({queryBuildFiles: () => ['//:BUILD']});
    const ibazel: IBazelWithPrivates = <any>new IBazel(env);
    ibazel.start([]);

    expect(env.execute).toHaveBeenCalledTimes(1);

    ibazel.buildWatcher.trigger();
    jasmine.clock().tick(1000);
    expect(env.execute).toHaveBeenCalledTimes(2);
  });

  it('should debounce multiple source file changes', () => {
    const env = createMockIBazelEnvironment({queryBuildFiles: () => ['//:BUILD']});
    const ibazel: IBazelWithPrivates = <any>new IBazel(env);
    ibazel.start([]);

    expect(env.execute).toHaveBeenCalledTimes(1);

    ibazel.buildWatcher.trigger();
    jasmine.clock().tick(100);
    ibazel.buildWatcher.trigger();
    ibazel.buildWatcher.trigger();
    jasmine.clock().tick(900);
    expect(env.execute).toHaveBeenCalledTimes(2);
  });

  it('should reconfigure when build files are changed with build file list change', () => {
    const env = createMockIBazelEnvironment({queryBuildFiles: () => ['//:BUILD']});
    const ibazel: IBazelWithPrivates = <any>new IBazel(env);
    ibazel.start([]);

    expect(env.execute).toHaveBeenCalledTimes(1);

    spyOn(env, 'queryBuildFiles').and.returnValue(['//tools:BUILD']);
    ibazel.buildWatcher.trigger();
    jasmine.clock().tick(1000);

    expect(ibazel.buildWatcher.unwatch).toHaveBeenCalledWith(['BUILD']);
    expect(ibazel.buildWatcher.unwatch).toHaveBeenCalledTimes(2);
    expect(ibazel.buildWatcher.add).toHaveBeenCalledWith(['tools/BUILD']);
    expect(ibazel.buildWatcher.add).toHaveBeenCalledTimes(2);
    expect(env.execute).toHaveBeenCalledTimes(2);
  });

  it('should reconfigure when build files are changed with source file list change', () => {
    const env = createMockIBazelEnvironment({querySourceFiles: () => ['//:index.ts']});
    const ibazel: IBazelWithPrivates = <any>new IBazel(env);
    ibazel.start([]);

    expect(env.execute).toHaveBeenCalledTimes(1);

    spyOn(env, 'querySourceFiles').and.returnValue(['//:main.ts']);
    ibazel.buildWatcher.trigger();
    jasmine.clock().tick(1000);

    expect(ibazel.sourceWatcher.unwatch).toHaveBeenCalledWith(['index.ts']);
    expect(ibazel.sourceWatcher.unwatch).toHaveBeenCalledTimes(2);
    expect(ibazel.sourceWatcher.add).toHaveBeenCalledWith(['main.ts']);
    expect(ibazel.sourceWatcher.add).toHaveBeenCalledTimes(2);
    expect(env.execute).toHaveBeenCalledTimes(2);
  });

  it('should debounce multiple build file changes', () => {
    const env = createMockIBazelEnvironment({queryBuildFiles: () => ['//:BUILD']});
    const ibazel: IBazelWithPrivates = <any>new IBazel(env);
    ibazel.start([]);

    expect(env.execute).toHaveBeenCalledTimes(1);

    spyOn(env, 'queryBuildFiles').and.returnValue(['//tools:BUILD']);
    ibazel.buildWatcher.trigger();
    jasmine.clock().tick(100);
    ibazel.buildWatcher.trigger();
    jasmine.clock().tick(900);

    expect(ibazel.buildWatcher.unwatch).toHaveBeenCalledWith(['BUILD']);
    expect(ibazel.buildWatcher.unwatch).toHaveBeenCalledTimes(2);
    expect(ibazel.buildWatcher.add).toHaveBeenCalledWith(['tools/BUILD']);
    expect(ibazel.buildWatcher.add).toHaveBeenCalledTimes(2);
    expect(env.execute).toHaveBeenCalledTimes(2);
  });

  it('should debounce source and build file changes', () => {
    const env = createMockIBazelEnvironment({querySourceFiles: () => ['//:index.ts']});
    const ibazel: IBazelWithPrivates = <any>new IBazel(env);
    ibazel.start([]);

    expect(env.execute).toHaveBeenCalledTimes(1);

    spyOn(env, 'querySourceFiles').and.returnValue(['//:main.ts']);
    ibazel.buildWatcher.trigger();
    jasmine.clock().tick(100);
    ibazel.sourceWatcher.trigger();
    jasmine.clock().tick(900);

    expect(ibazel.sourceWatcher.unwatch).toHaveBeenCalledWith(['index.ts']);
    expect(ibazel.sourceWatcher.unwatch).toHaveBeenCalledTimes(2);
    expect(ibazel.sourceWatcher.add).toHaveBeenCalledWith(['main.ts']);
    expect(ibazel.sourceWatcher.add).toHaveBeenCalledTimes(2);
    expect(env.execute).toHaveBeenCalledTimes(2);
  });

  it('should generate and run script for run targets requesting notify changes', () => {
    const env = createMockIBazelEnvironment({
      queryRules:
          () => [{attribute: [{name: 'tags', stringListValue: ['ibazel_notify_changes']}]}]
    });
    const ibazel: IBazelWithPrivates = <any>new IBazel(env);
    ibazel.start(['run', ':sth', '--verbose_failures', '--', 'other_arg']);

    expect(env.execute).toHaveBeenCalledWith([
      'run', jasmine.stringMatching(/--script_path=/), ':sth', '--verbose_failures', '--',
      'other_arg'
    ]);

    expect(env.spawnAsync)
        .toHaveBeenCalledWith(jasmine.stringMatching(/ibazel_run_script/), [], jasmine.any(Object));
  });

  it('should notify for build changes run targets requesting notify changes', () => {
    let calls = 0;
    const env = createMockIBazelEnvironment({
      execute: () => {
        calls += 1;
        if (calls === 2) {
          expect(ibazel.runProcess.stdin.write)
              .toHaveBeenCalledWith(jasmine.stringMatching(/IBAZEL_BUILD_STARTED/));
        }
        return {status: 0};
      },
      spawnAsync: () => ({stdin: jasmine.createSpyObj('stdin', ['write'])}),
      queryRules:
          () => [{attribute: [{name: 'tags', stringListValue: ['ibazel_notify_changes']}]}]
    });
    const ibazel: IBazelWithPrivates = <any>new IBazel(env);
    ibazel.start(['run', ':sth']);

    ibazel.sourceWatcher.trigger();
    jasmine.clock().tick(1000);

    expect(calls).toEqual(2);
    expect(ibazel.runProcess.stdin.write)
        .toHaveBeenCalledWith(jasmine.stringMatching(/IBAZEL_BUILD_COMPLETED/));
  });
});

type IBazelWithPrivates = IBazel & {
  buildWatcher: any;
  sourceWatcher: any;
  runProcess: ChildProcess;
};
