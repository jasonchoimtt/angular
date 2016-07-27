#!/usr/bin/env bash

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

"${RUNFILES}/{{serve_runfiles}}" &
SERVER_PID="$!"

# Kill the server if we get interrupted.
trap "kill ${SERVER_PID}" SIGINT

if [[ "$1" == "--serve-only" ]]; then
  wait
else
  NODE_PATH="${RUNFILES}/modules:${RUNFILES}/tools:${NODEPATH}" \
      "${RUNFILES}/{{protractor}}" "${RUNFILES}/{{config}}" "$@"
fi
