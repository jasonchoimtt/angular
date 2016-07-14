#!/usr/bin/env bash

if ! [ -n "$RUNFILES" ]; then
  if [ -d "${0}.runfiles" ]; then
    # __main__ is apparently the name of a WORKSPACE without a name
    export RUNFILES="${0}.runfiles/__main__"
  else
    export RUNFILES="$(pwd)"
  fi
fi

cd "${RUNFILES}" && NODE_PATH=${RUNFILES}/modules:${RUNFILES}/tools:$NODEPATH "${RUNFILES}/{{jasmine}}" --color "JASMINE_CONFIG_PATH=${RUNFILES}/{{config}}" "$@"
