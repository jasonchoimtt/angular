#!/usr/bin/env bash

set -e

git reset bazel_split_base
git add .gitignore WORKSPACE build_defs/nodejs_workspace.bzl .bazelrc
git commit -m "bazel: workspace and bazelrc"
git add BUILD build_defs/{BUILD,utils.bzl}
git commit -m "bazel: BUILD file and utils"
git add build_defs/{nodejs.bzl,nodejs_launcher_template.sh}
git add build_defs/{tests/typescript/,typescript.bzl,tools/merge_tsconfig.js}
git commit -m "bazel: typescript"
git add build_defs/{protractor*,tools/serve_runfiles.js} protractor-bazel.conf.js \
    modules/playground/ favicon.ico
git commit -m "bazel: protractor and playground"
git add ibazel tools/ibazel bazel-run.sh
git commit -m "bazel: ibazel and run-bazel.sh"
git add scripts/ci-lite/offline_compiler_test.sh modules/@angular/compiler-cli/integrationtest/
git commit -m "bazel: offline compiler test (FIXME)"
git add scripts/ .travis.yml
git commit -m "bazel: travis"
git add npm-shrinkwrap* package.json build_defs/node_modules_index* tools/npm/reshrinkwrap
git commit -m "bazel: npm index and shrinkwrap"
git add test-main.js karma* modules/@angular/router/karma* tools/karma/ibazel_watcher.js \
    build_defs/karma*
git commit -m "bazel: karma"
git add build_defs/jasmine* modules/jasmine_helper.ts
git commit -m "bazel: jasmine"
git add DEVELOPER.md
git commit -m "bazel: developer docs"
git add tools/@angular/tsc-wrapped/{bootstrap.{j,t}s,tsconfig.json,src,worker_protocol.proto}
git commit -m "bazel: tsc-wrapped persistent worker"
git add tools/@angular/tsc-wrapped/test
git commit -m "bazel: tsc-wrapped test fixes"
git add modules/@angular/compiler/
git commit -m "bazel: compiler codegen fix"
git add tools/tree-shaking-test/
git commit -m "bazel: tree shaking test"
git add tools/typings-test/
git commit -m "bazel: typings test (FIXME)"
git add -A
git commit -m "bazel: build_defs and other stuff"

git st

echo "Done."
