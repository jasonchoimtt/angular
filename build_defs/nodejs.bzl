"""Skylark build rules for nodejs_module, nodejs_binary, and nodejs_test.

# nodejs_module

nodejs_module defines a single NodeJS module, including its name, dependencies,
and source contents.

Args:
  name: The build target name.
  srcs: A list of source files that make up the module.
  deps: A list of NodeJS modules this module depends on.

# nodejs_binary & nodejs_test

nodejs_binary defines an executable nodejs_module. nodejs_test is essentially
identical, but allows execution with `blaze test`.

The rule attributes are a superset of what nodejs_module takes. That is, each
nodejs_binary and nodejs_test also defines a nodejs_module with its contents.

Args:
  entry_point: The main JavaScript file to run. This is resolved against the
    module name, e.g. for a module called 'foo' with an 'index.js', entry_point
    could be 'foo/index.js'.

nodejs_test also takes the usual test arguments (args, flaky, local,
shard_count, size, timeout).
"""

load("//build_defs:utils.bzl", "join_paths")

_NODEJS_MODULE_ATTRS = {
    "srcs": attr.label_list(allow_files=True),
    "deps": attr.label_list(),
    "data": attr.label_list(allow_files=True, cfg=DATA_CFG),
}
_NODEJS_EXECUTABLE_ATTRS = _NODEJS_MODULE_ATTRS + {
    "entry_point": attr.string(mandatory=True),
    "_nodejs": attr.label(default=Label("@nodejs//:nodejs"), single_file=True),
    "_launcher_template": attr.label(
        default=Label("//build_defs:nodejs_launcher_template"),
        allow_files = True,
        single_file = True,
    ),
}

def _nodejs_module_impl(ctx):
  return struct(
      runfiles = ctx.runfiles(
          files = ctx.files.srcs,
          collect_data = True,
          collect_default = True,
      ),
  )

nodejs_module = rule(
    implementation=_nodejs_module_impl,
    attrs = _NODEJS_MODULE_ATTRS,
)

def _nodejs_binary_impl(ctx):
  entry_point = ctx.attr.entry_point
  # TODO: require all srcs are from one package
  if ctx.attr.srcs[0].label.package:
    entry_point = join_paths(
        ctx.attr.srcs[0].label.package,
        entry_point,
    )

  ctx.template_action(
      template = ctx.file._launcher_template,
      output = ctx.outputs.executable,
      substitutions = {
          "{{nodejs}}": ctx.file._nodejs.short_path,
          "{{entry_point}}": entry_point,
      },
      executable = True,
  )

  return struct(
      files = set([ctx.outputs.executable]),
      runfiles = ctx.runfiles(
          files = ctx.files.srcs + ctx.files._nodejs,
          collect_data = True,
          collect_default = True,
      ),
  )

nodejs_binary = rule(
    implementation = _nodejs_binary_impl,
    executable = True,
    attrs = _NODEJS_EXECUTABLE_ATTRS,
)

# A nodejs_test is just a nodejs_binary with "test=True".
nodejs_test = rule(
    implementation = _nodejs_binary_impl,
    test = True,
    attrs = _NODEJS_EXECUTABLE_ATTRS,
)
