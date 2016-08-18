# Description:
# Builds a project that depends on all modules.

load("//build_defs:typescript.bzl", "ts_library")

ts_library(
    name = "typings-test",
    srcs = [
        "include-all.ts",
    ],
    deps = [
        "//:core",
        "//:compiler",
        "//:common",
        "//:forms",
        "//:platform-browser",
        "//:platform-browser-dynamic",
        "//:platform-server",
        "//:http",
        "//:router",
        "//:router-deprecated",
        "//:upgrade",
        "//:compiler-cli",
    ],
    tsconfig = "tsconfig-bazel.json",
    visibility = ["//visibility:public"],
)
