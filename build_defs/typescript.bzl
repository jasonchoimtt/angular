load("//build_defs:utils.bzl", "join_paths", "normalize_path", "map_files", "drop_dir",
     "pseudo_json_encode", "pick_file_in_dir", "pick_provider", "bin_dir_path", "source_dir_path",
     "sum")
load("//build_defs:nodejs.bzl", "create_nodejs_provider")


def _ts_library_impl(ctx):
  """ts_library

  Rule to compile TypeScript code.

  Args:
    deps: ts_* dependencies.
    deps_use_internal: ts_library dependencies for which @internal declarations
      should be used. Must be a subset of deps. Note that if this target is used
      downstream, you should ensure that the resultant declarations will be
      compatible with upstream declarations when all @internal's are stripped.
    data: Files and Node.js dependencies to include.
    module_name: The module name of the package. Defaults to the target name.
    module_root: The TypeScript rootDir relative to the package. Defaults to the
      location of the tsconfig.json file.
    out_dir: The TypeScript outDir relative to the package. Defaults to
      module_root.
    source_map: Corresponds to sourceMap in TypeScript.
    inline_source_map: Corresponds to inlineSourceMap in TypeScript.
    is_leaf: Declares that this ts_library will not be depended on by other
      TypeScript libraries. This disables declaration and metadata generation.
  """
  # Directory structure:
  # bazel-angular/ (execroot)
  #   bazel-out/foo/bin/
  #     path-to-package/
  #       out/dir/
  #         *.js, *.d.ts, *.metadata.json
  #         cjs/*.js
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
  #     cjs/*.js, *.d.ts, *.metadata.json
  #     internal/*.d.ts, *.metadata.json

  for src in ctx.attr.srcs:
    if src.label.package != ctx.label.package:
      # Sources can be in sub-folders, but not in sub-packages.
      fail("Sources must be in the same package as the ts_library rule, " +
           "but {} is not in {}".format(src.label, ctx.label.package), "srcs")

  for dep in ctx.attr.deps:
    if dep.typescript.is_leaf:
      fail("{} is a leaf library and cannot be depended on".format(dep.label), "deps")

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
  tc_declarations = sum([d.typescript.tc_declarations for d in ctx.attr.deps], empty=set())
  tc_types = sum([d.typescript.tc_types for d in ctx.attr.deps], empty=set())
  tc_paths = sum([d.typescript.tc_paths for d in ctx.attr.deps], empty={})

  tc_declarations_internal = sum(
      [d.typescript.tc_declarations
       if d not in ctx.attr.deps_use_internal else d.typescript.tc_declarations_internal
       for d in ctx.attr.deps if d not in ctx.attr.deps_use_internal] +
      [d.typescript.internal.tc_declarations
       for d in ctx.attr.deps if d in ctx.attr.deps_use_internal], empty=set())
  tc_paths_internal = sum(
      [d.typescript.tc_paths for d in ctx.attr.deps if d not in ctx.attr.deps_use_internal] +
      # Do this after the normal stuff so that the @internal transitive closure
      # will take precedence.
      [d.typescript.internal.tc_paths
       for d in ctx.attr.deps if d in ctx.attr.deps_use_internal], empty={})

  # Notice that the paths in the tsconfig.json should be relative to the file.
  tsconfig_to_workspace = "/".join([".." for x in bin_dir_path(ctx, ctx.label).split("/")])

  # These two are package-relative.
  # normalize_path handles the case where root_dir/out_dir is set to ".".
  # TypeScript notoriously doesn't work with paths with /./ in the middle.
  root_dir = normalize_path(
      ctx.attr.module_root or drop_dir(ctx.file.tsconfig.dirname, ctx.label.package))
  out_dir = normalize_path(ctx.attr.out_dir or root_dir)

  ts_files = [f for f in ctx.files.srcs if not f.short_path.endswith(".d.ts")]
  base_tsconfig = {
      "compilerOptions": {
          "rootDir": join_paths(
              tsconfig_to_workspace, source_roots[0], ctx.label.package, root_dir),
          "paths": {module: [join_paths(tsconfig_to_workspace, path)]
                    for module, path in tc_paths_internal.items()},
          # Required to use paths.
          "baseUrl": ".",

          "skipLibCheck": True,
          "stripInternal": True,

          "declaration": not ctx.attr.is_leaf,

          # All dependencies should be loaded with "deps", so we don't need the
          # node-style resolution nor @types resolution. This also improves
          # consistency in sandboxed and unsandboxed environments.
          "moduleResolution": "classic",
          "typeRoots": [],

          # TODO: fix the path encoded in .js.map
          "sourceMap": ctx.attr.source_map,
          "inlineSourceMap": ctx.attr.inline_source_map,
      },
      "angularCompilerOptions": {
          "skipMetadataEmit": ctx.attr.is_leaf,
      },
      "files": ([join_paths(tsconfig_to_workspace, f.path) for f in ctx.files.srcs] +
                [join_paths(tsconfig_to_workspace, path) for path in tc_types]),
  }
  tsc_action_args = dict(
      ctx = ctx,
      inputs = ctx.files.srcs + list(tc_declarations_internal),
      ts_files = ts_files,
      root_dir = root_dir,
      out_dir = out_dir,
  )

  has_source_map = ctx.attr.source_map and not ctx.attr.inline_source_map
  is_tsc_wrapped = "bootstrap" not in ctx.executable.compiler.path
  is_leaf = ctx.attr.is_leaf

  tsconfig = _tsconfig_action(
      ctx = ctx,
      prefix = "",
      input_tsconfig = ctx.file.tsconfig,
      mixin_tsconfig = _tsconfig_with(base_tsconfig, {"module": "es2015", "outDir": out_dir}),
  )
  gen_js, gen_d_ts, gen_meta, gen_js_map = _tsc_action(
      prefix = "",
      gen_config = (True, not is_leaf, not is_leaf and is_tsc_wrapped, has_source_map),
      tsconfig = tsconfig,
      **tsc_action_args
  )

  tsconfig_cjs = _tsconfig_action(
      ctx = ctx,
      prefix = "cjs",
      input_tsconfig = ctx.file.tsconfig,
      mixin_tsconfig = _tsconfig_with(base_tsconfig, {
          "module": "commonjs",
          "outDir": join_paths(out_dir, "cjs"),
      }),
  )
  gen_js_cjs, gen_d_ts_cjs, gen_meta_cjs, gen_js_map_cjs = _tsc_action(
      prefix = "cjs",
      gen_config = (True, not is_leaf, not is_leaf and is_tsc_wrapped, has_source_map),
      tsconfig = tsconfig_cjs,
      **tsc_action_args
  )

  tsconfig_internal = _tsconfig_action(
      ctx = ctx,
      prefix = "internal",
      input_tsconfig = ctx.file.tsconfig,
      mixin_tsconfig = _tsconfig_with(base_tsconfig, {
          "stripInternal": False,
          "sourceMap": False,
          "inlineSourceMap": False,
          "outDir": join_paths(out_dir, "internal"),
      }),
  )

  if not is_leaf:
    _, gen_d_ts_internal, gen_meta_internal, _ = _tsc_action(
        prefix = "internal",
        gen_config = (False, True, is_tsc_wrapped, False),
        tsconfig = tsconfig_internal,
        **tsc_action_args
    )
  else:
    gen_d_ts_internal, gen_meta_internal = [], []

  module_name = ctx.attr.module_name or ctx.label.name
  abs_package = bin_dir_path(ctx, ctx.label, out_dir)
  return struct(
      files = set(gen_js),
      runfiles = ctx.runfiles(
          files = gen_js + gen_js_map,
          collect_default = True,
          collect_data = True,
      ),
      typescript = struct(
          module_name = module_name,
          # The rootDir relative to the current package.
          module_root = out_dir,
          # The declarations of the current module
          declarations = gen_d_ts,
          source_maps = gen_js_map,
          metadata = gen_meta,
          # All declaration files in the transitive closure
          tc_declarations = tc_declarations + gen_d_ts,
          # Paths to declaration files to be loaded explicitly with "files",
          # relative to workspace.
          tc_types = tc_types,
          # Mapping to declaration files to be loaded implicitly with "paths",
          # relative to workspace.
          tc_paths = tc_paths + {
              # We simply assume an index.d.ts exists. TypeScript will give the
              # same "Cannot find module" if it isn't true.
              module_name: join_paths(abs_package, "index"),
              module_name + "/*": join_paths(abs_package, "*"),
          },
          # The @internal variant of the declaration files. Optional.
          internal = struct(
              module_root = join_paths(out_dir, "internal"),
              declarations = gen_d_ts_internal,
              tc_declarations = tc_declarations_internal + gen_d_ts_internal,
              tc_paths = tc_paths_internal + {
                  module_name: join_paths(abs_package, "internal/index"),
                  module_name + "/*": join_paths(abs_package, "internal/*"),
              },
          ),
          # cjs = struct(
          #     files = gen_js_cjs,
          #     source_maps = gen_js_map_cjs,
          #     declarations = gen_d_ts_cjs,
          #     metadata = gen_meta_cjs,
          #     module_name = module_name,
          #     module_root = join_paths(out_dir, "cjs"),
          # ),
          is_leaf = is_leaf,
      ),
      nodejs = create_nodejs_provider(
          ctx=ctx, files=gen_js_cjs, module_name=module_name,
          module_root=join_paths(out_dir, "cjs"),
          collect_mapping_from=ctx.attr.deps + ctx.attr.data),
      javascript = struct(
          files = gen_js + gen_js_map,
          source_maps = gen_js_map,
          module_name = module_name,
          module_root = out_dir,
      ),
      javascript_cjs = struct(
          files = gen_js_cjs,
          source_maps = gen_js_map_cjs,
          module_name = module_name,
          module_root = join_paths(out_dir, "cjs"),
      ),
  )

def _tsconfig_with(base, compiler_options={}, angular_compiler_options={}):
  return base + {
      "compilerOptions": base["compilerOptions"] + compiler_options,
      "angularCompilerOptions": base["angularCompilerOptions"] + angular_compiler_options,
  }

def _tsconfig_action(*, ctx, prefix, input_tsconfig, mixin_tsconfig):
  tsconfig = ctx.new_file(ctx.label.name + ("_" + prefix if prefix else "") + "_tsconfig.json")

  target_name = "{}{}".format(ctx.label, " ({})".format(prefix) if prefix else "")
  ctx.action(
      progress_message = "Generating tsconfig.json for {}".format(target_name),
      inputs = [input_tsconfig],
      outputs = [tsconfig],
      executable = ctx.executable._merge_tsconfig,
      arguments = ["--file", input_tsconfig.path, pseudo_json_encode(mixin_tsconfig), "--out",
                   tsconfig.path],
  )

  return tsconfig

def _tsc_action(*, ctx, inputs, ts_files, root_dir, out_dir, prefix, gen_config, tsconfig):
  real_out_dir = join_paths(out_dir, prefix)
  has_js, has_d_ts, has_meta, has_js_map = gen_config

  gen_js = map_files(ctx, ts_files, root_dir, real_out_dir, ".js") if has_js else []
  gen_d_ts = map_files(ctx, ts_files, root_dir, real_out_dir, ".d.ts") if has_d_ts else []
  gen_meta = map_files(ctx, ts_files, root_dir, real_out_dir, ".metadata.json") if has_meta else []
  gen_js_map = map_files(ctx, ts_files, root_dir, real_out_dir, ".js.map") if has_js_map else []

  is_tsc_wrapped = "bootstrap" not in ctx.executable.compiler.path
  target_name = "{}{}".format(ctx.label, " ({})".format(prefix) if prefix else "")
  ctx.action(
      progress_message = "Compiling TypeScript {}".format(target_name),
      mnemonic = "TypeScriptCompile",
      inputs = inputs + [tsconfig],
      outputs = gen_js + gen_d_ts + gen_meta + gen_js_map,
      executable = ctx.executable.compiler,
      arguments = ["@@" + tsconfig.path] if is_tsc_wrapped else ["--project", tsconfig.path],
      execution_requirements = {"supports-workers": "1"} if is_tsc_wrapped else {},
  )

  return gen_js, gen_d_ts, gen_meta, gen_js_map

_ts_library = rule(
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
        "module_root": attr.string(default=""),
        "out_dir": attr.string(default=""),
        "source_map": attr.bool(default=True),
        "inline_source_map": attr.bool(default=False),
        "is_leaf": attr.bool(default=False),

        "_merge_tsconfig": attr.label(
            default = Label("//build_defs/tools:merge_tsconfig"),
            executable = True,
        ),
    },
)

def ts_library(*, name, **kwargs):
  _ts_library(name=name, **kwargs)
  # pick_provider(name=name + "_cjs", srcs=[":" + name], providers=["javascript_cjs.files"])


def _ts_ext_library_impl(ctx):
  """ts_ext_library

  Basically a nodejs_module with d.ts files.
  """

  module_name = ctx.attr.module_name or ctx.label.name
  module_root = ctx.attr.module_root
  # The d.ts files of a ts_ext_library rule lives in the source directory
  # instead of the bin directory
  abs_package = source_dir_path(ctx.label, ctx.attr.module_root)

  if (not ctx.attr.typings and len(ctx.files.declarations) == 1 and
      ctx.files.declarations[0].path.endswith(".d.ts")):
    typings_file, typings_relative_path = ctx.files.declarations, ""
  else:
    typings_file, typings_relative_path = pick_file_in_dir(
        ctx.files.declarations, ctx.label,
        join_paths(module_root, ctx.attr.typings or "index.d.ts"))

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
          module_root = ctx.attr.module_root,
          declarations = ctx.files.declarations,
          tc_declarations = tc_declarations + ctx.files.declarations,
          tc_types =
              tc_types + set([join_paths(typings_file.path, typings_relative_path)]),
          tc_paths = tc_paths + ({
              module_name: join_paths(typings_file.path, typings_relative_path),
              module_name + "/*": join_paths(abs_package, "*"),
          } if not ctx.attr.ambient else {}),
          is_leaf = False,
      ),
      nodejs = create_nodejs_provider(
          ctx=ctx, files=ctx.files.srcs, module_name=module_name,
          module_root=module_root, entry_point=ctx.attr.entry_point,
          collect_mapping_from=ctx.attr.srcs + ctx.attr.deps + ctx.attr.data),
      javascript = struct(
          files = ctx.files.srcs,
          module_name = module_name,
          module_root = ctx.attr.module_root,
      ),
  )


ts_ext_library = rule(
    _ts_ext_library_impl,
    attrs = {
        "srcs": attr.label_list(allow_files=True),
        "deps": attr.label_list(providers=["typescript"], cfg=DATA_CFG),
        "data": attr.label_list(allow_files=True, cfg=DATA_CFG),
        "entry_point": attr.string(),  # For Node.js
        "module_name": attr.string(),
        "module_root": attr.string(default=""),

        "declarations": attr.label_list(allow_files=FileType([".d.ts"]), mandatory=True),
        "ambient": attr.bool(mandatory=True),
        "typings": attr.string(),
    }
)

