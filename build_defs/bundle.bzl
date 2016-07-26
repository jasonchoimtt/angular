load("//build_defs:typescript.bzl", "ts_es6_files")
load("//build_defs:utils.bzl", "join_paths")

def _js_bundle_impl(ctx):
  """
  Rule for creating a minified bundle for JavaScript web libraries. This
  includes tree-shaking with Rollup.js, down-transpiling to ES5 with TypeScript,
  and minifying with UglifyJS.

  Args:
    srcs: Target containing the source library.
    deps: JavaScript targets which the tests depend on.
    rollup_config: Required. Rollup.js config file to use.
    entry_point: Path to the entrypoint file for tree-shaking, relative to
      the package.
    output: Filename of the generated .js file, relative to the package. For
      example, if you specify bundle.js, bundle.js and bundle.min.js will be
      created.
    banner: File to prepend to the generated files. Useful for e.g. copyright
      banners.
  """
  output = (ctx.attr.output or ctx.label.name + ".js")
  output_base = output[:output.rfind(".")]

  # generated_es6 is ES6 code with UMD module.
  generated_es6 = ctx.new_file(output_base + ".es6.js")
  generated_js = ctx.new_file(output_base + ".js")
  generated_min_js = ctx.new_file(output_base + ".min.js")
  # TODO: propagate source maps.
  # generated_es6_map = ctx.new_file(output_base + ".es6.js.map")
  # generated_js_map = ctx.new_file(output_base + ".js.map")
  # generated_min_js_map = ctx.new_file(output_base + ".min.js.map")

  config_file = ctx.new_file("%s_rollup.config.js" % ctx.label.name)

  config_to_workspace = "/".join(
      [".." for x in ctx.configuration.bin_dir.path.split("/") if x] +
      [".." for x in ctx.label.package.split("/") if x])

  ctx.template_action(
      template = ctx.file._rollup_config_template,
      output = config_file,
      substitutions = {
          "{{base_config}}": join_paths(config_to_workspace, ctx.file.rollup_config.path),
          # Unlike tsc, rollup does not resolve paths relative to
          # rollup.config.js.
          "{{entry}}": join_paths(ctx.configuration.bin_dir.path, ctx.label.package,
                                  ctx.attr.entry_point),
          "{{dest}}": generated_es6.path,
          "{{banner}}": (ctx.file.banner.path if ctx.file.banner else ""),
      },
  )

  es6_inputs = []
  for src in ctx.attr.srcs:
    es6_inputs += ts_es6_files(src)

  ctx.action(
      progress_message = "Tree shaking %s" % ctx,
      inputs = es6_inputs + ctx.files.rollup_config + ctx.files.banner + [config_file],
      outputs = [generated_es6],
      executable = ctx.executable._rollup,
      arguments = ["-c", config_file.path],
  )

  ctx.action(
      progress_message = "Compiling ES6 %s" % ctx,
      inputs = [generated_es6],
      outputs = [generated_js],
      executable = ctx.executable._tsc,
      arguments = ["--noResolve", "--target", "es5", "--allowJs", "--typeRoots", "[]", "--out",
                   generated_js.path, generated_es6.path],
  )

  ctx.action(
      progress_message = "Minifying bundle of %s" % ctx,
      inputs = [generated_js],
      outputs = [generated_min_js],
      executable = ctx.executable._uglifyjs,
      arguments = (
          (["--preamble-file", ctx.file.banner.path] if ctx.file.banner else []) +
          ["--c", "--screw-ie8", "-o", generated_min_js.path, generated_js.path]
      ),
  )

  return struct(
      files = set([generated_js, generated_min_js]),
      runfiles = ctx.runfiles(
          files = [generated_js, generated_min_js],
          # TODO: Investigate why setting collect_data = True will serve the
          # source *.js files.
          collect_data = False,
          collect_default = False,
      ),
  )

js_bundle = rule(
    implementation = _js_bundle_impl,
    attrs = {
        "srcs": attr.label_list(allow_files=True),
        "deps": attr.label_list(),
        "rollup_config": attr.label(allow_files=True, single_file=True, mandatory=True),
        "entry_point": attr.string(default="index.js"),
        "output": attr.string(),
        "banner": attr.label(allow_files=True, single_file=True),

        "_rollup": attr.label(default=Label("//:rollup"), executable=True),
        "_uglifyjs": attr.label(default=Label("//:uglifyjs_wrapped"), executable=True),
        "_tsc": attr.label(default=Label("//:tsc_release"), executable=True),
        "_rollup_config_template": attr.label(
            default = Label("//build_defs:rollup_config_template"),
            allow_files = True,
            single_file = True,
        ),
    },
)
