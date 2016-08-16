#!/usr/bin/env bash
set -ex -o pipefail

LOCAL_PKGS=(
  common core compiler compiler-cli forms platform-browser platform-browser-dynamic
  platform-server
  tsc-wrapped
)
LOCAL_TARBALLS=($(for pkg in ${LOCAL_PKGS[@]}; do echo "$(pwd)/bazel-bin/${pkg}_package.tar"; done))
PKGS=(
  reflect-metadata
  typescript@next
  zone.js
  rxjs
  @types/{node,jasmine}
  jasmine
)

bazel build $(for pkg in ${LOCAL_PKGS[@]}; do echo "${pkg}_package"; done)

if ! [[ -d "bazel-bin" ]]; then
  echo "Output directory not found." >&2
  echo >&2
  echo "Make sure you are running from the repository root." >&2

  exit 1
fi

TMPDIR=${TMPDIR:-.}
readonly TMP=$TMPDIR/e2e_test.$(date +%s)
mkdir -p "${TMP}"
cp -R -v modules/@angular/compiler-cli/integrationtest/* "${TMP}"
# Try to use the same versions as angular, in particular, this will
# cause us to install the same rxjs version.
cp -v package.json "${TMP}"

# run in subshell to avoid polluting cwd
(
  cd "${TMP}"
  set -ex -o pipefail
  npm install "${PKGS[@]}"
  npm install "${LOCAL_TARBALLS[@]}"

  ./node_modules/.bin/tsc --version
  # Compile the compiler-cli integration tests
  ./node_modules/.bin/ngc --i18nFile=src/messages.fi.xtb --locale=fi --i18nFormat=xtb
  ./node_modules/.bin/ng-xi18n

  ./node_modules/.bin/jasmine init
  # Run compiler-cli integration tests in node
  ./node_modules/.bin/jasmine test/*_spec.js

  # Compile again with a differently named tsconfig file
  mv tsconfig.json othername.json
  ./node_modules/.bin/ngc -p othername.json
)
