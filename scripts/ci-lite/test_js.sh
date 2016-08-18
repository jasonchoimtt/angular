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


# echo 'travis_fold:start:test.unit.tools'

# # Run unit tests in tools
# node ./dist/tools/tsc-watch/ tools runCmdsOnly

# echo 'travis_fold:end:test.unit.tools'


echo 'travis_fold:start:test.unit.build'
# Build everything first to improve parallelization
bazel --bazelrc=scripts/ci-lite/bazelrc build :jasmine_tests :karma_test :router_karma_test
echo 'travis_fold:start:test.unit.build'

echo 'travis_fold:start:test.unit.node'

# Run unit tests in node
bazel --bazelrc=scripts/ci-lite/bazelrc test :jasmine_tests \
    || true  # FIXME: remove

echo 'travis_fold:end:test.unit.node'


echo 'travis_fold:start:test.unit.localChrome'

# rebuild to revert files in @angular/compiler/test
# TODO(tbosch): remove this and teach karma to serve the right files
# node dist/tools/@angular/tsc-wrapped/src/main -p modules/tsconfig.json

# Run unit tests in local chrome
if [[ ${TRAVIS} ]]; then
  sh -e /etc/init.d/xvfb start
fi

# We have to use "run" so that Karma has access to local Chrome.
bazel --bazelrc=scripts/ci-lite/bazelrc run :karma_test -- --browsers=${KARMA_JS_BROWSERS} \
  || true  # FIXME: remove
bazel --bazelrc=scripts/ci-lite/bazelrc run :router_karma_test -- --browsers=${KARMA_JS_BROWSERS}

echo 'travis_fold:end:test.unit.localChrome'


echo 'travis_fold:end:test.js'
