alias bazel-node='bazel run @node//:node'  # REPL or run ad-hoc JS script
alias bazel-npm='bazel run@node//:npm'  # npm wrapper with "bazel fetch" hook
bazel run @node//bin:gulp  # run $(npm bin)/* command

Three tasks:
-   Create node_modules symlink
-   Run "npm install *" commands
-   Generate BUILD files

### "bazel fetch node"

```
if node_modules symlink does not exist:
  create the node_modules symlink
if node_modules is empty and SKIP_NPM_INSTALL is not set:
  run "npm install"
generate BUILD files
```

### "bazel-npm"

```
if node_modules symlink does not exist:
  create the node_modules symlink
run "npm install $@"
run "bazel fetch node" with SKIP_NPM_INSTALL=1
```

### Bootstraping @node

-   Add WORKSPACE target
-   Run "bazel fetch node"

### Initializing cloned repository

-   Run "bazel fetch"
-   NB: running "npm install" unwrapped is unsupported and error-prone
-   User should use npm-shrinkwrap for reproducibility, but it is not required
