def _jasmine_node_test_impl(ctx):
  """
  Rule for running Jasmine tests on NodeJS.

  Args:
    srcs: The targets containing the spec files.
    deps: JavaScript targets which the tests depend on.
    data: Data files which the tests depend on.
    helpers: List of paths to helper files to be loaded, relative to the package.
  """
  # This rule works by creating a Jasmine config file with a list of helper and
  # spec files, then creating a launcher shell script that runs Jasmine CLI with
  # the said config file.
  config_file = ctx.new_file("%s_jasmine.json" % ctx.label.name)

  ctx.template_action(
      template = ctx.file._config_template,
      output = config_file,
      substitutions = {
          "{{srcs}}": ", ".join(["\"%s\"" % f.short_path for f in ctx.files.srcs]),
          "{{helpers}}": ", ".join(["\"%s\"" % helper for helper in ctx.attr.helpers]),
      },
  )

  ctx.template_action(
      template = ctx.file._launcher_template,
      output = ctx.outputs.executable,
      substitutions = {
          "{{jasmine}}": ctx.executable._jasmine.short_path,
          "{{config}}": config_file.short_path,
      },
      executable = True,
  )

  return struct(
      files = set([ctx.outputs.executable]),
      runfiles = ctx.runfiles(
          files = ctx.files.srcs + ctx.files._jasmine + [config_file],
          transitive_files = set(ctx.attr._jasmine.default_runfiles.files),
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
        "helpers": attr.string_list(default=[]),

        "_jasmine": attr.label(default=Label("//:jasmine"), executable=True),
        "_config_template": attr.label(
            default = Label("//build_defs:jasmine_config_template"),
            allow_files = True,
            single_file = True,
        ),
        "_launcher_template": attr.label(
            default = Label("//build_defs:jasmine_launcher_template"),
            allow_files = True,
            single_file = True,
        ),
    },
)
