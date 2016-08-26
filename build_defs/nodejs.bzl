load("//build_defs:utils.bzl", "join_paths", "pick_file_in_dir", "pseudo_json_encode",
     "collect_module_mappings", "runfiles_path", "sum")


COMMON_NODEJS_MODULE_ATTRS = {
    "entry_point": attr.string(),
    "module_name": attr.string(),
    "module_root": attr.string(),
    "add_mapping": attr.bool(default=True),
}

_NODEJS_MODULE_ATTRS = COMMON_NODEJS_MODULE_ATTRS + {
    "srcs": attr.label_list(allow_files=True, mandatory=True, cfg=DATA_CFG),
    "deps": attr.label_list(providers=["nodejs"], cfg=DATA_CFG),
    "data": attr.label_list(allow_files=True, cfg=DATA_CFG),
}
_NODEJS_EXECUTABLE_ATTRS =  _NODEJS_MODULE_ATTRS + {
    "_nodejs": attr.label(
        default = Label("@nodejs//:nodejs"),
        allow_files = True,
        executable = True,
    ),
    "_loader_template": attr.label(
        default = Label("//build_defs:nodejs_loader_template.js"),
        allow_files = True,
        single_file = True,
    ),
    "_launcher_template": attr.label(
        default = Label("//build_defs:nodejs_launcher_template.sh"),
        allow_files = True,
        single_file = True,
    ),
}

def create_nodejs_provider(*, ctx, files=[], module_name=None, module_root="",
                           entry_point="", add_mapping=True, collect_mapping_from=[]):
  """
  Common implementation for creating the nodejs provider. Callers can implement
  the attribute set COMMON_NODEJS_MODULE_ATTRS.

  Args:
    module_name: The module name of the package. Defaults to the target name.
    module_root: The root of the module relative to the package. Defaults to "".
    entry_point: The main JavaScript file to run/include. This is resolved
      relative to the module_root specified. Setting this will add a module
      mapping record for the current package.

    attrs: The attributes to find module mappings from. These attributes should
      be label_list's.
  """
  module_name = module_name or ctx.label.name
  entry_point_file, entry_point_relative_path = \
      pick_file_in_dir(files, ctx.label, join_paths(module_root, entry_point or "index.js"),
                       fail=fail if entry_point != "" else None)

  self_mapping = {}
  if add_mapping:
    if entry_point_file:
      self_mapping[module_name] = \
          [join_paths(entry_point_file.short_path, entry_point_relative_path)]
    self_mapping[module_name + "/*"] = [runfiles_path(ctx.label, module_root, "*")]

  module_mappings = collect_module_mappings(
      *[d.nodejs.module_mappings for d in collect_mapping_from if hasattr(d, "nodejs")],
      self_mapping, strict=True)

  return struct(
      files = files,
      module_name = module_name,
      module_root = module_root,
      entry_point_file = entry_point_file,
      entry_point_relative_path = entry_point_relative_path,
      module_mappings = module_mappings,
  )

def _nodejs_module_impl(ctx):
  """nodejs_module

  Rule for defining a Node.js module.

  Args:
    srcs: Required. A list of source files that make up the module. The general
      assumption is that this should be CommonJS files that can run directly on
      Node.js.
    deps: A list of Node.js modules that this module depends on.
    entry_point: The path to the file to be imported when the module is
      require()'ed. Defaults to index.js if it exists.
    module_root: The root of the module relative to the package.

  Unfortunately, since we do not patch require() currently, the Node.js rules
  cannot do anything to ensure that modules are resolved at runtime.

  The Node.js wrapper, however, provides these command line arguments:
    --node_options=--foo_option=bar
      Passes --foo_option=bar to Node.js as startup options.
    --node_path=path/to/foo:path/to/bar
      Adds the specified paths to NODE_PATH after resolving them relative to
      runfiles.

  You can use them with the "args" kwarg in any Node.js-based target. A
  convenient option is --node_options=debug, which launches the target in a
  debugger. Note that however, you have to use `bazel-run.sh` to do that in
  order to connect stdin.

  Note that Node.js resolves symlinks when loading modules, which is wrong in
  our bazel environment, since it resolves symlinks that may cross the runfiles
  boundary. We may be able to use the Node.js flag "--preserve-symlinks"
  introduced in Node.js 6.2. See https://github.com/nodejs/node/pull/6537
  """
  files = sum([list(getattr(src.files, "nodejs", src).files) for src in ctx.attr.srcs], empty=[])
  return struct(
      files = set(files),
      runfiles = ctx.runfiles(
          files = ctx.files.srcs,
          collect_data = True,
          collect_default = True,
      ),
      nodejs = create_nodejs_provider(
          ctx=ctx, files=files, module_name=ctx.attr.module_name,
          module_root=ctx.attr.module_root, entry_point=ctx.attr.entry_point,
          add_mapping=ctx.attr.add_mapping, collect_mapping_from=ctx.attr.srcs + ctx.attr.deps),
  )

nodejs_module = rule(
    implementation = _nodejs_module_impl,
    attrs = _NODEJS_MODULE_ATTRS,
)


def _nodejs_binary_impl(ctx):
  """nodejs_binary

  Rule for defining a Node.js binary. This creates an executable version of
  a Node.js module.

  Args:
    srcs: Required. A list of source files that make up the module.
    deps: A list of Node.js modules that this module depends on.
    data: A list of extra files or targets to include in runfiles.
    entry_point: The main JavaScript file to run. This is resolved relative to
      the module_root specified.
  """
  files = sum([list(getattr(src, "nodejs", src).files) for src in ctx.attr.srcs], empty=[])
  nodejs = create_nodejs_provider(
      ctx=ctx, files=files, module_name=ctx.attr.module_name,
      module_root=ctx.attr.module_root, entry_point=ctx.attr.entry_point,
      add_mapping=ctx.attr.add_mapping, collect_mapping_from=ctx.attr.srcs + ctx.attr.deps)

  loader = ctx.new_file(ctx.label.name + "_loader.js")

  ctx.template_action(
      template = ctx.file._loader_template,
      output = loader,
      substitutions = {
          "{{module_mappings}}": pseudo_json_encode(nodejs.module_mappings),
          "{{entry_point}}": join_paths(nodejs.entry_point_file.short_path,
                                        nodejs.entry_point_relative_path),
      },
  )

  ctx.template_action(
      template = ctx.file._launcher_template,
      output = ctx.outputs.executable,
      substitutions = {
          "{{nodejs}}": ctx.executable._nodejs.short_path,
          "{{loader}}": loader.short_path,
      },
      executable = True,
  )

  return struct(
      files = set([ctx.outputs.executable]),
      runfiles = ctx.runfiles(
          files = files + [loader] + ctx.files._nodejs,
          collect_data = True,
          collect_default = True,
      ),
      nodejs = nodejs,
  )

nodejs_binary = rule(
    implementation = _nodejs_binary_impl,
    executable = True,
    attrs = _NODEJS_EXECUTABLE_ATTRS,
)


"""nodejs_test

A variant of nodejs_binary with "test=True".
"""
nodejs_test = rule(
    implementation = _nodejs_binary_impl,
    test = True,
    attrs = _NODEJS_EXECUTABLE_ATTRS,
)
