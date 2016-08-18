package(default_visibility=["//visibility:public"])

load("//build_defs:nodejs.bzl", "nodejs_module")

# These files are exported as filegroups with their extension stripped.
EXPORTED_FILES = [
    "nodejs_launcher_template.sh",
    "jasmine_config_template.json",
    "jasmine_launcher_template.sh",
    "karma_launcher_template.sh",
    "rollup_config_template.js",
    "protractor_launcher_template.sh",
    "ts_api_guardian_launcher_template.sh",
    "check_cycle.js",
]

[
    filegroup(name=f[:f.rfind(".")], srcs = [f])
    for f in EXPORTED_FILES
]

nodejs_module(
    name = "node_modules_indexer",
    srcs = ["node_modules_indexer.js"],
)
