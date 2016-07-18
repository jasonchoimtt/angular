import {IBazelEnvironment} from './environment';

export function createMockIBazelEnvironment(mixin: any = {}): IBazelEnvironment {
  return Object.assign(
      <IBazelEnvironment>{
        execute: jasmine.createSpy('execute'),
        info: () => ({workspace: '/workspace'}),
        queryBuildFiles: () => <string[]>[],
        querySourceFiles: () => <string[]>[],
        getFlags: () => ({
          '--verbose_failures': true
        }),
        cwd: () => '/workspace',
        createWatcher: (cb: Function) => {
          const ret = jasmine.createSpyObj('watcher', ['add', 'unwatch', 'close']);
          ret.trigger = cb;
          return ret;
        }
      },
      mixin);
}
