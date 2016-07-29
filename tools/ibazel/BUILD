load("//build_defs:nodejs.bzl", "nodejs_binary")
load("//build_defs:typescript.bzl", "ts_library")
load("//build_defs:jasmine.bzl", "jasmine_node_test")

ts_library(
    name = "ibazel_module",
    srcs = [
        "environment.ts",
        "index.ts",
        "parser.ts",
        "utils.ts",
    ],
    data = [
        "build.proto",
    ],
    tsconfig = "tsconfig.json",
)

nodejs_binary(
    name = "ibazel",
    srcs = [":ibazel_module", "//:node_modules"],
    entry_point = "index.js",
)

ts_library(
    name = "ibazel_test_module",
    srcs = [
        "environment_mock.ts",
        "environment_spec.ts",
        "index_spec.ts",
        "parser_spec.ts",
        "utils_spec.ts",
    ],
    deps = [
        "//:types-jasmine",
        ":ibazel_module",
    ],
    tsconfig = "tsconfig.json",
)

ts_library(
    name = "ibazel_e2e_test_module",
    srcs = [
        "e2e_spec.ts",
    ],
    deps = [
        "//:types-node",
        "//:types-jasmine",
        ":ibazel_module",
    ],
    data = [
        "//:node_modules",
    ],
    tsconfig = "tsconfig.json",
)

jasmine_node_test(
    name = "ibazel_test",
    srcs = [":ibazel_test_module"],
    size = "small",
)

jasmine_node_test(
    name = "ibazel_e2e_test",
    srcs = [":ibazel_e2e_test_module"],
    size = "small",
)
