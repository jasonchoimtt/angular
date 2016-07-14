package(default_visibility=["//visibility:public"])

load("//build_defs:nodejs.bzl", "nodejs_binary")
load("//build_defs:typescript.bzl", "ts_ext_declaration", "ts_library")
load("//build_defs:jasmine.bzl", "jasmine_node_test")

###############################################################################
# External dependencies
###############################################################################
# TODO: add source-map-support, reflect-metadata

nodejs_binary(
    name = "tsc_release",
    srcs = glob(["node_modules/typescript/bin/tsc", "node_modules/typescript/**/*.js"]),
    entry_point = "node_modules/typescript/bin/tsc",
)

nodejs_binary(
    name = "jasmine",
    srcs = ["node_modules"],
    entry_point = "node_modules/jasmine/bin/jasmine.js",
)

ts_ext_declaration(
    name = "types-node",
    srcs = glob(["node_modules/@types/node/**/*.d.ts"]),
)

ts_ext_declaration(
    name = "types-jasmine",
    srcs = glob(["node_modules/@types/jasmine/**/*.d.ts"]),
)

ts_ext_declaration(
    name = "types-protractor",
    srcs = glob(["node_modules/@types/protractor/**/*.d.ts"]),
)

ts_ext_declaration(
    name = "types-hammerjs",
    srcs = glob(["node_modules/@types/hammerjs/**/*.d.ts"]),
)

ts_ext_declaration(
    name = "types-selenium-webdriver",
    srcs = glob(["node_modules/@types/selenium-webdriver/**/*.d.ts"]),
    module_name = "selenium-webdriver",
    # FIXME: use a correct path resolution algorithm to fix this
    root_dir = "../../../node_modules/@types/selenium-webdriver/index.d.ts",
)

ts_ext_declaration(
    name = "zone.js",
    srcs = glob(["node_modules/zone.js/**/*.d.ts"]),
)

###############################################################################
# Tools
###############################################################################
ts_library(
    name = "tsc-wrapped",
    srcs = glob(["tools/@angular/tsc-wrapped/src/**/*.ts"]),
    deps = [
        "//:types-node",
        "//:types-jasmine",
    ],
    tsconfig = "tools/@angular/tsc-wrapped/tsconfig.json",
    compiler = "//:tsc_release",
    module_name = "@angular/tsc-wrapped",
)

nodejs_binary(
    name = "tsc-wrapped_release",
    srcs = [":tsc-wrapped"],
    entry_point = "tools/@angular/tsc-wrapped/src/main.js",
)

###############################################################################
# Packages
###############################################################################

# TODO: switch to an alias rule when we upgrade to Bazel 3.0
genrule(
    name = "all",
    srcs = [
        "//tools/typings-test",
    ],
    outs = ["build-ok"],
    cmd = "true > $@"
)

ts_library(
    name = "common",
    srcs = glob(
        ["modules/@angular/common/**/*.ts"],
        exclude=[
            "modules/@angular/common/src/facade/browser.ts",
            "modules/@angular/common/src/facade/math.ts",
            "modules/@angular/common/test/**/*.ts",
            "modules/@angular/common/testing/mock_location_strategy.ts",
        ]),
    deps = [
        "//:zone.js",
        "//:core"
    ],
    tsconfig = "modules/@angular/common/tsconfig-es5.json",
    module_name = "@angular/common",
    write_metadata = True,
)

ts_library(
    name = "common_test_module",
    srcs = glob(
        [
            "modules/@angular/common/test/**/*.ts",
            "modules/@angular/common/src/facade/**/*.ts",
        ],
        exclude=[
            "modules/@angular/common/src/facade/base_wrapped_exception.ts",
            "modules/@angular/common/src/facade/browser.ts",
            "modules/@angular/common/src/facade/exception_handler.ts",
            "modules/@angular/common/src/facade/exceptions.ts",
            "modules/@angular/common/src/facade/intl.ts",
            "modules/@angular/common/src/facade/math.ts",
            # Not supported on cjs-jasmine
            "modules/@angular/common/test/forms-deprecated/**",
        ]),
    deps = [
        "//:types-node",
        "//:types-jasmine",
        "//:zone.js",
        "//:core",
        "//:common",
        "//:compiler",
        "//:platform-browser",
        "//:platform-server",
    ],
    tsconfig = "modules/@angular/common/test/tsconfig.json",
    root_dir = "modules/@angular/common",
    out_dir = "modules/@angular/common/test_out",
    write_metadata = True,
)

jasmine_node_test(
    name = "common_test",
    srcs = [":common_test_module"],
    helpers = [
        "modules/@angular/common/test_out/test/jasmine_helper.js",
    ],
)

ts_library(
    name = "compiler-cli",
    srcs = glob(
        ["modules/@angular/compiler-cli/**/*.ts"],
        exclude=[
            "modules/@angular/compiler-cli/test/**/*.ts",
            "modules/@angular/compiler-cli/integrationtest/**/*.ts",
        ]),
    deps = [
        "//:types-node",
        "//:types-jasmine",
        "//:zone.js",
        "//:core",
        "//:common",
        "//:compiler",
        "//:platform-server",
        "//:platform-browser",
        "//:tsc-wrapped",
    ],
    tsconfig = "modules/@angular/compiler-cli/tsconfig-es5.json",
    module_name = "@angular/compiler-cli",
    write_metadata = True,
)

ts_library(
    name = "compiler",
    srcs = glob(
        ["modules/@angular/compiler/**/*.ts"],
        exclude=[
            "modules/@angular/compiler/src/css_lexer.ts",
            "modules/@angular/compiler/src/css_parser.ts",
            "modules/@angular/compiler/src/css_ast.ts",
            "modules/@angular/compiler/src/output/dart_imports.ts",
            "modules/@angular/compiler/src/output/js_emitter.ts",
            "modules/@angular/compiler/src/facade/browser.ts",
            "modules/@angular/compiler/src/facade/intl.ts",
            "modules/@angular/compiler/testing/xhr_mock.ts",
            "modules/@angular/compiler/test/**/*.ts",
        ]),
    deps = [
        "//:zone.js",
        "//:core",
    ],
    tsconfig = "modules/@angular/compiler/tsconfig-es5.json",
    module_name = "@angular/compiler",
    write_metadata = True,
)

ts_library(
    name = "core",
    srcs = glob(
        ["modules/@angular/core/**/*.ts"],
        exclude=[
            "modules/@angular/core/src/facade/browser.ts",
            "modules/@angular/core/src/facade/intl.ts",
            # Used in testing_internal
            # "modules/@angular/core/testing/animation/mock_animation_player.ts",
            "modules/@angular/core/testing/lang_utils.ts",
            # Used in testing_internal
            # "modules/@angular/core/testing/logger.ts",
            # "modules/@angular/core/testing/mock_application_ref.ts",
            # "modules/@angular/core/testing/ng_zone_mock.ts",
            # "modules/@angular/core/testing/testing_internal.ts",
            "modules/@angular/core/test/**/*.ts",
        ]),
    deps = [
        "//:types-node",
        "//:types-jasmine",
        "//:zone.js",
    ],
    tsconfig = "modules/@angular/core/tsconfig-es5.json",
    module_name = "@angular/core",
    write_metadata = True,
)

ts_library(
    name = "core_test_module",
    srcs = glob(
        [
            "modules/@angular/core/test/**/*.ts",
            "modules/@angular/core/src/facade/**/*.ts",
        ],
        exclude=[
            "modules/@angular/core/src/facade/browser.ts",
            "modules/@angular/core/src/facade/intl.ts",
            "modules/@angular/core/src/facade/math.ts",
            # Not supported on cjs-jasmine
            "modules/@angular/core/test/zone/**",
            "modules/@angular/core/test/fake_async_spec.*",
        ]),
    deps = [
        "//:types-node",
        "//:types-jasmine",
        "//:zone.js",
        "//:core",
        "//:common",
        "//:compiler",
        "//:platform-browser",
        "//:platform-server",
    ],
    tsconfig = "modules/@angular/core/test/tsconfig.json",
    root_dir = "modules/@angular/core",
    out_dir = "modules/@angular/core/test_out",
    write_metadata = True,
)

jasmine_node_test(
    name = "core_test",
    srcs = [":core_test_module"],
    helpers = [
        "modules/@angular/core/test_out/test/jasmine_helper.js",
    ],
)

ts_library(
    name = "forms",
    srcs = glob(
        ["modules/@angular/forms/**/*.ts"],
        exclude=[
            "modules/@angular/forms/src/facade/intl.ts",
            "modules/@angular/forms/src/facade/browser.ts",
            "modules/@angular/forms/src/facade/math.ts",
            "modules/@angular/forms/test/**/*.ts",
        ]),
    deps = [
        "//:zone.js",
        "//:core",
        "//:common",
        "//:compiler",
    ],
    tsconfig = "modules/@angular/forms/tsconfig-es5.json",
    module_name = "@angular/forms",
    write_metadata = True,
)

ts_library(
    name = "http",
    srcs = glob(
        ["modules/@angular/http/**/*.ts"],
        exclude=[
            "modules/@angular/http/src/index.ts", # TODO: remove the unused file
            "modules/@angular/http/src/facade/**/*.ts",
            "modules/@angular/http/test/**/*.ts",
        ]),
    deps = [
        "//:zone.js",
        "//:core",
        "//:common",
        "//:platform-browser",
    ],
    tsconfig = "modules/@angular/http/tsconfig-es5.json",
    module_name = "@angular/http",
    write_metadata = True,
)

ts_library(
    name = "platform-browser",
    srcs = glob(
        ["modules/@angular/platform-browser/**/*.ts"],
        exclude=[
            "modules/@angular/platform-browser/dynamic.ts", # TODO: remove this unused file
            "modules/@angular/platform-browser/src/facade/intl.ts",
            "modules/@angular/platform-browser/src/facade/math.ts",
            "modules/@angular/platform-browser/testing/benchmark_util.ts",
            # Used by core test
            # "modules/@angular/platform-browser/testing/matchers.ts",
            # "modules/@angular/platform-browser/testing/mock_animation_driver.ts",
            "modules/@angular/platform-browser/testing/mock_dom_animate_player.ts",
            "modules/@angular/platform-browser/testing/perf_util.ts",
            "modules/@angular/platform-browser/test/**/*.ts",
        ]),
    deps = [
        "//:types-hammerjs",
        "//:types-jasmine",
        "//:types-protractor",
        "//:zone.js",
        "//:types-selenium-webdriver",
        "//:core",
        "//:common",
    ],
    tsconfig = "modules/@angular/platform-browser/tsconfig-es5.json",
    module_name = "@angular/platform-browser",
    write_metadata = True,
)

ts_library(
    name = "platform-browser-dynamic",
    srcs = glob(
        ["modules/@angular/platform-browser-dynamic/**/*.ts"],
        exclude=[
            "modules/@angular/platform-browser-dynamic/src/facade/browser.ts",
            "modules/@angular/platform-browser-dynamic/src/facade/intl.ts",
            "modules/@angular/platform-browser-dynamic/src/facade/math.ts",
            "modules/@angular/platform-browser-dynamic/test/**/*.ts",
        ]),
    deps = [
        "//:types-jasmine",
        "//:zone.js",
        "//:core",
        "//:common",
        "//:compiler",
        "//:platform-browser",
    ],
    tsconfig = "modules/@angular/platform-browser-dynamic/tsconfig-es5.json",
    module_name = "@angular/platform-browser-dynamic",
    write_metadata = True,
)

ts_library(
    name = "platform-server",
    srcs = glob(
        ["modules/@angular/platform-server/**/*.ts"],
        exclude=[
            "modules/@angular/platform-server/platform_browser_dynamic_testing_private.ts",
            "modules/@angular/platform-server/src/facade/**/*.ts",
            "modules/@angular/platform-server/test/**/*.ts",
        ]),
    deps = [
        "//:types-jasmine",
        "//:types-node",
        "//:zone.js",
        "//:core",
        "//:common",
        "//:compiler",
        "//:platform-browser",
        "//:platform-browser-dynamic",
    ],
    tsconfig = "modules/@angular/platform-server/tsconfig-es5.json",
    module_name = "@angular/platform-server",
    write_metadata = True,
)

ts_library(
    name = "router-deprecated",
    srcs = glob(
        ["modules/@angular/router-deprecated/**/*.ts"],
        exclude=[
            "modules/@angular/router-deprecated/src/facade/browser.ts",
            "modules/@angular/router-deprecated/src/facade/intl.ts",
            "modules/@angular/router-deprecated/src/facade/math.ts",
            "modules/@angular/router-deprecated/test/**/*.ts",
            "modules/@angular/router-deprecated/testing/mock_location_strategy.ts",
        ]),
    deps = [
        "//:zone.js",
        "//:core",
        "//:common",
        "//:platform-browser",
    ],
    tsconfig = "modules/@angular/router-deprecated/tsconfig-es5.json",
    module_name = "@angular/router-deprecated",
    write_metadata = True,
)

ts_library(
    name = "router",
    srcs = glob(
        ["modules/@angular/router/**/*.ts"],
        exclude=[
            "modules/@angular/router/test/**/*.ts",
        ]),
    deps = [
        "//:types-node",
        "//:types-jasmine",
        "//:zone.js",
        "//:core",
        "//:common",
        "//:compiler",
        "//:platform-browser",
        "//:platform-browser-dynamic",
    ],
    tsconfig = "modules/@angular/router/tsconfig-es5.json",
    module_name = "@angular/router",
    write_metadata = True,
)

ts_library(
    name = "upgrade",
    srcs = glob(
        ["modules/@angular/upgrade/**/*.ts"],
        exclude=[
            "modules/@angular/upgrade/test/**/*.ts",
        ]),
    deps = [
        "//:zone.js",
        "//:core",
        "//:common",
        "//:compiler",
        "//:platform-browser",
        "//:platform-browser-dynamic",
    ],
    tsconfig = "modules/@angular/upgrade/tsconfig-es5.json",
    module_name = "@angular/upgrade",
    write_metadata = True,
)
