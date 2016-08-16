# Building Angular with Bazel

Bazel is a multi-language build system developed by Google. Angular employs
Bazel to support multi-package development.

## Why Bazel?

* Bazel provides a declarative way of specifying build products, which is more
  understandatable.
* Bazel provides fast rebuilds by caching each build step and parallelizing
  build steps.
* Bazel has a high guarantee of correctness. You should never have to run
  `bazel clean` (unless you patch stuff in `node_modules`).

## Execution of actions and binaries

There are two execution environments for Bazel binaries:

* In execroot: In a build-time action, the binary can access a directory
  structure with separate trees:

```
bazel-angular/ (execroot)
+- bazel-out/
   +- some-prefix/
      +- genfiles/
         +- modules/**/*.js
         +- ...
         +- (generated files)
      +- bin/
         +- *_tsconfig.json
         +- ...
         +- (generated files)
+- modules/**/*.ts
+- ...
+- (files in source tree)
```

* In runfiles: When running a binary/test target, a runfiles tree is created,
  which is the *merged tree* of the source tree and genfiles tree with the
  required files for the target.

```
foo_binary
foo_binary.runfiles/
+- __main__/ (runfiles root)
   +- modules/**/*.js
   +- ...
   +- (all required files)
```

Both structures are created with extensive use of symlinks. See [Bazel
website](https://bazel.io) for more information.

In Linux, the build-time actions are run in a sandbox, so only explicitly
specified files are accessible. In all platforms, binary targets should only use
files inside the runfiles tree, although they have to locate the runfiles tree
by themselves.

## Build rules

We use Skylark, a Python-like language to implement rules used by `BUILD` files.
These rules are executed by Bazel in the "analysis" phase, which figures out the
whole dependency graph. The rules are documented in the corresponding `.bzl`
files.

## Supplementary tools

* `./ibazel` is a script that provides a "watch" mode for Bazel. It works for
  most `build`, `test` and `run` commands.
* `./bazel-run.sh` is an alternative to `bazel run` that connects `stdin` of the
  binary. It is useful for debugging.

## Useful options

Building:

* Use `--subcommands` to show the individual actions executed.
* Use `--jobs=N` to set the maximum number of jobs to run in parallel. Useful if
  you don't have enough RAM.

Testing:

* Use `--test_output=streamed` to get real-time test output. Not that thie
  prevents Bazel from running test suites in parallel.
* Use `--test_output=all` to show passing test outputs.
* Use `--cache_test_results=no` to be doubly sure that the test passes. Note
  that you should not need to use this.
* Use `run` instead of `test` to debug the test environment. You can also use
  `./bazel-run.sh` to connect `stdin`.

Debugging Bazel:

* To debug TypeScript issues, it might be helpful to inspect the generated
  `tsconfig.json`.
* To debug TypeScript persistent worker issues, use `--worker_verbose`, or
  inspect the worker log files.
* To debug sandbox issues on Linux, use `--sandbox_debug`.

Miscellaneous:

* Bazel runs a server in the background, which shuts down after 3 hours. Use
  `bazel shutdown` to stop that immediately.

Run `bazel help build` or `bazel help test` for a full list of options.

## Caveats

* Currently, Karma and Protractor tests have to be run using `run` instead of
  `test` on Linux. This is because the test environment limits the binaries
  available to the test, which makes it unable to launch a Chrome browser.
* Currently, we use a single `tsconfig.json` file for text editors in all
  packages. That means some constructs, e.g. cross-package imports, may look
  fine in your text editor but does not compile.
* Bazel does not work with Node.js very well. To make Node.js recognize
  dependencies at run-time, we need to use the `NODE_PATH` environmental
  variable. Our Node.js launcher provides an option `--node_path=relative/path`
  to do this.
* Currently, we do not rely on Bazel to pull in `npm` dependencies. We need to
  generate a dependency graph of the modules in `node_modules`. This is done
  automatically when `./tools/npm/reshrinkwrap` is executed.
* Bazel does not support `BUILD` files inside a directory containing the `@`
  sign. That's why we have to put most build targets in the root `BUILD` file.

## Bazel development tips

* Develop with sandboxing turned on. This will make sure your rules are correct.
  This currently (as of Aug 2016) means you should develop on a Linux machine.
* Bazel tracks the dependency graph at file level, so make sure you specify and
  compute the inputs and outputs of each action correctly.
* As of Bazel 0.3, writing empty files is considered a change and may cause
  unnecessary rebuilds. Hence, writing empty files should be avoided.
