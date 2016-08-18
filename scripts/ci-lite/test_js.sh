#!/usr/bin/env bash

set -ex -o pipefail

if [[ ${TRAVIS} && ${CI_MODE} != "js" ]]; then
  exit 0;
fi


echo 'travis_fold:start:test.js'

# Setup environment
cd `dirname $0`
source ./env.sh
cd ../..


echo 'travis_fold:start:test.unit'
which chromium-browser chromium google-chrome google-chrome-stable || true
env
bazel --bazelrc=scripts/ci-lite/bazelrc test \
    :tool_tests :jasmine_tests :karma_test :router_karma_test \
    "--test_arg=--env=DISPLAY=${DISPLAY}" "--test_arg=--browsers=${KARMA_JS_BROWSERS}"
echo 'travis_fold:start:test.unit'

echo 'travis_fold:end:test.js'
