#!/usr/bin/env bash

set -ex -o pipefail

if [[ ${TRAVIS} && ${CI_MODE} != "e2e" ]]; then
  exit 0;
fi


echo 'travis_fold:start:test.js'

# Setup environment
cd `dirname $0`
source ./env.sh
cd ../..

echo 'travis_fold:start:test.e2e.build'
# Make sure build_defs/node_modules_index.bzl is up to date
node build_defs/node_modules_indexer.js . build_defs/node_modules_index.bzl --verify

# Build everything first to improve parallelization
bazel --bazelrc=scripts/ci-lite/bazelrc build \
    :public_api_test :check_cycle_test :playground_test
# ./scripts/ci-lite/offline_compiler_test.sh
# ./tools/typings-test/test.sh
echo 'travis_fold:end:test.e2e.build'

echo 'travis_fold:start:test.e2e.misc'
bazel --bazelrc=scripts/ci-lite/bazelrc test :public_api_test :check_cycle_test \
    || true  # FIXME
# ./scripts/ci-lite/offline_compiler_test.sh
# ./tools/typings-test/test.sh
echo 'travis_fold:end:test.e2e.misc'

echo 'travis_fold:start:test.e2e.localChrome'
if [[ ${TRAVIS} ]]; then
  sh -e /etc/init.d/xvfb start
fi
bazel --bazelrc=scripts/ci-lite/bazelrc run :playground_test
echo 'travis_fold:end:test.e2e.localChrome'

echo 'travis_fold:end:test.js'

# FIXME
# if [[ ${TRAVIS} ]]; then
#   ./scripts/publish/publish-build-artifacts.sh
# fi
