import {IBazelEnvironment} from './environment';
import {createMockIBazelEnvironment} from './environment_mock';
import {parse} from './parser';


describe('parse', () => {
  let env: IBazelEnvironment;

  beforeEach(() => {
    env = createMockIBazelEnvironment({
      getFlags: () => ({
                  '--foo': false,
                  '--build': true,
                })
    });
  });

  it('should add all arguments to command to be run', () => {
    const parsed = parse(env, ['--foo', 'build', '--build', ':core']);
    expect(parsed.command).toEqual(['--foo', 'build', '--build', ':core']);
  });

  it('should not add the command to targets', () => {
    const parsed = parse(env, ['build', ':core']);
    expect(parsed.targets).toEqual([':core']);
  });

  it('should add argument after boolean flag to targets', () => {
    const parsed = parse(env, ['build', '--build', ':core']);
    expect(parsed.targets).toEqual([':core']);
  });

  it('should not add argument after value flag to targets', () => {
    const parsed = parse(env, ['build', '--foo', ':core', ':common']);
    expect(parsed.targets).toEqual([':common']);
  });

  it('should add argument after value flag specified with = to targets', () => {
    const parsed = parse(env, ['build', '--foo=yes', ':common']);
    expect(parsed.targets).toEqual([':common']);
  });

  it('should add all arguments to targets after -- if command is not "run"', () => {
    const parsed = parse(env, ['build', '--', '--verbose_failures', '--core']);
    expect(parsed.targets).toEqual(['--verbose_failures', '--core']);
  });

  it('should not add non-first arguments to targets after -- if command is "run"', () => {
    const parsed = parse(env, ['run', ':core', '--', '--verbose_failures', '--core']);
    expect(parsed.targets).toEqual([':core']);
  });

  it('should add first argument to targets after -- if command is "run"', () => {
    const parsed = parse(env, ['run', '--', ':core', '--verbose_failures', '--core']);
    expect(parsed.targets).toEqual([':core']);
  });
})
