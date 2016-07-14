genrule(
    name = "nodejs",
    srcs = ["node"],
    outs = ["nodejs_binary"],
    cmd = "cp $< $@",
    executable = True,
    visibility = ["//visibility:public"],
)
