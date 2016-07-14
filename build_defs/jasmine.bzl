_JASMINE_ATTRS = {
    "srcs": attr.label_list(allow_files=True, cfg = DATA_CFG),
    "deps": attr.label_list(cfg = DATA_CFG),
    "helpers": attr.string_list(default=[]),

    "name_": attr.string(), # Used for name mangling of jasmine.json
    "_jasmine": attr.label(default=Label("//:jasmine"), single_file=True),
    "_config_template": attr.label(
        allow_files=True,
        single_file=True,
        default=Label("//build_defs:jasmine_config_template")
    ),
    "_launcher_template": attr.label(
        allow_files=True,
        single_file=True,
        default=Label("//build_defs:jasmine_launcher_template")
    ),
}

def _jasmine_node_test_impl(ctx):
  # TODO: name mangling
  config_file = ctx.new_file("%s-jasmine.json" % ctx.attr.name_)

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
          "TEMPLATED_jasmine": ctx.file._jasmine.short_path,
          "TEMPLATED_config": config_file.short_path,
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
    attrs = _JASMINE_ATTRS,
)
