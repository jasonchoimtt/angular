load("//build_defs:utils.bzl", "join_paths", "normalize_path", "json_encode", "pick_file_in_dir")


def _ts_library_impl(ctx):
  """ts_library

  Rule to compile TypeScript code.

  Args:
    deps: ts_* dependencies.
    deps_use_internal: ts_library dependencies for which @internal declarations
      should be used. Must be a subset of deps. Note that if this target is used
      downstream, you should ensure that the resultant declarations will be
      compatible with upstream declarations when all @internal's are stripped.
    module_name: The module name of the package. Defaults to the target name.
    root_dir: The TypeScript rootDir relative to the package. Defaults to the
      location of the tsconfig.json file.
    out_dir: The TypeScript outDir relative to the package. Defaults to
      root_dir.
  """
  # Directory structure:
  # bazel-angular/ (execroot)
  #   bazel-out/foo/bin/
  #     path-to-package/
  #       out/dir/
  #         *.js, *.d.ts, *.metadata.json
  #         esm/*.js
  #         internal/*.d.ts
  #       target-label_flavor_tsconfig.json
  #   path-to-package/
  #     *.ts
  #     *.d.ts
  #     tsconfig.json

  # Merged tree: (e.g. in runfiles)
  # path-to-package/
  #   *.ts
  #   out/dir/ (if any)
  #     *.js, *.d.ts, *.metadata.json
  #     esm/*.js, *.d.ts, *.metadata.json
  #     internal/*.d.ts, *.metadata.json

  for src in ctx.attr.srcs:
    if src.label.package != ctx.label.package:
      # Sources can be in sub-folders, but not in sub-packages.
      fail("Sources must be in the same package as the ts_library rule, " +
           "but {} is not in {}".format(src.label, ctx.label.package), "srcs")

  for dep in ctx.attr.deps_use_internal:
    if dep not in ctx.attr.deps:
      fail("deps_use_internal must be a subset of deps", "deps_use_internal")
    if not hasattr(dep.typescript, 'internal'):
      fail("dep {} does not have @internal declarations.".format(dep.label),
           "deps_use_internal")

  if not ctx.files.srcs:
    fail("No source file found", "srcs")

  # Find out the correct rootDir to use. This allows using generated files as
  # input, which is needed e.g. for compiler codegen test.
  # Note that despite the name, TypeScript does not use rootDirs to compute the
  # output path.
  source_roots = list(set([src.root.path for src in ctx.files.srcs]))
  if len(source_roots) > 1:
    fail("Mixing source and generated files as input is not supported.", "srcs")

  # There are four types of input files:
  # - *.ts files in srcs: load with "files"
  # - *.d.ts files in srcs: load with "files" (We need this for convenience in
  #   e.g. playground e2e tests)
  # - Non-ambient *.d.ts files: load with "compilerOptions"."paths" (tc_paths)
  # - Module/bunbled *.d.ts files: load main file with "files" (tc_types)
  #
  # Regardless of the type, all of them have to be specified as inputs to the
  # bazel action.

  # These values are propagated transitively to downstream packages.
  # tc: transitive closure
  tc_declarations, tc_types, tc_paths = set(), set(), {}
  tc_declarations_internal, tc_paths_internal = set(), {}

  for dep in ctx.attr.deps:
    # TODO: do we need to deal with deps without typescript provider?
    tc_declarations += dep.typescript.tc_declarations
    tc_types += dep.typescript.tc_types
    tc_paths.update(dep.typescript.tc_paths)

    if dep not in ctx.attr.deps_use_internal:
      tc_declarations_internal += dep.typescript.tc_declarations
      tc_paths_internal.update(dep.typescript.tc_paths)

  for dep in ctx.attr.deps:
    # Do this after the normal stuff so that the @internal transitive closure
    # will take precedence in the tc_paths_internal dict.
    if dep in ctx.attr.deps_use_internal:
      tc_declarations_internal += dep.typescript.internal.tc_declarations
      tc_paths_internal.update(dep.typescript.internal.tc_paths)

  # Notice that the paths in the tsconfig.json should be relative to the file.
  tsconfig_to_workspace = "/".join(
        [".." for x in join_paths(ctx.configuration.bin_dir.path, ctx.label.package).split("/")])

  # These two are package-relative.
  # normalize_path handles the case where root_dir/out_dir is set to ".".
  # TypeScript notoriously doesn't work with paths with /./ in the middle.
  root_dir = normalize_path(
      ctx.attr.root_dir or _drop_dir(ctx.file.tsconfig.dirname, ctx.label.package))
  out_dir = normalize_path(ctx.attr.out_dir or root_dir)

  # These correspond to keys in tsconfig.json.
  base_compiler_options = {
      "rootDir": join_paths(tsconfig_to_workspace, source_roots[0], ctx.label.package, root_dir),
      # Tells TypeScript to assume that the .ts files are in the same directory as the .js.map files
      "mapRoot": join_paths(tsconfig_to_workspace, source_roots[0], ctx.label.package, root_dir),
      "paths": {module: [join_paths(tsconfig_to_workspace, path)]
                for module, path in tc_paths_internal.items()},
      "skipLibCheck": True,
      "stripInternal": True,
      "baseUrl": ".",

      "declaration": True,

      # All dependencies should be loaded with "deps", so we don't need the
      # node-style resolution nor @types resolution. This also improves
      # consistency in sandboxed and unsandboxed environments.
      "moduleResolution": "classic",
      "typeRoots": [],
  }
  ts_files = [f for f in ctx.files.srcs if not f.short_path.endswith(".d.ts")]
  common_args = dict(
      ctx = ctx,
      inputs = ctx.files.srcs + list(tc_declarations_internal),
      input_tsconfig = ctx.file.tsconfig,
      mixin_tsconfig = {
          "compilerOptions": base_compiler_options,
          "angularCompilerOptions": {"writeMetadata": True},
          "files": ([join_paths(tsconfig_to_workspace, f.path) for f in ctx.files.srcs] +
                    [join_paths(tsconfig_to_workspace, path) for path in tc_types]),
      },
  )

  has_source_map = ctx.attr.source_map and not ctx.attr.inline_source_map
  is_tsc_wrapped = "bootstrap" not in ctx.executable.compiler.path

  gen_js, gen_d_ts = _map_files(ctx, ts_files, root_dir, out_dir, [".js", ".d.ts"])
  gen_js_map, = (_map_files(ctx, ts_files, root_dir, out_dir, [".js.map"])
                 if has_source_map else [[]])
  gen_meta, = (_map_files(ctx, ts_files, root_dir, out_dir, [".metadata.json"])
               if is_tsc_wrapped else [[]])
  _tsc_action(prefix="", outputs=gen_js + gen_d_ts + gen_meta + gen_js_map,
              compiler_options={
                  "outDir": out_dir,
                  "sourceMap": ctx.attr.source_map,
                  "inlineSourceMap": ctx.attr.inline_source_map,
              }, **common_args)

  gen_js_esm, gen_d_ts_esm = _map_files(
          ctx, ts_files, root_dir, join_paths(out_dir, "esm"), [".js", ".d.ts"])
  gen_meta_esm, = (
      _map_files(ctx, ts_files, root_dir, join_paths(out_dir, "esm"), [".metadata.json"])
      if is_tsc_wrapped else [[]])
  gen_js_map_esm, = (_map_files(ctx, ts_files, root_dir, join_paths(out_dir, "esm"), [".js.map"])
                     if has_source_map else [[]])
  _tsc_action(prefix="esm", outputs=gen_js_esm + gen_d_ts_esm + gen_meta_esm + gen_js_map_esm,
              compiler_options={
                  "module": "es2015",
                  "target": "es2015",
                  "outDir": join_paths(out_dir, "esm"),
                  "sourceMap": ctx.attr.source_map,
                  "inlineSourceMap": ctx.attr.inline_source_map,
              }, **common_args)

  gen_d_ts_internal, = _map_files(
      ctx, ts_files, root_dir, join_paths(out_dir, "internal"), [".d.ts"])
  gen_meta_internal, = (
      _map_files(ctx, ts_files, root_dir, join_paths(out_dir, "internal"), [".metadata.json"])
      if is_tsc_wrapped else [[]])
  _tsc_action(prefix="internal", outputs=gen_d_ts_internal + gen_meta_internal,
              compiler_options={
                  "stripInternal": False,
                  "outDir": join_paths(out_dir, "internal"),
                  "sourceMap": True,
                  "inlineSourceMap": False
              }, **common_args)

  module_name = ctx.attr.module_name or ctx.label.name
  abs_package = join_paths(ctx.label.workspace_root, ctx.configuration.bin_dir.path,
                           ctx.label.package, out_dir)
  ret = struct(
      files = set(gen_js + gen_js_map),
      runfiles = ctx.runfiles(
          files = gen_js + gen_js_map,
          collect_default = True,
          collect_data = True,
      ),
      typescript = struct(
          module_name = module_name,
          # The rootDir relative to the current package.
          package_dir = out_dir,
          # The declarations of the current module
          declarations = gen_d_ts,
          metadata = gen_meta,
          # All declaration files in the transitive closure
          tc_declarations = tc_declarations + gen_d_ts,
          # Paths to declaration files to be loaded explicitly with "files",
          # relative to workspace.
          tc_types = tc_types,
          # Mapping to declaration files to be loaded implicitly with "paths",
          # relative to workspace.
          tc_paths = _merge_dict(tc_paths, {
              # We simply assume an index.d.ts exists. TypeScript will give the
              # same "Cannot find module" if it isn't true.
              module_name: join_paths(abs_package, "index"),
              module_name + "/*": join_paths(abs_package, "*"),
          }),
          # The @internal variant of the declaration files. Optional.
          internal = struct(
              package_dir = join_paths(out_dir, "internal"),
              declarations = gen_d_ts_internal,
              tc_declarations = tc_declarations_internal + gen_d_ts_internal,
              tc_paths = _merge_dict(tc_paths_internal, {
                  module_name: join_paths(abs_package, "internal/index"),
                  module_name + "/*": join_paths(abs_package, "internal/*"),
              }),
          ),
          # This struct exists solely for npm_package to work simpler.
          # TypeScript-agnostic tools should use javascript_esm.
          esm = struct(
              files = gen_js_esm + gen_js_map_esm,
              declarations = gen_d_ts_esm,
              metadata = gen_meta_esm,
              module_name = module_name,
              package_dir = out_dir,
          ),
      ),
      nodejs = struct(),
      javascript = struct(
          files = gen_js + gen_js_map,
          module_name = module_name,
          package_dir = out_dir,
      ),
      javascript_esm = struct(
          files = gen_js_esm + gen_js_map_esm,
          module_name = module_name,
          package_dir = out_dir,
      ),
  )

  return ret

def _tsc_action(*, ctx, prefix, inputs, outputs, input_tsconfig, mixin_tsconfig, compiler_options,
                angular_compiler_options=None):
  mixin_tsconfig = _merge_dict(mixin_tsconfig, {
      "compilerOptions": _merge_dict(mixin_tsconfig["compilerOptions"], compiler_options),
      "angularCompilerOptions": _merge_dict(mixin_tsconfig["angularCompilerOptions"],
                                            angular_compiler_options or {}),
  })
  target_name = "{}".format(ctx.label, " ({})".format(prefix) if prefix else "default")

  tsconfig = ctx.new_file(ctx.label.name + ("_" + prefix if prefix else "") + "_tsconfig.json")
  ctx.action(
      progress_message = "Generating tsconfig.json for {}".format(target_name),
      inputs = [input_tsconfig],
      outputs = [tsconfig],
      executable = ctx.executable._merge_tsconfig,
      arguments = ["--file", input_tsconfig.path, json_encode(mixin_tsconfig), "--out",
                   tsconfig.path],
  )

  is_tsc_wrapped = "bootstrap" not in ctx.executable.compiler.path
  ctx.action(
      progress_message = "Compiling TypeScript {}".format(target_name),
      mnemonic = "TypeScriptCompile",
      inputs = inputs + [tsconfig],
      outputs = outputs,
      executable = ctx.executable.compiler,
      arguments = ["@@" + tsconfig.path] if is_tsc_wrapped else ["--project", tsconfig.path],
      execution_requirements = {"supports-workers": "1"} if is_tsc_wrapped else {},
  )

ts_library = rule(
    _ts_library_impl,
    attrs = {
        "compiler": attr.label(
            default = Label("//:tsc-wrapped_bin"),
            executable = True,
            single_file = True,
        ),
        "tsconfig": attr.label(allow_files=True, single_file=True, mandatory=True),
        "srcs": attr.label_list(
            allow_files = FileType([
                ".ts",  # This also implicitly accepts .d.ts.
                ".tsx",
            ]),
            mandatory = True,
        ),
        "deps": attr.label_list(providers=["typescript"]),
        "deps_use_internal": attr.label_list(providers=["typescript"]),
        "data": attr.label_list(allow_files=True, cfg=DATA_CFG),
        "module_name": attr.string(),
        "root_dir": attr.string(default=""),
        "out_dir": attr.string(default=""),
        "source_map": attr.bool(default=True),
        "inline_source_map": attr.bool(default=False),

        "_merge_tsconfig": attr.label(
            default = Label("//build_defs/tools:merge_tsconfig"),
            executable = True,
        ),
    },
)

def _merge_dict(a, *args):
  ret = dict(a)
  for d in args:
    ret.update(d)
  return ret


def _drop_dir(path, directory):
  if not path.startswith(directory):
    fail("Path \"%s\" does not reside in directory \"%s\"" % (path, directory))
  if directory:
    return path[len(directory) + 1:]
  else:
    return path


def _map_files(ctx, files, root_dir, out_dir, exts):
  """Creates sets of output files given directory and extension mappings.

  root_dir and out_dir are specified relative to the package.
  """
  ret = [[] for _ in exts]
  for f in files:
    path_in_package = _drop_dir(f.short_path, ctx.label.package)
    path_in_package_without_ext = path_in_package[:path_in_package.rfind(".")]
    for i, ext in enumerate(exts):
      filename = join_paths(out_dir, _drop_dir(path_in_package_without_ext, root_dir) + ext)
      ret[i].append(ctx.new_file(filename))

  return ret


def ts_esm_files(target):
  return target.javascript_esm.files


def _ts_ext_library_impl(ctx):
  """ts_ext_library

  Basically a nodejs_module with d.ts files.
  """

  module_name = ctx.attr.module_name or ctx.label.name
  # The d.ts files of a ts_ext_library rule lives in the source directory
  # instead of the bin directory
  abs_package = join_paths(ctx.label.workspace_root, ctx.label.package, ctx.attr.root_dir)

  if (not ctx.attr.entry_point and len(ctx.files.declarations) == 1 and
      ctx.files.declarations[0].path.endswith(".d.ts")):
    entry_point_file, entry_point_relative_path = ctx.files.declarations, ""
  else:
    entry_point_file, entry_point_relative_path = pick_file_in_dir(
        ctx.files.declarations, ctx.label, ctx.attr.entry_point or "index.d.ts")

  tc_declarations, tc_types, tc_paths = set(), set(), {}
  tc_declarations_internal, tc_paths_internal = set(), {}

  for dep in ctx.attr.deps:
    tc_declarations += dep.typescript.tc_declarations
    tc_types += dep.typescript.tc_types
    tc_paths.update(dep.typescript.tc_paths)

  return struct(
      files = set(ctx.files.srcs),
      runfiles = ctx.runfiles(
          files = ctx.files.srcs,
          collect_data = True,
          collect_default = True,
      ),
      typescript = struct(
          module_name = module_name,
          package_dir = ctx.attr.root_dir,
          declarations = ctx.files.declarations,
          tc_declarations = tc_declarations + ctx.files.declarations,
          tc_types =
              tc_types + set([join_paths(entry_point_file.path, entry_point_relative_path)]),
          tc_paths = _merge_dict(tc_paths, {
              module_name: join_paths(entry_point_file.path, entry_point_relative_path),
              module_name + "/*": join_paths(abs_package, "*"),
          } if not ctx.attr.ambient else {}),
      ),
      nodejs = struct(),
      javascript = struct(
          files = ctx.files.srcs,
          module_name = module_name,
          package_dir = ctx.attr.root_dir,
      ),
  )


ts_ext_library = rule(
    _ts_ext_library_impl,
    attrs = {
        "srcs": attr.label_list(allow_files=True),
        "deps": attr.label_list(providers=["typescript"], cfg=DATA_CFG),
        "data": attr.label_list(allow_files=True, cfg=DATA_CFG),
        "declarations": attr.label_list(allow_files=FileType([".d.ts"]), mandatory=True),
        "ambient": attr.bool(mandatory=True),
        "module_name": attr.string(),
        "root_dir": attr.string(default=""),
        "entry_point": attr.string(),
    }
)

