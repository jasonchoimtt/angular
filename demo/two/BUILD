package(default_visibility=["//visibility:public"])

load("//build_defs:typescript.bzl", "ts_library")

ts_library(
    name = "two",
    srcs = glob(["**/*.ts"]),
    deps = ["//demo/one"],
    tsconfig = "tsconfig.json",
    module_name = "two",
)
