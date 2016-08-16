package(default_visibility=["//visibility:public"])

load("//build_defs:nodejs.bzl", "nodejs_module")

filegroup(
    name = "nodejs_launcher_template",
    srcs = ["nodejs_launcher_template.sh"],
)

filegroup(
    name = "jasmine_config_template",
    srcs = ["jasmine_config_template.json"],
)

filegroup(
    name = "jasmine_launcher_template",
    srcs = ["jasmine_launcher_template.sh"],
)

filegroup(
    name = "karma_launcher_template",
    srcs = ["karma_launcher_template.sh"],
)

filegroup(
    name = "rollup_config_template",
    srcs = ["rollup_config_template.js"],
)

filegroup(
    name = "protractor_launcher_template",
    srcs = ["protractor_launcher_template.sh"],
)

filegroup(
    name = "ts_api_guardian_launcher_template",
    srcs = ["ts_api_guardian_launcher_template.sh"],
)

filegroup(
    name = "check_cycle",
    srcs = ["check_cycle.js"],
)

nodejs_module(
    name = "node_modules_indexer",
    srcs = ["node_modules_indexer.js"],
)
