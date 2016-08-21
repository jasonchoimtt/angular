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

bazel --bazelrc=scripts/ci-lite/bazelrc run :karma_test -- --browsers=${KARMA_JS_BROWSERS}
bazel --bazelrc=scripts/ci-lite/bazelrc run :router_karma_test -- --browsers=${KARMA_JS_BROWSERS}

echo 'travis_fold:end:test_saucelabs'
