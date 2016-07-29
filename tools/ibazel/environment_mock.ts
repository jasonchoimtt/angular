import {IBazelEnvironment} from './environment';

export function createMockIBazelEnvironment(mixin: any = {}): IBazelEnvironment {
  return Object.assign(
      <IBazelEnvironment>{
        execute: jasmine.createSpy('execute'),
        spawnAsync: jasmine.createSpy('spawnAsync'),
        info: () => ({workspace: '/workspace'}),
        queryBuildFiles: () => <string[]>[],
        querySourceFiles: () => <string[]>[],
        queryRules: x => x.map(_ => ({attribute: [{name: 'tags', stringListValue: []}]})),
        getFlags: () => ({'--verbose_failures': true}),
        cwd: () => '/workspace',
        getTempFile: x => `/tmp/${x}`,
        createWatcher: (cb: Function) => {
          const ret = jasmine.createSpyObj('watcher', ['add', 'unwatch', 'close']);
          ret.trigger = cb;
          return ret;
        },
        registerCleanup: jasmine.createSpy('registerCleanup')
      },
      mixin);
}
