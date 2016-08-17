import * as fs from 'fs';
import * as path from 'path';
import * as ts from 'typescript';

import {DelegatingHost, MetadataWriterHost, TsickleHost} from './compiler_host';
import {check, tsc} from './tsc';

const minimist = require('minimist');
const ByteBuffer = require('bytebuffer');

function main() {
  const args = minimist(process.argv.slice(2));

  if (args.persistent_worker) {
    const workerpb = loadWorkerPb();

    let buf: any;  // ByteBuffer

    // Hook all output to stderr and write it to a buffer, then include
    // that buffer's in the worker protcol proto's textual output.  This
    // means you can log via console.error() and it will appear to the
    // user as expected.
    //
    // Writing to the actual stderr will output to the blaze log.
    let consoleOutput = '';
    const stderrWrite = process.stderr.write.bind(process.stderr);
    process.stderr.write = (chunk: string | Buffer, ...otherArgs: any[]): boolean => {
      stderrWrite(chunk);
      consoleOutput += chunk.toString();
      return true;
    };

    process.stdin.on('readable', function onStdinReadable(): void {
      const chunk = process.stdin.read();
      if (!chunk) {
        return;
      }

      const wrapped = ByteBuffer.wrap(chunk);
      buf = buf ? ByteBuffer.concat([buf, wrapped]) : wrapped;

      let req: WorkRequest;
      while (true) {
        try {
          req = workerpb.WorkRequest.decodeDelimited(buf);

          if (!req) {
            // Not enough bytes read yet
            return null;
          }
        } catch (err) {
          // Malformed message
          stderrWrite(err.stack + '\n');
          console.error(err.stack);
          process.stdout.write(new workerpb.WorkResponse()
                                   .setExitCode(1)
                                   .setOutput(consoleOutput)
                                   .encodeDelimited()
                                   .toBuffer());
          buf = null;
        }


        const args = req.getArguments();
        let exitCode = 0;
        consoleOutput = '';
        try {
          let project = args.find(arg => arg.substr(0, '@@'.length) === '@@');
          if (!project) {
            throw new Error('tsconfig.json not specified');
          }
          project = project.substr('@@'.length);


          compile(project);

        } catch (err) {
          exitCode = 1;
          stderrWrite(err.stack + '\n');
          console.error(err.stack);
        }
        process.stdout.write(new workerpb.WorkResponse()
                                 .setExitCode(exitCode)
                                 .setOutput(consoleOutput)
                                 .encodeDelimited()
                                 .toBuffer());

        // Avoid growing the buffer indefinitely.
        buf.compact();
      }
    });

    process.stdin.on('end', function onStdinEnd() {
      stderrWrite('Exiting TypeScript compiler persistent worker.\n');
      process.exit(0);
    });

  } else {
    const project = args._[args._.length - 1] || '';
    if (project && project.substr(0, '@@'.length) === '@@') {
      args._.pop();
      args.project = project.substr('@@'.length);
    }
    try {
      compile(args.p || args.project || '.');
      process.exit(0);
    } catch (e) {
      console.error(e.stack);
      console.error('Compilation failed');
      process.exit(1);
    }
  }
}

function loadWorkerPb() {
  const protobufjs = require('protobufjs');

  // We have to use RUNFILES instead of __dirname because __dirname may be wrong
  // due to Node.js's behavior of resolving symlinked modules.
  const protoPath = 'tools/@angular/tsc-wrapped/worker_protocol.proto';
  const protoNamespace = protobufjs.loadProtoFile({root: process.env['RUNFILES'], file: protoPath});

  if (!protoNamespace) {
    throw new Error(`Cannot find ${protoPath}`);
  }

  return protoNamespace.build('blaze.worker');
}

interface WorkRequest {
  getArguments(): string[];
}

const fileCache = {};

class CacheLoadingHost extends DelegatingHost {
  constructor(delegate: ts.CompilerHost, private fileCache: any) { super(delegate); }
  getSourceFile =
      (fileName: string, languageVersion: ts.ScriptTarget, onError?: (message: string) => void) => {
        return this.delegate.getSourceFile(fileName, languageVersion, onError);
      };
}

const READONLY_REGEXP = /^( +)(static |private )*readonly +/gm;
const ABSTRACT_REGEXP = /^( +)abstract ([A-Za-z0-9_\$]+:)/gm;

class DeclarationDownlevelingHost extends DelegatingHost {
  constructor(delegate: ts.CompilerHost, private options: any) { super(delegate); }
  writeFile: ts.WriteFileCallback =
      (fileName, data, writeByteOrderMark, onError?, sourceFiles?): void => {
        if (this.options.stripInternal && fileName.match(/\.d\.ts$/)) {
          data = data.replace(READONLY_REGEXP, '$1$2');
          data = data.replace(ABSTRACT_REGEXP, '$1$2');
        }
        this.delegate.writeFile(fileName, data, writeByteOrderMark, onError, sourceFiles);
      };
}

function compile(project: string) {
  let projectDir = project;
  if (fs.lstatSync(project).isFile()) {
    projectDir = path.dirname(project);
  }

  // file names in tsconfig are resolved relative to this absolute path
  const basePath = path.join(process.cwd(), projectDir);

  // read the configuration options from wherever you store them
  const {parsed, ngOptions} = tsc.readConfiguration(project, basePath);

  ngOptions.basePath = basePath;

  const host = ts.createCompilerHost(parsed.options, true);
  // Disable symlink resolution to make bazel happy
  host.realpath = path => path;
  const cacheHost = new CacheLoadingHost(host, fileCache);
  const declDownlevelingHost = new DeclarationDownlevelingHost(host, parsed.options);

  const program = ts.createProgram(parsed.fileNames, parsed.options, host);
  const errors = program.getOptionsDiagnostics();
  check(errors);

  tsc.typeCheck(host, program);

  // Emit *.js with Decorators lowered to Annotations, and also *.js.map
  const tsicklePreProcessor = new TsickleHost(host, program);
  tsc.emit(tsicklePreProcessor, program);

  if (!ngOptions.skipMetadataEmit) {
    // Emit *.metadata.json and *.d.ts
    // Not in the same emit pass with above, because tsickle erases
    // decorators which we want to read or document.
    // Do this emit second since TypeScript will create missing directories for us
    // in the standard emit.
    const metadataWriter = new MetadataWriterHost(declDownlevelingHost, program);
    tsc.emit(metadataWriter, program);
  }
}

main();
