#!/usr/bin/env bash
set -ex -o pipefail

# Note that compiler-cli does not support TS 1.8 because tsc-wrapped uses 1.9 features
LOCAL_PKGS=(
  common core compiler forms http platform-browser platform-browser-dynamic platform-server
  router upgrade
)
LOCAL_TARBALLS=($(for pkg in ${LOCAL_PKGS[@]}; do echo "$(pwd)/bazel-bin/${pkg}_package.tar"; done))

bazel build $(for pkg in ${LOCAL_PKGS[@]}; do echo "${pkg}_package"; done)

if ! [[ -d "bazel-bin" ]]; then
  echo "Output directory not found." >&2
  echo >&2
  echo "Make sure you are running from the repository root." >&2

  exit 1
fi

TMPDIR=${TMPDIR:-/tmp/angular-build/}
readonly TMP=${TMPDIR}/typings-test.$(date +%s)
mkdir -p "${TMP}"
cp -R -v tools/typings-test/* "${TMP}"

# run in subshell to avoid polluting cwd
(
  cd "${TMP}"
  # create package.json so that npm install doesn't pollute any parent node_modules's directory
  npm init --yes
  npm install "${LOCAL_TARBALLS[@]}"
  npm install @types/es6-promise @types/es6-collections @types/jasmine rxjs@5.0.0-beta.6
  npm install typescript@1.8.10
  $(npm bin)/tsc --version
  $(npm bin)/tsc -p tsconfig.json
)
