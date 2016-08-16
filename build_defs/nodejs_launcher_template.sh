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

# Parse Node.js startup options and our runfiles-relative NODE_PATH option
args=()
node_options=()
runfiles_node_path=()

for arg in "$@"; do
  case "${arg}" in
    --node_options=*)
      node_options+=( "${arg#--node_options=}" )
      ;;
    --node_path=*)
      runfiles_node_path=( $(IFS=":"; echo ${arg#--node_path=}) )
      ;;
    *)
      args+=( "${arg}" )
      ;;
  esac
done

export NODE_PATH="$(for P in "${runfiles_node_path[@]}"; do echo -n "${RUNFILES}/${P}:"; done)${NODE_PATH}"

"${RUNFILES}/{{nodejs}}" "${node_options[@]}" "${RUNFILES}/{{entry_point}}" "${args[@]}"
