#!/usr/bin/env bash

set -e

if [[ -z "${RUNFILES}" ]]; then
  case "${0}" in
    /*) self="${0}" ;;
    *) self="${PWD}/${0}" ;;
  esac

  if [[ -n "${TEST_SRCDIR}" ]]; then
    export RUNFILES="${TEST_SRCDIR}/angular"
  elif [[ -d "${self}.runfiles" ]]; then
    export RUNFILES="${self}.runfiles/angular"
  else
    echo "Runfiles directory not found." >&2
    exit 1
  fi
fi

"${RUNFILES}/{{serve_runfiles}}" &
SERVER_PID="$!"

# Kill the server if we get interrupted.
trap "kill ${SERVER_PID}" SIGINT

for ARG in "$@"; do
  case "${ARG}" in
    --serve-only)
      SERVE_ONLY=1
      ;;
  esac
done

if [[ -n "${SERVE_ONLY}" ]]; then
  wait
else
  "${RUNFILES}/{{protractor}}" "${RUNFILES}/{{config}}" "$@"
fi
