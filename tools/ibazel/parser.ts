import {IBAZEL, IBazelEnvironment} from './environment';

export interface ParseResult {
  command: string[];
  targets: string[];
}

export function parse(env: IBazelEnvironment, argv: string[]): ParseResult {
  const flagIsBoolean = env.getFlags();

  const command = argv;
  const targets: string[] = [];

  argv = argv.slice();
  let cmdType: string = '';
  let dashDash: boolean = false;

  while (argv.length) {
    const arg = argv.shift();
    if (arg[0] === '-') {
      const [key, value] = arg.split('=');

      if (!dashDash) {
        if (arg === '--') {
          dashDash = true;
        } else {
          // If the arg is specified using --foo=yes, then we are done; else:
          if (!value) {
            // Flag is not boolean or flag is unknown
            if (!flagIsBoolean[key] && !value) {
              argv.shift(); // discard flag value
              if (!(key in flagIsBoolean)) {
                console.warn(`${IBAZEL}: Recognized option ${key}. ibazel may misbehave.`);
              }
            }
          }
        }
      } else {
        // If command is "run", non-first arg after -- are arguments to command;
        // Otherwise, they are targets.
        if (cmdType === 'run') {
          if (!targets.length) {
            targets.push(arg);
          }
        } else {
          targets.push(arg);
        }
      }
    } else if (!cmdType) {
      cmdType = arg;
    } else {
      targets.push(arg);
    }
  }

  return {command, targets};
}
