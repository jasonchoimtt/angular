package(default_visibility=["//visibility:public"])

load("//build_defs:nodejs.bzl", "nodejs_binary")
load("//build_defs:typescript.bzl", "ts_ext_declaration", "ts_library")
load("//build_defs:jasmine.bzl", "jasmine_node_test")
load("//build_defs:karma.bzl", "karma_test")
load("//build_defs:bundle.bzl", "js_bundle")
load("//build_defs:protractor.bzl", "protractor_test")

###############################################################################
# External dependencies
###############################################################################
# TODO: add source-map-support, reflect-metadata, es6-shim, angular1, systemjs

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

nodejs_binary(
    name = "karma",
    srcs = ["node_modules"],
    entry_point = "node_modules/karma/bin/karma",
)

nodejs_binary(
    name = "rollup",
    srcs = ["node_modules"],
    entry_point = "node_modules/rollup/bin/rollup",
)

nodejs_binary(
    name = "uglifyjs",
    srcs = ["node_modules"],
    entry_point = "node_modules/uglify-js/bin/uglifyjs",
)

sh_binary(
    name = "uglifyjs_wrapped",
    srcs = ["tools/uglifyjs_wrapped.sh"],
    data = [":uglifyjs"],
)

nodejs_binary(
    name = "protractor",
    srcs = ["node_modules"],
    entry_point = "node_modules/protractor/bin/protractor",
)

ts_ext_declaration(
    name = "types-node",
    srcs = ["node_modules/@types/node/index.d.ts"],
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
nodejs_binary(
    name = "merge_json",
    srcs = ["tools/@angular/tsc-wrapped/merge_json.js"],
    entry_point = "tools/@angular/tsc-wrapped/merge_json.js",
)

ts_library(
    name = "tsc-wrapped",
    srcs = glob(
        [
          "tools/@angular/tsc-wrapped/index.ts",
          "tools/@angular/tsc-wrapped/src/**/*.ts",
        ],
    ),
    deps = [
        "//:types-node",
        "//:types-jasmine",
    ],
    data = [
        "tools/@angular/tsc-wrapped/worker_protocol.proto",
    ],
    tsconfig = "tools/@angular/tsc-wrapped/tsconfig.json",
    compiler = "//:tsc_release",
    module_name = "@angular/tsc-wrapped",
)

nodejs_binary(
    name = "tsc-wrapped_release",
    srcs = [":tsc-wrapped"],
    entry_point = "tools/@angular/tsc-wrapped/src/worker.js",
)

nodejs_binary(
    name = "serve_runfiles",
    srcs = ["node_modules", "tools/serve_runfiles.js"],
    entry_point = "tools/serve_runfiles.js",
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
            # "modules/@angular/common/testing/mock_location_strategy.ts",
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
            # FIXME: Not supported on cjs-jasmine
            "modules/@angular/common/test/forms-deprecated/**/*.ts",
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
        "//:platform-server",
    ],
    deps_use_internal = [
        "//:common",
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
    size = "small",
)

js_bundle(
    name = "common_bundle",
    srcs = [":common"],
    output = "modules/@angular/common/common.umd.js",
    entry_point = "modules/@angular/common/es6/index.js",
    rollup_config = "modules/@angular/common/rollup.config.js",
    banner = "modules/@angular/license-banner.txt",
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
    name = "compiler-cli_test_module",
    srcs = glob(
        [
            "modules/@angular/compiler-cli/test/**/*.ts",
            "modules/@angular/compiler-cli/src/facade/**/*.ts",
        ],
        exclude=[
        ]),
    deps = [
        "//:types-node",
        "//:types-jasmine",
        "//:zone.js",
        "//:core",
        "//:platform-browser",
        "//:platform-browser-dynamic",
        "//:platform-server",
        "//:compiler-cli",
        "//:tsc-wrapped",
    ],
    deps_use_internal = [
        "//:compiler-cli",
    ],
    tsconfig = "modules/@angular/compiler-cli/test/tsconfig.json",
    root_dir = "modules/@angular/compiler-cli",
    out_dir = "modules/@angular/compiler-cli/test_out",
    write_metadata = True,
)

jasmine_node_test(
    name = "compiler-cli_test",
    srcs = [":compiler-cli_test_module"],
    helpers = [
        "modules/@angular/compiler-cli/test_out/test/jasmine_helper.js",
    ],
    size = "small",
)

ts_library(
    name = "compiler",
    srcs = glob(
        ["modules/@angular/compiler/**/*.ts"],
        exclude=[
            # "modules/@angular/compiler/src/css_lexer.ts",
            # "modules/@angular/compiler/src/css_parser.ts",
            # "modules/@angular/compiler/src/css_ast.ts",
            # "modules/@angular/compiler/src/output/dart_imports.ts",
            # "modules/@angular/compiler/src/output/js_emitter.ts",
            "modules/@angular/compiler/src/facade/browser.ts",
            "modules/@angular/compiler/src/facade/intl.ts",
            # "modules/@angular/compiler/testing/xhr_mock.ts",
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
    name = "compiler_test_module",
    srcs = glob(
        [
            "modules/@angular/compiler/test/**/*.ts",
            "modules/@angular/compiler/src/facade/**/*.ts",
        ],
        exclude=[
        ]),
    deps = [
        "//:types-node",
        "//:types-jasmine",
        "//:zone.js",
        "//:core",
        "//:common",
        "//:platform-browser",
        "//:platform-browser-dynamic",
        "//:platform-server",
        "//:compiler",
    ],
    deps_use_internal = [
        "//:compiler",
    ],
    tsconfig = "modules/@angular/compiler/test/tsconfig.json",
    root_dir = "modules/@angular/compiler",
    out_dir = "modules/@angular/compiler/test_out",
    write_metadata = True,
)

jasmine_node_test(
    name = "compiler_test",
    srcs = [":compiler_test_module"],
    helpers = [
        "modules/@angular/compiler/test_out/test/jasmine_helper.js",
    ],
    size = "small",
)

js_bundle(
    name = "compiler_bundle",
    srcs = [":compiler"],
    output = "modules/@angular/compiler/compiler.umd.js",
    entry_point = "modules/@angular/compiler/es6/index.js",
    rollup_config = "modules/@angular/compiler/rollup.config.js",
    banner = "modules/@angular/license-banner.txt",
)

ts_library(
    name = "core",
    srcs = glob(
        ["modules/@angular/core/**/*.ts"],
        exclude=[
            # "modules/@angular/core/src/facade/browser.ts",
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
        "//:common",
        "//:compiler",
        "//:platform-browser",
        "//:platform-browser-dynamic",
        "//:platform-server",
        "//:core",
    ],
    deps_use_internal = [
        "//:core",
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
    size = "small",
)

js_bundle(
    name = "core_bundle",
    srcs = [":core"],
    output = "modules/@angular/core/core.umd.js",
    entry_point = "modules/@angular/core/es6/index.js",
    rollup_config = "modules/@angular/core/rollup.config.js",
    banner = "modules/@angular/license-banner.txt",
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
    name = "forms_test_module",
    srcs = glob(
        [
            "modules/@angular/forms/test/**/*.ts",
            "modules/@angular/forms/src/facade/**/*.ts",
        ],
        exclude=[
        ]),
    deps = [
        "//:types-node",
        "//:types-jasmine",
        "//:zone.js",
        "//:core",
        "//:common",
        "//:platform-browser",
        "//:platform-browser-dynamic",
        "//:platform-server",
        "//:forms",
    ],
    deps_use_internal = [
        "//:forms",
    ],
    tsconfig = "modules/@angular/forms/test/tsconfig.json",
    root_dir = "modules/@angular/forms",
    out_dir = "modules/@angular/forms/test_out",
    write_metadata = True,
)

js_bundle(
    name = "forms_bundle",
    srcs = [":forms"],
    output = "modules/@angular/forms/forms.umd.js",
    entry_point = "modules/@angular/forms/es6/index.js",
    rollup_config = "modules/@angular/forms/rollup.config.js",
    banner = "modules/@angular/license-banner.txt",
)

ts_library(
    name = "http",
    srcs = glob(
        ["modules/@angular/http/**/*.ts"],
        exclude=[
            "modules/@angular/http/src/index.ts", # TODO: remove the unused file
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
            # "modules/@angular/platform-browser/testing/matchers.ts",
            # "modules/@angular/platform-browser/testing/mock_animation_driver.ts",
            # "modules/@angular/platform-browser/testing/mock_dom_animate_player.ts",
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

js_bundle(
    name = "http_bundle",
    srcs = [":http"],
    output = "modules/@angular/http/http.umd.js",
    entry_point = "modules/@angular/http/es6/index.js",
    rollup_config = "modules/@angular/http/rollup.config.js",
    banner = "modules/@angular/license-banner.txt",
)

js_bundle(
    name = "platform-browser_bundle",
    srcs = [":platform-browser"],
    output = "modules/@angular/platform-browser/platform-browser.umd.js",
    entry_point = "modules/@angular/platform-browser/es6/index.js",
    rollup_config = "modules/@angular/platform-browser/rollup.config.js",
    banner = "modules/@angular/license-banner.txt",
)

ts_library(
    name = "platform-browser_test_module",
    srcs = glob(
        [
            "modules/@angular/platform-browser/test/**/*.ts",
            "modules/@angular/platform-browser/src/facade/**/*.ts",
        ],
        exclude=[
        ]),
    data = glob(
        [
            "modules/@angular/platform-browser/test/static_assets/**",
            "modules/@angular/platform-browser/test/browser/static_assets/**",
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
        "//:platform-browser-dynamic",
    ],
    deps_use_internal = [
        "//:platform-browser",
    ],
    tsconfig = "modules/@angular/platform-browser/test/tsconfig.json",
    root_dir = "modules/@angular/platform-browser",
    out_dir = "modules/@angular/platform-browser/test_out",
    write_metadata = True,
)

ts_library(
    name = "http_test_module",
    srcs = glob(
        [
            "modules/@angular/http/test/**/*.ts",
            "modules/@angular/http/src/facade/**/*.ts",
        ],
        exclude=[
        ]),
    deps = [
        "//:types-node",
        "//:types-jasmine",
        "//:zone.js",
        "//:core",
        "//:common",
        "//:platform-browser",
        "//:platform-browser-dynamic",
        "//:platform-server",
        "//:http",
    ],
    deps_use_internal = [
        "//:http",
    ],
    tsconfig = "modules/@angular/http/test/tsconfig.json",
    root_dir = "modules/@angular/http",
    out_dir = "modules/@angular/http/test_out",
    write_metadata = True,
)

jasmine_node_test(
    name = "http_test",
    srcs = [":http_test_module"],
    helpers = [
        "modules/@angular/http/test_out/test/jasmine_helper.js",
    ],
    size = "small",
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
    name = "platform-browser-dynamic_test_module",
    srcs = glob(
        [
            "modules/@angular/platform-browser-dynamic/test/**/*.ts",
            "modules/@angular/platform-browser-dynamic/src/facade/**/*.ts",
        ],
        exclude=[
        ]),
    deps = [
        "//:types-node",
        "//:types-jasmine",
        "//:zone.js",
        "//:core",
        "//:compiler",
        "//:router-deprecated",
        "//:platform-browser",
        "//:platform-server",
        "//:platform-browser-dynamic",
    ],
    deps_use_internal = [
        "//:platform-browser-dynamic",
    ],
    tsconfig = "modules/@angular/platform-browser-dynamic/test/tsconfig.json",
    root_dir = "modules/@angular/platform-browser-dynamic",
    out_dir = "modules/@angular/platform-browser-dynamic/test_out",
    write_metadata = True,
)

js_bundle(
    name = "platform-browser-dynamic_bundle",
    srcs = [":platform-browser-dynamic"],
    output = "modules/@angular/platform-browser-dynamic/platform-browser-dynamic.umd.js",
    entry_point = "modules/@angular/platform-browser-dynamic/es6/index.js",
    rollup_config = "modules/@angular/platform-browser-dynamic/rollup.config.js",
    banner = "modules/@angular/license-banner.txt",
)

ts_library(
    name = "platform-server",
    srcs = glob(
        ["modules/@angular/platform-server/**/*.ts"],
        exclude=[
            "modules/@angular/platform-server/platform_browser_dynamic_testing_private.ts",
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
    name = "platform-server_test_module",
    srcs = glob(
        [
            "modules/@angular/platform-server/test/**/*.ts",
            "modules/@angular/platform-server/src/facade/**/*.ts",
        ],
        exclude=[
        ]),
    deps = [
        "//:types-node",
        "//:types-jasmine",
        "//:zone.js",
        "//:core",
        "//:platform-browser",
        "//:platform-browser-dynamic",
        "//:platform-server",
    ],
    deps_use_internal = [
        "//:platform-server",
    ],
    tsconfig = "modules/@angular/platform-server/test/tsconfig.json",
    root_dir = "modules/@angular/platform-server",
    out_dir = "modules/@angular/platform-server/test_out",
    write_metadata = True,
)

jasmine_node_test(
    name = "platform-server_test",
    srcs = [":platform-server_test_module"],
    helpers = [
        "modules/@angular/platform-server/test_out/test/jasmine_helper.js",
    ],
    size = "small",
)

js_bundle(
    name = "platform-server_bundle",
    srcs = [":platform-server"],
    output = "modules/@angular/platform-server/platform-server.umd.js",
    entry_point = "modules/@angular/platform-server/es6/index.js",
    rollup_config = "modules/@angular/platform-server/rollup.config.js",
    banner = "modules/@angular/license-banner.txt",
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
    name = "router-deprecated_test_module",
    srcs = glob(
        [
            "modules/@angular/router-deprecated/test/**/*.ts",
            "modules/@angular/router-deprecated/src/facade/**/*.ts",
        ],
        exclude=[
        ]),
    deps = [
        "//:types-node",
        "//:types-jasmine",
        "//:zone.js",
        "//:core",
        "//:common",
        "//:platform-browser",
        "//:platform-browser-dynamic",
        "//:platform-server",
        "//:router-deprecated",
    ],
    deps_use_internal = [
        "//:router-deprecated",
    ],
    tsconfig = "modules/@angular/router-deprecated/test/tsconfig.json",
    root_dir = "modules/@angular/router-deprecated",
    out_dir = "modules/@angular/router-deprecated/test_out",
    write_metadata = True,
)

jasmine_node_test(
    name = "router-deprecated_test",
    srcs = [":router-deprecated_test_module"],
    helpers = [
        "modules/@angular/router-deprecated/test_out/test/jasmine_helper.js",
    ],
    size = "small",
)

js_bundle(
    name = "router-deprecated_bundle",
    srcs = [":router-deprecated"],
    output = "modules/@angular/router-deprecated/router-deprecated.umd.js",
    entry_point = "modules/@angular/router-deprecated/es6/index.js",
    rollup_config = "modules/@angular/router-deprecated/rollup.config.js",
    banner = "modules/@angular/license-banner.txt",
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
    name = "router_test_module",
    srcs = glob(
        [
            "modules/@angular/router/test/**/*.ts",
            "modules/@angular/router/src/facade/**/*.ts",
        ],
        exclude=[
        ]),
    deps = [
        "//:types-node",
        "//:types-jasmine",
        "//:zone.js",
        "//:core",
        "//:common",
        "//:router",
        "//:platform-browser",
        "//:platform-server",
    ],
    deps_use_internal = [
        "//:router",
    ],
    tsconfig = "modules/@angular/router/test/tsconfig.json",
    root_dir = "modules/@angular/router",
    out_dir = "modules/@angular/router/test_out",
    write_metadata = True,
)

jasmine_node_test(
    name = "router_test",
    srcs = [":router_test_module"],
    helpers = [
        "modules/@angular/router/test_out/test/jasmine_helper.js",
    ],
    size = "small",
)

js_bundle(
    name = "router_bundle",
    srcs = [":router"],
    output = "modules/@angular/router/router.umd.js",
    entry_point = "modules/@angular/router/es6/index.js",
    rollup_config = "modules/@angular/router/rollup.config.js",
    banner = "modules/@angular/license-banner.txt",
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

ts_library(
    name = "upgrade_test_module",
    srcs = glob(
        [
            "modules/@angular/upgrade/test/**/*.ts",
            "modules/@angular/upgrade/src/facade/**/*.ts",
        ],
        exclude=[
        ]),
    deps = [
        "//:types-node",
        "//:types-jasmine",
        "//:zone.js",
        "//:core",
        "//:platform-browser",
        "//:platform-server",
        "//:upgrade",
    ],
    deps_use_internal = [
        "//:upgrade",
    ],
    tsconfig = "modules/@angular/upgrade/test/tsconfig.json",
    root_dir = "modules/@angular/upgrade",
    out_dir = "modules/@angular/upgrade/test_out",
    write_metadata = True,
)

js_bundle(
    name = "upgrade_bundle",
    srcs = [":upgrade"],
    output = "modules/@angular/upgrade/upgrade.umd.js",
    entry_point = "modules/@angular/upgrade/es6/index.js",
    rollup_config = "modules/@angular/upgrade/rollup.config.js",
    banner = "modules/@angular/license-banner.txt",
)

test_suite(
    name = "jasmine_tests",
    tests = [
        ":core_test",
        ":common_test",
        ":compiler_test",
        ":compiler-cli_test",
        ":http_test",
        ":platform-server_test",
        ":router_test",
        ":router-deprecated_test",
    ],
)

karma_test(
    name = "karma_test",
    srcs = [
        ":core_test_module",
        ":common_test_module",
        ":compiler_test_module",
        ":forms_test_module",
        ":http_test_module",
        ":platform-browser_test_module",
        ":platform-browser-dynamic_test_module",
        # ":platform-server_test_module", # TODO: fix bug
        # ":router_test_module", # TODO: migrate router to main karma architecture
        ":router-deprecated_test_module",
        ":upgrade_test_module",
        "modules/empty.js",
        "shims_for_IE.js",
        "test-main-bazel.js",
    ],
    config = "karma-bazel.conf.js",
    size = "small",
)

karma_test(
    name = "router_karma_test",
    srcs = [
        ":router_test_module",
        "modules/@angular/router/karma-test-shim.js",
    ],
    config = "modules/@angular/router/karma-bazel.conf.js",
    size = "small",
)

###############################################################################
# End to end tests
###############################################################################
ts_library(
    name = "playground",
    srcs = glob(
        ["modules/playground/src/**/*.ts"],
        exclude=[
        ]),
    deps = [
        "//:core",
        "//:common",
        "//:http",
        "//:platform-browser",
        "//:platform-browser-dynamic",
        "//:router",
        "//:router-deprecated",
        "//:upgrade",
    ],
    data = glob(
        ["modules/playground/src/**/*"],
        exclude=[
            "modules/playground/src/**/*.ts",
        ],
    ),
    tsconfig = "modules/tsconfig.json",
)

ts_library(
    name = "e2e_util",
    srcs = glob(
        ["modules/e2e_util/**/*.ts"],
    ),
    deps = [
        "//:types-node",
        "//:types-protractor",
        "//:types-selenium-webdriver",
    ],
    tsconfig = "modules/tsconfig.json",
    root_dir = "modules/e2e_util",
    out_dir = "modules/e2e_util",
    module_name = "e2e_util",
)

ts_library(
    name = "playground_test_module",
    srcs = glob(
        ["modules/playground/e2e_test/**/*.ts"],
    ),
    deps = [
        "//:types-jasmine",
        "//:e2e_util",
    ],
    tsconfig = "modules/tsconfig.json",
)

nodejs_binary(
    name = "e2e_serve_unbundled",
    srcs = ["node_modules", "tools/serve_runfiles.js"],
    entry_point = "tools/serve_runfiles.js",
    data = [
        ":core",
        ":common",
        ":compiler",
        ":forms",
        ":http",
        ":platform-browser",
        ":platform-browser-dynamic",
        ":platform-server",
        ":router",
        ":router-deprecated",
        ":upgrade",
        ":playground",
    ],
)

nodejs_binary(
    name = "e2e_serve_bundled",
    srcs = ["node_modules", "tools/serve_runfiles.js"],
    entry_point = "tools/serve_runfiles.js",
    data = [
        ":core",  # Needed for @angular/core/src/facade
        ":core_bundle",
        ":common_bundle",
        ":compiler_bundle",
        ":forms_bundle",
        ":http_bundle",
        ":platform-browser_bundle",
        ":platform-browser-dynamic_bundle",
        ":platform-server_bundle",
        ":router_bundle",
        ":router-deprecated_bundle",
        ":upgrade_bundle",
        ":playground",
        "node_modules/es6-shim/es6-shim.js",
        "node_modules/zone.js/dist/zone.js",
        "node_modules/zone.js/dist/long-stack-trace-zone.js",
        "node_modules/systemjs/dist/system.src.js",
        "node_modules/base64-js/lib/b64.js",
        "node_modules/reflect-metadata/Reflect.js",
        "node_modules/rxjs",
        "node_modules/angular/angular.js",
    ],
)

protractor_test(
    name = "playground_test",
    srcs = [":playground_test_module"],
    data = [
        ":core",  # Needed for @angular/core/src/facade
        ":core_bundle",
        ":common_bundle",
        ":compiler_bundle",
        ":forms_bundle",
        ":http_bundle",
        ":platform-browser_bundle",
        ":platform-browser-dynamic_bundle",
        ":platform-server_bundle",
        ":router_bundle",
        ":router-deprecated_bundle",
        ":upgrade_bundle",
        ":playground",
        "node_modules/es6-shim/es6-shim.js",
        "node_modules/zone.js/dist/zone.js",
        "node_modules/zone.js/dist/long-stack-trace-zone.js",
        "node_modules/systemjs/dist/system.src.js",
        "node_modules/base64-js/lib/b64.js",
        "node_modules/reflect-metadata/Reflect.js",
        "node_modules/rxjs",
        "node_modules/angular/angular.js",
        "favicon.ico",
    ],
    config = "protractor-bazel.conf.js",
    # size = "medium",
)
