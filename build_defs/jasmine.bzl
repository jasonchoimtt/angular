load("//build_defs:utils.bzl", "sum")


def _jasmine_node_test_impl(ctx):
  """
  Rule for running Jasmine tests on NodeJS.

  Args:
    srcs: The targets containing the spec files.
    deps: JavaScript targets which the tests depend on.
    data: Data files which the tests depend on.
    helpers: List of JavaScript targets to be loaded as helpers.
  """
  # This rule works by creating a Jasmine config file with a list of helper and
  # spec files, then creating a launcher shell script that runs Jasmine CLI with
  # the said config file.
  config_file = ctx.new_file("%s_jasmine.json" % ctx.label.name)

  # We want to obtain the commonjs source code.
  files = sum([list(getattr(src, "nodejs", src).files) for src in ctx.attr.srcs], empty=[])

  helpers = sum(
      [list(getattr(helper, "nodejs", helper).files) for helper in ctx.attr.helpers], empty=[])

  ctx.template_action(
      template = ctx.file._config_template,
      output = config_file,
      substitutions = {
          "{{srcs}}": ", ".join(["\"%s\"" % f.short_path for f in files]),
          "{{helpers}}": ", ".join(["\"%s\"" % f.short_path for f in helpers]),
      },
  )

  module_mappings = collect_module_mappings(
      *[d.nodejs.module_mappings
        for d in ctx.attr.deps + ctx.attr.helpers + ctx.attr.data if hasattr(d, "nodejs")],
      self_mapping, strict=True)

  launcher_files = _create_nodejs_launcher(
      ctx, ctx.outputs.executable, ctx.attr._jasmine.nodejs.entry_point_file, "", module_mappings,
      'cd ${RUNFILES} && {{}} JASMINE_CONFIG_PATH="${RUNFILES}/{}" "$@"'.format(config_file))

  transitive_files = set(ctx.attr._jasmine.default_runfiles.files)
  for helper in ctx.attr.helpers:
    transitive_files += set(helper.default_runfiles.files)

  return struct(
      files = set([ctx.outputs.executable]),
      runfiles = ctx.runfiles(
          files = files + helpers + ctx.attr._jasmine.nodejs.files + launcher_files + [config_file],
          transitive_files = transitive_files,
          collect_data = True,
          collect_default = True,
      ),
  )

jasmine_node_test = rule(
    implementation = _jasmine_node_test_impl,
    executable = True,
    test = True,
    attrs = {
        "srcs": attr.label_list(allow_files=True),
        "deps": attr.label_list(),
        "data": attr.label_list(allow_files=True, cfg=DATA_CFG),
        "helpers": attr.label_list(default=[], allow_files=True),

        "_jasmine": attr.label(default=Label("//:jasmine_bin"), executable=True),
        "_config_template": attr.label(
            default = Label("//build_defs:jasmine_config_template.json"),
            allow_files = True,
            single_file = True,
        ),
        "_launcher_template": attr.label(
            default = Label("//build_defs:jasmine_launcher_template.sh"),
            allow_files = True,
            single_file = True,
        ),
    },
)
