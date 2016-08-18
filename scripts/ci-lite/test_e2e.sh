#!/usr/bin/env bash

set -ex -o pipefail

if [[ ${TRAVIS} && ${CI_MODE} != "e2e" ]]; then
  exit 0;
fi


echo 'travis_fold:start:test.e2e'

# Setup environment
cd `dirname $0`
source ./env.sh
cd ../..

echo 'travis_fold:start:test.e2e.node_modules_index'
# Make sure build_defs/node_modules_index.bzl is up to date
node build_defs/node_modules_indexer.js . build_defs/node_modules_index.bzl --verify
echo 'travis_fold:end:test.e2e.node_modules_index'

echo 'travis_fold:start:test.e2e.bazel'
if [[ ${TRAVIS} ]]; then
  sh -e /etc/init.d/xvfb start
fi
bazel --bazelrc=scripts/ci-lite/bazelrc test \
    :public_api_test :check_cycle_test :playground_test \
    # This makes sure benchpress builds
    modules/benchpress \
    --test_env=DISPLAY \
    --test_env=CHROME_BIN \
    --test_env=TRAVIS \
    || true  # FIXME
echo 'travis_fold:end:test.e2e.bazel'

echo 'travis_fold:start:test.e2e.misc'
# ./scripts/ci-lite/offline_compiler_test.sh
# ./tools/typings-test/test.sh
echo 'travis_fold:end:test.e2e.misc'

echo 'travis_fold:end:test.e2e'

# FIXME
false
# if [[ ${TRAVIS} ]]; then
#   ./scripts/publish/publish-build-artifacts.sh
# fi
