import {FileWatcher, IBazelEnvironment} from './environment';
import {IBazel} from './index';

fdescribe('IBazel', () => {
  beforeEach(() => { jasmine.clock().install(); });
  afterEach(() => { jasmine.clock().uninstall(); });

  it('watches build files', () => {
    const env = createMockIBazelEnvironment(
        {queryBuildFiles: () => ['//build_defs:build_defs.bzl', '//:BUILD']});
    const ibazel: IBazelWithPrivates = <any>new IBazel(env);
    ibazel.start([]);

    expect(ibazel.buildWatcher.add).toHaveBeenCalledWith(jasmine.arrayContaining([
      'build_defs/build_defs.bzl', 'BUILD'
    ]));
  });

  it('watches source files', () => {
    const env = createMockIBazelEnvironment(
        {querySourceFiles: () => ['//:index.ts', '//subdir:included.ts']});
    const ibazel: IBazelWithPrivates = <any>new IBazel(env);
    ibazel.start([]);

    expect(ibazel.sourceWatcher.add).toHaveBeenCalledWith(jasmine.arrayContaining([
      'index.ts', 'subdir/included.ts'
    ]));
  });

  it('does not watch external workspaces', () => {
    const env = createMockIBazelEnvironment(
        {queryBuildFiles: () => ['@nodejs//:node', '@bazel_tools//genrule:genrule-setup.sh']});
    const ibazel: IBazelWithPrivates = <any>new IBazel(env);
    ibazel.start([]);

    expect(ibazel.buildWatcher.add).toHaveBeenCalledWith([]);
  });

  it('triggers initial run', () => {
    const env = createMockIBazelEnvironment();
    const ibazel: IBazelWithPrivates = <any>new IBazel(env);
    ibazel.start(['--verbose_failures', 'build', ':it']);

    expect(env.execute)
        .toHaveBeenCalledWith(['--verbose_failures', 'build', ':it'], jasmine.any(Object));
  });

  it('retriggers when source files are changed', () => {
    const env = createMockIBazelEnvironment({queryBuildFiles: () => ['//:BUILD']});
    const ibazel: IBazelWithPrivates = <any>new IBazel(env);
    ibazel.start([]);

    expect(env.execute).toHaveBeenCalledTimes(1);

    ibazel.buildWatcher.trigger();
    jasmine.clock().tick(1000);
    expect(env.execute).toHaveBeenCalledTimes(2);
  });

  it('debounces multiple source file changes', () => {
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

  it('reconfigures when build files are changed with build file list change', () => {
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

  it('reconfigures when build files are changed with source file list change', () => {
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

  it('debounces multiple build file changes', () => {
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

  it('debounces source and build file changes', () => {
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
});

type IBazelWithPrivates = IBazel & {
  buildWatcher: any;
  sourceWatcher: any;
};

function createMockIBazelEnvironment(mixin: any = {}): IBazelEnvironment {
  return Object.assign(
      <IBazelEnvironment>{
        execute: jasmine.createSpy('execute'),
        info: () => ({workspace: '/workspace'}),
        queryBuildFiles: () => <string[]>[],
        querySourceFiles: () => <string[]>[],
        cwd: () => '/workspace',
        createWatcher: (cb: Function) => {
          const ret = jasmine.createSpyObj('watcher', ['add', 'unwatch', 'close']);
          ret.trigger = cb;
          return ret;
        }
      },
      mixin);
}
