load("//build_defs:utils.bzl", "join_paths", "normalize_path")

def _get_transitive_ts_decls(ctx):
  all_deps_declarations = set()
  for dep in ctx.attr.deps:
    if hasattr(dep, "typescript"):
      all_deps_declarations += dep.typescript.transitive_declarations
  return list(all_deps_declarations)


def _drop_dir(path, directory):
  if not path.startswith(directory):
    fail("Path \"%s\" does not reside in directory \"%s\"" % (path, directory))
  if directory:
    return path[len(directory) + 1:]
  else:
    return path


def _map_files(ctx, files, root_dir, out_dir, ext):
  """Creates output files given directory and extension mappings.

  root_dir and out_dir are specified relative to the package.
  """
  ret = []
  for f in files:
    path_in_package = _drop_dir(f.short_path, ctx.label.package)
    path_in_package_without_ext = path_in_package[:path_in_package.rfind(".")]
    filename = join_paths(out_dir, _drop_dir(path_in_package_without_ext, root_dir) + ext)
    ret.append(ctx.new_file(filename))

  return ret


def _compile_ts(ctx):
  """Creates actions to compile TypeScript code.

  Args:
    ctx: The Skylark context.

  Attrs:
    deps: ts_* dependencies.
    deps_use_internal: ts_* dependencies for which @internal declarations should
      be used. Must be a subset of deps.
    module_name: The ES6 module name of the package.
    root_dir: The TypeScript rootDir relative to the package.
    out_dir: The TypeScript outDir relative to the package.
    write_metadata: Whether to output .metadata.json.
  """

  # Directory structure:
  # bazel-angular/ (root of all generated files)
  #   path/to/bin/dir/
  #     path-to-package/
  #       out/dir/
  #         prefix/ (if any)
  #           *.js, *.d.ts, *.metadata.json
  #       target-label_flavor_tsconfig.json
  #   path-to-package/
  #     *.ts
  #     *.d.ts
  #     tsconfig.json

  # Merged tree: (e.g. in runfiles)
  # path-to-package/
  #   *.ts
  #   *.js, *.d.ts, *.metadata.json
  #   es6/
  #     *.js, *.d.ts, *.metadata.json
  #   internal/
  #     *.js, *.d.ts, *.metadata.json
  #
  # Notice that the paths in the tsconfig.json should be relative to the file.

  for src in ctx.attr.srcs:
    if src.label.package != ctx.label.package:
      # Sources can be in sub-folders, but not in sub-packages.
      fail("Sources must be in the same package as the ts_library rule, " +
           "but %s is not in %s" % (src.label, ctx.label.package), "srcs")

  # for f in ctx.files.srcs:
  #   if f.short_path.endswith(".d.ts"):
  #     # The file being a .ts or .tsx is enforced by the attributes definition.
  #     # We only need to special case .d.ts because it is also a .ts file.
  #     fail("Sources must be *.ts or *.tsx files, but %s is not" % f.short_path, "srcs")

  for dep in ctx.attr.deps_use_internal:
    if dep not in ctx.attr.deps:
      fail("deps_use_internal must be a subset of deps", "deps_use_internal")

  transitive_module_d_ts = set([f for f in ctx.files.srcs if f.short_path.endswith(".d.ts")])
  transitive_module_mappings = {}
  transitive_ambient_d_ts = set()
  for dep in ctx.attr.deps:
    if hasattr(dep, "typescript"):
      if dep in ctx.attr.deps_use_internal:
        flavor = dep.typescript.flavors.internal
      else:
        flavor = dep.typescript.flavors.default
      transitive_module_d_ts += flavor.transitive_module_declarations
      # Note that we don't check for module name collisions.
      transitive_module_mappings.update(flavor.transitive_module_mappings)
      transitive_ambient_d_ts += flavor.transitive_ambient_declarations
  transitive_module_d_ts = list(transitive_module_d_ts)
  transitive_ambient_d_ts = list(transitive_ambient_d_ts)

  tsconfig_to_workspace = "/".join([".." for x in ctx.configuration.bin_dir.path.split("/") if x] +
                                   [".." for x in ctx.label.package.split("/") if x])

  root_dir = ctx.attr.root_dir or _drop_dir(ctx.file.tsconfig.dirname, ctx.label.package)
  base_out_dir = ctx.attr.out_dir or _drop_dir(ctx.file.tsconfig.dirname, ctx.label.package)
  source_ts = [f for f in ctx.files.srcs if not f.short_path.endswith(".d.ts")]

  # Construct shared compiler options.
  paths = {}
  for module_name, package_dir in transitive_module_mappings.items():
    mapped_dir = join_paths(tsconfig_to_workspace, ctx.configuration.bin_dir.path, package_dir)
    paths[module_name] = [mapped_dir]
    paths[module_name + "/*"] = [mapped_dir + "/*"]

  # Specifically override the modules for which we need to use @internal
  # typings. This is sufficient because @internal are only for direct deps.
  for dep in ctx.attr.deps_use_internal:
    module_name = dep.typescript.module_name
    mapped_dir = join_paths(tsconfig_to_workspace, ctx.configuration.bin_dir.path,
                            dep.typescript.flavors.internal.package_dir)
    paths[module_name] = [mapped_dir]
    paths[module_name + "/*"] = [mapped_dir + "/*"]

  files = [join_paths(tsconfig_to_workspace, src.path)
           for src in source_ts + transitive_ambient_d_ts]
  base_compiler_options = {
      "rootDir": join_paths(tsconfig_to_workspace, ctx.label.package, root_dir),
      "paths": paths,
      # Filter out .metadata.json. Those will be resolved automagically by
      # tsc-wrapped if they are needed.
      "skipLibCheck": True,
      "stripInternal": True,
      "typeRoots": [],
      "baseUrl": ".",
      "declaration": True,
  }

  flavor_structs = {}

  if "default" not in ctx.attr.flavors:
    fail("\"default\" flavor must be specified.", "flavors")

  for flavor in ctx.attr.flavors:
    output_prefix = ""
    compiler_options = dict(base_compiler_options)

    generated_js = []
    generated_d_ts = []
    generated_metadata = []

    if flavor == "default":
      output_prefix = ""
      out_dir = join_paths(base_out_dir, output_prefix)
      generated_js = _map_files(ctx, source_ts, root_dir, out_dir, ".js")
      generated_d_ts = _map_files(ctx, source_ts, root_dir, out_dir, ".d.ts")
      if ctx.attr.write_metadata:
        generated_metadata = _map_files(ctx, source_ts, root_dir, out_dir, ".metadata.json")

    elif flavor == "es6":
      output_prefix = "es6"
      out_dir = join_paths(base_out_dir, output_prefix)
      compiler_options.update({
          "module": "es2015",
          "target": "es2015",
      })
      generated_js = _map_files(ctx, source_ts, root_dir, out_dir, ".js")
      generated_d_ts = _map_files(ctx, source_ts, root_dir, out_dir, ".d.ts")
      if ctx.attr.write_metadata:
        generated_metadata = _map_files(ctx, source_ts, root_dir, out_dir, ".metadata.json")

    elif flavor == "internal":
      output_prefix = "internal"
      out_dir = join_paths(base_out_dir, output_prefix)
      compiler_options.update({
          "stripInternal": False,
      })
      # We don't need js files for internal .d.ts files
      generated_d_ts = _map_files(ctx, source_ts, root_dir, out_dir, ".d.ts")
      if ctx.attr.write_metadata:
        generated_metadata = _map_files(ctx, source_ts, root_dir, out_dir, ".metadata.json")

    else:
      fail("\"%s\" is not a valid flavor." % flavor, "flavors")

    compiler_options["outDir"] = out_dir

    # We have to write a modified tsconfig.json to add path mappings and
    # control flags that have to be known at analysis phase, e.g. declaration,
    # rootDir, outDir.
    tsconfig = ctx.new_file(
        ctx.label.name + ("_" + output_prefix if output_prefix else "") + "_tsconfig.json")

    _write_tsconfig(ctx, tsconfig, ctx.file.tsconfig, {
        "compilerOptions": compiler_options,
        "angularCompilerOptions": {
            "writeMetadata": ctx.attr.write_metadata,
        },
        "files": files,
    })

    if source_ts:
      has_worker = "tsc-wrapped" in ctx.file.compiler.path
      ctx.action(
        progress_message = "Compiling TypeScript %s (%s)" % (ctx, flavor),
        mnemonic = "TypeScriptCompile",
        inputs = source_ts + transitive_module_d_ts + transitive_ambient_d_ts + [tsconfig],
        outputs = generated_js + generated_d_ts + generated_metadata,
        executable = ctx.executable.compiler,
        arguments = ["@@" + tsconfig.path] if has_worker else ["--project", tsconfig.path],
        execution_requirements = {"supports-workers": "1"} if has_worker else {})

    new_transitive_module_mappings = dict(transitive_module_mappings)
    new_transitive_module_mappings[ctx.attr.module_name] = join_paths(ctx.label.package, out_dir)
    flavor_structs[flavor] = struct(
        files = generated_js,
        # module declarations are loaded by "compilerOptions"."paths".
        # Note that .metadata.json is not a transitive dependency. (for tsc-wrapped).
        transitive_module_declarations = transitive_module_d_ts + generated_d_ts,
        transitive_module_mappings = new_transitive_module_mappings,
        # ambient declarations are loaded by "files".
        transitive_ambient_declarations = transitive_ambient_d_ts,
        package_dir = out_dir,
    )

  return struct(
      # When used directly, the *.js files are the main output.
      files = set(flavor_structs["default"].files),
      runfiles = ctx.runfiles(
          files = list(flavor_structs["default"].files),
          collect_default = True,
          collect_data = True,
      ),
      typescript = struct(
          module_name = ctx.attr.module_name,
          flavors = struct(**flavor_structs),
      ),
  )


def _write_tsconfig(ctx, out, *contents):
  inputs = []
  arguments = ["--out", out.path]

  for content in contents:
    if type(content) == str:
      arguments += [content]
    elif hasattr(content, "update"):  # type(content) == dict, but doesn't work.
      arguments += [str(content).replace("True", "true").replace("False", "false")]
    else:
      inputs += [content]
      arguments += ["--file", content.path]

  ctx.action(
      progress_message = "Generating tsconfig.json for %s" % ctx,
      inputs = inputs,
      outputs = [out],
      executable = ctx.executable._merge_json,
      arguments = arguments,
  )

  return out

# ************ #
# ts_library   #
# ************ #

def _ts_library_impl(ctx):
  """
  Implementation of ts_library. Transpiles TypeScript sources to JavaScript, and
  produces .d.ts files for downstream TypeScript dependencies.
  """
  return _compile_ts(ctx)


# See go/typescript/build_defs#ts-library for user documentation.
ts_library = rule(
    _ts_library_impl,
    attrs = {
        "compiler": attr.label(
            default = Label("//:tsc-wrapped_release"),
            executable = True,
            single_file = True,
        ),
        "tsconfig": attr.label(
            allow_files = True,
            single_file = True,
        ),
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
        "flavors": attr.string_list(default=["default", "internal", "es6"]),
        # module_name, root_dir and out_dir are used in path mappings in
        # tsconfig.json. root_dir and out_dir both default to the directory that
        # tsconfig.json resides in.
        "module_name": attr.string(),
        "root_dir": attr.string(default=""),
        "out_dir": attr.string(default=""),
        "write_metadata": attr.bool(default=False),

        "_merge_json": attr.label(
            default = Label("//:merge_json"),
            executable = True,
        ),
    },
)


def _ts_ext_declaration_impl(ctx):
  """
  Creates a container for TypeScript d.ts files without type checking.
  """

  return struct(
      files = set(ctx.files.srcs),
      runfiles = ctx.runfiles(files = ctx.files.srcs),
      typescript = struct(
          module_name = ctx.attr.module_name,
          flavors = struct(
              default = struct(
                  files = [],
                  transitive_module_declarations = [],
                  transitive_module_mappings = {},
                  transitive_ambient_declarations = ctx.files.srcs,
                  package_dir = join_paths(ctx.label.package, ctx.attr.root_dir),
              ),
          ),
      ),
  )


ts_ext_declaration = rule(
    _ts_ext_declaration_impl,
    attrs = {
        "srcs": attr.label_list(
            allow_files = FileType([".d.ts"]),
            mandatory = True,
        ),
        "module_name": attr.string(),
        "root_dir": attr.string(default=""),
    }
)

def ts_es6_files(target):
  return target.typescript.flavors.es6.files
