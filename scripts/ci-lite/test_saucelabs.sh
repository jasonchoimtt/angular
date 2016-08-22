#!/usr/bin/env bash

set -ex -o pipefail

if [[ ${TRAVIS} && ${CI_MODE} != "saucelabs_required" && ${CI_MODE} != "saucelabs_optional" ]]; then
  exit 0;
fi


echo 'travis_fold:start:test_saucelabs'

# Setup environment
cd `dirname $0`
source ./env.sh
cd ../..


./scripts/sauce/sauce_connect_block.sh
SAUCE_ACCESS_KEY=`echo $SAUCE_ACCESS_KEY | rev`

bazel --bazelrc=scripts/ci-lite/bazelrc test \
    :karma_test :router_karma_test \
    --test_env=SAUCE_USERNAME \
    --test_env=SAUCE_ACCESS_KEY \
    --test_env=CI_MODE \
    --test_env=TRAVIS \
    --test_env=TRAVIS_BUILD_NUMBER \
    --test_env=TRAVIS_BUILD_ID \
    "--test_arg=--browsers=${KARMA_JS_BROWSERS}"

echo 'travis_fold:end:test_saucelabs'
