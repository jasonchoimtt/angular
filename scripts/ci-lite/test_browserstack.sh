#!/usr/bin/env bash

set -ex -o pipefail

if [[ ${TRAVIS} && ${CI_MODE} != "browserstack_required" && ${CI_MODE} != "browserstack_optional" ]]; then
  exit 0;
fi


echo 'travis_fold:start:test_browserstack'

# Setup environment
cd `dirname $0`
source ./env.sh
cd ../..


./scripts/browserstack/waitfor_tunnel.sh
export BROWSER_STACK_ACCESS_KEY=`echo $BROWSER_STACK_ACCESS_KEY | rev`

bazel --bazelrc=scripts/ci-lite/bazelrc test \
    :karma_test :router_karma_test \
    --test_env=BROWSER_STACK_USERNAME \
    --test_env=BROWSER_STACK_ACCESS_KEY \
    --test_env=CI_MODE \
    --test_env=TRAVIS \
    --test_env=TRAVIS_BUILD_NUMBER \
    --test_env=TRAVIS_BUILD_ID \
    "--test_arg=--browsers=${KARMA_JS_BROWSERS}"

echo 'travis_fold:end:test_browserstack'
