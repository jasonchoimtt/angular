#!/usr/bin/env bash

# This wrapper adds --preamble-file option to uglifyjs.

set -e

if [[ -z "${RUNFILES}" ]]; then
  case "${0}" in
    /*) self="${0}" ;;
    *) self="${PWD}/${0}" ;;
  esac

  if [[ -n "${TEST_SRCDIR}" ]]; then
    export RUNFILES="${TEST_SRCDIR}/__main__"
  elif [[ -d "${self}.runfiles" ]]; then
    # __main__ is the name of a WORKSPACE without a name
    export RUNFILES="${self}.runfiles/__main__"
  else
    echo "Runfiles directory not found." >&2
    exit 1
  fi
fi

ARGS=()
while [[ $# -gt 0 ]]; do
  case "$1" in
    --preamble-file)
      shift
      echo $1
      ARGS+=( "--preamble" "$(cat "${1}")" )
      ;;
    *)
      ARGS+=( "${1}" )
      ;;
  esac
  shift
done

"${RUNFILES}/uglifyjs" "${ARGS[@]}"
