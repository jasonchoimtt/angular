#!/usr/bin/env bash

set -e

if [[ $# -eq 0 ]]; then
  echo "Usage: bazel-run.sh [--startup_option=...] <target> [-- <target option>...]" >&2
  exit 1
fi

script_path=$(mktemp "${TMPDIR}/bazel-run.XXXXXX")

trap "rm -f $script_path" EXIT SIGINT

args=()
startup_options=()
runfiles_node_path=()

for arg in "$@"; do
  case "${arg}" in
    --startup_option=*)
      startup_options+=( "${arg#--startup_option=}" )
      ;;
    *)
      args+=( "${arg}" )
      ;;
  esac
done

bazel "${startup_options[@]}" run "--script_path=$script_path" "${args[@]}"

"$script_path"
