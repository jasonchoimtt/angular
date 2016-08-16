package(default_visibility=["//visibility:public"])

load("//build_defs:nodejs.bzl", "nodejs_binary", "nodejs_test")
load("//build_defs:typescript.bzl", "ts_library", "ts_ext_library")
load("//build_defs:jasmine.bzl", "jasmine_node_test")
load("//build_defs:karma.bzl", "karma_test")
load("//build_defs:bundle.bzl", "js_bundle")
load("//build_defs:protractor.bzl", "protractor_test")
load("//build_defs:ts_api_guardian.bzl", "public_api", "public_api_test")
load("//build_defs:npm_package.bzl", "ts_npm_package")

# This imports node_modules targets from a generated file.
load("//build_defs:node_modules_index.bzl", "node_modules_index")
node_modules_index(glob)

###############################################################################
# Tools
###############################################################################
ts_ext_library(
    name = "es6_subset",
    declarations = ["modules/es6-subset.d.ts"],
    ambient = True,
    entry_point = "modules/es6-subset.d.ts",
)

ts_ext_library(
    name = "dummy_system",
    declarations = ["modules/system.d.ts"],
    ambient = True,
    entry_point = "modules/system.d.ts",
)

nodejs_binary(
    name = "tsc-wrapped_bootstrap",
    srcs = [
        'tools/@angular/tsc-wrapped/bootstrap.js',
        '//:typescript',
        '//:minimist',
    ],
    entry_point = 'tools/@angular/tsc-wrapped/bootstrap.js',
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
        "//:_types_node",
        "//:typescript",
        "//:tsickle",
    ],
    data = [
        "tools/@angular/tsc-wrapped/worker_protocol.proto",
        "//:minimist",
        "//:bytebuffer",
        "//:protobufjs",
    ],
    tsconfig = "tools/@angular/tsc-wrapped/tsconfig.json",
    compiler = "//:tsc-wrapped_bootstrap",
    module_name = "@angular/tsc-wrapped",
    root_dir = "tools/@angular/tsc-wrapped",
)

nodejs_binary(
    name = "tsc-wrapped_bin",
    srcs = [":tsc-wrapped"],
    entry_point = "tools/@angular/tsc-wrapped/src/worker.js",
)

ts_npm_package(
    name = "tsc-wrapped_package",
    srcs = [":tsc-wrapped"],
    manifest = "tools/@angular/tsc-wrapped/package.json",
    module_name = "@angular/tsc-wrapped",
    strip_prefix = "/tools/@angular/tsc-wrapped",
    esm = False,
)

###############################################################################
# Packages
###############################################################################
ts_library(
    name = "jasmine_helper",
    srcs = [
        "modules/jasmine_helper.ts"
    ],
    deps = [
        "//:core",
        "//:platform-server",
    ],
    data = [
        "//:source-map-support",
        "//:reflect-metadata",
        "//:zone.js",
        "//:parse5",
    ],
    tsconfig = "modules/tsconfig.json",
)

ts_library(
    name = "facade",
    srcs = glob(["modules/@angular/facade/src/**/*.ts"]),
    deps = [
        "//:zone.js",
        "//:rxjs",
    ],
    tsconfig = "modules/tsconfig.json",
    module_name = "@angular/facade",
    root_dir = "modules/@angular/facade",
)

ts_library(
    name = "common",
    srcs = glob(
        ["modules/@angular/common/**/*.ts"],
        exclude = [
            "modules/@angular/common/test/**/*.ts",
            # "modules/@angular/common/testing/mock_location_strategy.ts",
        ]),
    deps = [
        "//:zone.js",
        "//:core",
        "//:es6_subset",
    ],
    tsconfig = "modules/@angular/common/tsconfig-es5.json",
    module_name = "@angular/common",
)

ts_library(
    name = "common_test_module",
    srcs = glob(
        ["modules/@angular/common/test/**/*.ts"],
        exclude = [
            # FIXME: Not supported on cjs-jasmine
            "modules/@angular/common/test/forms-deprecated/**/*.ts",
        ]),
    deps = [
        "//:_types_node",
        "//:_types_jasmine",
        "//:zone.js",
        "//:core",
        "//:common",
        "//:compiler",
        "//:platform-browser",
        "//:platform-browser-dynamic",
        "//:platform-server",
        "//:facade",
        "//:es6_subset",
    ],
    deps_use_internal = [
        "//:common",
    ],
    tsconfig = "modules/tsconfig.json",
    root_dir = "modules/@angular/common/test",
)

jasmine_node_test(
    name = "common_test",
    srcs = [":common_test_module"],
    helpers = [":jasmine_helper"],
    size = "small",
    args = ["--node_path=modules:tools"],
)

js_bundle(
    name = "common_bundle",
    srcs = [":common"],
    output = "modules/@angular/common/common.umd.js",
    entry_point = "modules/@angular/common/esm/index.js",
    rollup_config = "modules/@angular/common/rollup.config.js",
    banner = "modules/@angular/license-banner.txt",
)

ts_npm_package(
    name = "common_package",
    srcs = [":common"],
    data = [":common_bundle"],
    manifest = "modules/@angular/common/package.json",
    module_name = "@angular/common",
    strip_prefix = "/modules/@angular/common",
)

ts_library(
    name = "compiler-cli",
    srcs = glob(
        ["modules/@angular/compiler-cli/**/*.ts"],
        exclude = [
            "modules/@angular/compiler-cli/test/**/*.ts",
            "modules/@angular/compiler-cli/integrationtest/**/*.ts",
        ]),
    deps = [
        "//:_types_node",
        "//:_types_jasmine",
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
)

ts_library(
    name = "compiler-cli_test_module",
    srcs = glob(["modules/@angular/compiler-cli/test/**/*.ts"]),
    deps = [
        "//:_types_node",
        "//:_types_jasmine",
        "//:zone.js",
        "//:core",
        "//:platform-browser",
        "//:platform-browser-dynamic",
        "//:compiler-cli",
        "//:tsc-wrapped",
        "//:facade",
    ],
    deps_use_internal = [
        "//:compiler-cli",
    ],
    tsconfig = "modules/tsconfig.json",
    root_dir = "modules/@angular/compiler-cli/test",
)

jasmine_node_test(
    name = "compiler-cli_test",
    srcs = [":compiler-cli_test_module"],
    helpers = [":jasmine_helper"],
    size = "small",
    args = ["--node_path=modules:tools"],
)

ts_npm_package(
    name = "compiler-cli_package",
    srcs = [":compiler-cli"],
    manifest = "modules/@angular/compiler-cli/package.json",
    module_name = "@angular/compiler-cli",
    strip_prefix = "/modules/@angular/compiler-cli",
    esm = False,
)

ts_library(
    name = "compiler",
    srcs = glob(
        ["modules/@angular/compiler/**/*.ts"],
        exclude = [
            # "modules/@angular/compiler/src/css_lexer.ts",
            # "modules/@angular/compiler/src/css_parser.ts",
            # "modules/@angular/compiler/src/css_ast.ts",
            # "modules/@angular/compiler/src/output/dart_imports.ts",
            # "modules/@angular/compiler/src/output/js_emitter.ts",
            # "modules/@angular/compiler/testing/xhr_mock.ts",
            "modules/@angular/compiler/test/**/*.ts",
        ]),
    deps = [
        "//:zone.js",
        "//:core",
    ],
    tsconfig = "modules/@angular/compiler/tsconfig-es5.json",
    module_name = "@angular/compiler",
)

ts_library(
    name = "compiler_test_module",
    srcs = glob(["modules/@angular/compiler/test/**/*.ts"]),
    deps = [
        "//:_types_node",
        "//:_types_jasmine",
        "//:zone.js",
        "//:core",
        "//:common",
        "//:platform-browser",
        "//:platform-browser-dynamic",
        "//:compiler",
        "//:facade",
        "//:es6_subset",
    ],
    deps_use_internal = [
        "//:compiler",
    ],
    tsconfig = "modules/tsconfig.json",
    root_dir = "modules/@angular/compiler/test",
    # Required for compiling codegen.
    module_name = "@angular/compiler/test",
)

nodejs_binary(
    name = "compiler_test_codegen_bin",
    srcs = [":compiler_test_module"],
    deps = [
        "reflect-metadata",
    ],
    entry_point = "modules/@angular/compiler/test/output/output_emitter_codegen.js",
)

genrule(
    name = "compiler_test_codegen_ts",
    outs = [
        "modules/@angular/compiler/test/output/output_emitter_generated_typed.ts",
        "modules/@angular/compiler/test/output/output_emitter_generated_untyped.ts",
    ],
    tools = [
        # This has to be put in tools so that its runfiles tree is also built.
        ":compiler_test_codegen_bin",
    ],
    cmd = "$(location :compiler_test_codegen_bin) --node_path=modules/ $(OUTS)",
)

ts_library(
    name = "compiler_test_codegen_js",
    srcs = [":compiler_test_codegen_ts"],
    deps = [
        ":core",
        ":compiler",
        ":compiler_test_module",
    ],
    tsconfig = "tools/cjs-jasmine/tsconfig-output_emitter_codegen.json",
    root_dir = "modules/@angular/compiler/test",
)

jasmine_node_test(
    name = "compiler_test",
    srcs = [":compiler_test_module", ":compiler_test_codegen_js"],
    helpers = [":jasmine_helper"],
    size = "small",
    args = ["--node_path=modules:tools"],
)

js_bundle(
    name = "compiler_bundle",
    srcs = [":compiler"],
    output = "modules/@angular/compiler/compiler.umd.js",
    entry_point = "modules/@angular/compiler/esm/index.js",
    rollup_config = "modules/@angular/compiler/rollup.config.js",
    banner = "modules/@angular/license-banner.txt",
)

ts_npm_package(
    name = "compiler_package",
    srcs = [":compiler"],
    data = [":compiler_bundle"],
    manifest = "modules/@angular/compiler/package.json",
    module_name = "@angular/compiler",
    strip_prefix = "/modules/@angular/compiler",
)

ts_library(
    name = "core",
    srcs = glob(
        ["modules/@angular/core/**/*.ts"],
        exclude = [
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
        "//:_types_node",
        "//:_types_jasmine",
        "//:zone.js",
        "//:rxjs",
        "//:dummy_system",
    ],
    tsconfig = "modules/@angular/core/tsconfig-es5.json",
    module_name = "@angular/core",
)

ts_library(
    name = "core_test_module",
    srcs = glob(
        ["modules/@angular/core/test/**/*.ts"],
        exclude = [
            # Not supported on cjs-jasmine
            "modules/@angular/core/test/zone/**",
            "modules/@angular/core/test/fake_async_spec.*",
        ]),
    deps = [
        "//:_types_node",
        "//:_types_jasmine",
        "//:zone.js",
        "//:common",
        "//:compiler",
        "//:platform-browser",
        "//:platform-browser-dynamic",
        "//:core",
        "//:facade",
        "//:es6_subset",
    ],
    deps_use_internal = [
        "//:core",
    ],
    tsconfig = "modules/tsconfig.json",
    root_dir = "modules/@angular/core/test",
)

jasmine_node_test(
    name = "core_test",
    srcs = [":core_test_module"],
    helpers = [":jasmine_helper"],
    size = "small",
    args = ["--node_path=modules:tools"],
)

js_bundle(
    name = "core_bundle",
    srcs = [":core"],
    output = "modules/@angular/core/core.umd.js",
    entry_point = "modules/@angular/core/esm/index.js",
    rollup_config = "modules/@angular/core/rollup.config.js",
    banner = "modules/@angular/license-banner.txt",
)

ts_npm_package(
    name = "core_package",
    srcs = [":core"],
    data = [":core_bundle"],
    manifest = "modules/@angular/core/package.json",
    module_name = "@angular/core",
    strip_prefix = "/modules/@angular/core",
)

ts_library(
    name = "forms",
    srcs = glob(
        ["modules/@angular/forms/**/*.ts"],
        exclude = [
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
)

ts_library(
    name = "forms_test_module",
    srcs = glob(
        ["modules/@angular/forms/test/**/*.ts"],
        exclude = [
        ]),
    deps = [
        "//:_types_node",
        "//:_types_jasmine",
        "//:zone.js",
        "//:core",
        "//:common",
        "//:platform-browser",
        "//:platform-browser-dynamic",
        "//:forms",
        "//:facade",
    ],
    deps_use_internal = [
        "//:forms",
    ],
    tsconfig = "modules/tsconfig.json",
    root_dir = "modules/@angular/forms/test",
)

js_bundle(
    name = "forms_bundle",
    srcs = [":forms"],
    output = "modules/@angular/forms/forms.umd.js",
    entry_point = "modules/@angular/forms/esm/index.js",
    rollup_config = "modules/@angular/forms/rollup.config.js",
    banner = "modules/@angular/license-banner.txt",
)

ts_npm_package(
    name = "forms_package",
    srcs = [":forms"],
    data = [":forms_bundle"],
    manifest = "modules/@angular/forms/package.json",
    module_name = "@angular/forms",
    strip_prefix = "/modules/@angular/forms",
)

ts_library(
    name = "http",
    srcs = glob(
        ["modules/@angular/http/**/*.ts"],
        exclude = [
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
)

js_bundle(
    name = "http_bundle",
    srcs = [":http"],
    output = "modules/@angular/http/http.umd.js",
    entry_point = "modules/@angular/http/esm/index.js",
    rollup_config = "modules/@angular/http/rollup.config.js",
    banner = "modules/@angular/license-banner.txt",
)

ts_library(
    name = "platform-browser",
    srcs = glob(
        [
            "modules/@angular/platform-browser/**/*.ts",
        ],
        exclude = [
            "modules/@angular/platform-browser/dynamic.ts", # TODO: remove this unused file
            "modules/@angular/platform-browser/testing/benchmark_util.ts",
            # "modules/@angular/platform-browser/testing/matchers.ts",
            # "modules/@angular/platform-browser/testing/mock_animation_driver.ts",
            # "modules/@angular/platform-browser/testing/mock_dom_animate_player.ts",
            "modules/@angular/platform-browser/testing/perf_util.ts",
            "modules/@angular/platform-browser/test/**/*.ts",
        ]),
    deps = [
        "//:_types_hammerjs",
        "//:_types_jasmine",
        "//:_types_protractor",
        "//:zone.js",
        "//:_types_selenium-webdriver",
        "//:core",
        "//:common",
        "//:facade",
    ],
    tsconfig = "modules/@angular/platform-browser/tsconfig-es5.json",
    module_name = "@angular/platform-browser",
)

js_bundle(
    name = "platform-browser_bundle",
    srcs = [":platform-browser"],
    output = "modules/@angular/platform-browser/platform-browser.umd.js",
    entry_point = "modules/@angular/platform-browser/esm/index.js",
    rollup_config = "modules/@angular/platform-browser/rollup.config.js",
    banner = "modules/@angular/license-banner.txt",
)

ts_library(
    name = "platform-browser_test_module",
    srcs = glob(
        ["modules/@angular/platform-browser/test/**/*.ts"],
        exclude = [
        ]),
    data = glob(
        [
            "modules/@angular/platform-browser/test/static_assets/**",
            "modules/@angular/platform-browser/test/browser/static_assets/**",
        ]),
    deps = [
        "//:_types_node",
        "//:_types_jasmine",
        "//:zone.js",
        "//:core",
        "//:common",
        "//:compiler",
        "//:platform-browser",
        "//:platform-browser-dynamic",
    ],
    deps_use_internal = [
        "//:platform-browser",
    ],
    tsconfig = "modules/tsconfig.json",
    root_dir = "modules/@angular/platform-browser/test",
)

ts_npm_package(
    name = "platform-browser_package",
    srcs = [":platform-browser"],
    data = [":platform-browser_bundle"],
    manifest = "modules/@angular/platform-browser/package.json",
    module_name = "@angular/platform-browser",
    strip_prefix = "/modules/@angular/platform-browser",
)

ts_library(
    name = "http_test_module",
    srcs = glob(
        ["modules/@angular/http/test/**/*.ts"],
        exclude = [
        ]),
    deps = [
        "//:_types_node",
        "//:_types_jasmine",
        "//:zone.js",
        "//:core",
        "//:common",
        "//:platform-browser",
        "//:platform-browser-dynamic",
        "//:http",
        "//:facade",
    ],
    deps_use_internal = [
        "//:http",
    ],
    tsconfig = "modules/tsconfig.json",
    root_dir = "modules/@angular/http/test",
)

jasmine_node_test(
    name = "http_test",
    srcs = [":http_test_module"],
    helpers = [":jasmine_helper"],
    size = "small",
    args = ["--node_path=modules:tools"],
)

ts_npm_package(
    name = "http_package",
    srcs = [":http"],
    data = [":http_bundle"],
    manifest = "modules/@angular/http/package.json",
    module_name = "@angular/http",
    strip_prefix = "/modules/@angular/http",
)

ts_library(
    name = "platform-browser-dynamic",
    srcs = glob(
        ["modules/@angular/platform-browser-dynamic/**/*.ts"],
        exclude = [
            "modules/@angular/platform-browser-dynamic/test/**/*.ts",
        ]),
    deps = [
        "//:_types_jasmine",
        "//:zone.js",
        "//:core",
        "//:common",
        "//:compiler",
        "//:platform-browser",
    ],
    tsconfig = "modules/@angular/platform-browser-dynamic/tsconfig-es5.json",
    module_name = "@angular/platform-browser-dynamic",
)

ts_library(
    name = "platform-browser-dynamic_test_module",
    srcs = glob(
        ["modules/@angular/platform-browser-dynamic/test/**/*.ts"],
        exclude = [
        ]),
    deps = [
        "//:_types_node",
        "//:_types_jasmine",
        "//:zone.js",
        "//:core",
        "//:compiler",
        "//:platform-browser",
        "//:platform-browser-dynamic",
        "//:facade",
    ],
    deps_use_internal = [
        "//:platform-browser-dynamic",
    ],
    tsconfig = "modules/tsconfig.json",
    root_dir = "modules/@angular/platform-browser-dynamic/test",
)

js_bundle(
    name = "platform-browser-dynamic_bundle",
    srcs = [":platform-browser-dynamic"],
    output = "modules/@angular/platform-browser-dynamic/platform-browser-dynamic.umd.js",
    entry_point = "modules/@angular/platform-browser-dynamic/esm/index.js",
    rollup_config = "modules/@angular/platform-browser-dynamic/rollup.config.js",
    banner = "modules/@angular/license-banner.txt",
)

ts_npm_package(
    name = "platform-browser-dynamic_package",
    srcs = [":platform-browser-dynamic"],
    data = [":platform-browser-dynamic_bundle"],
    manifest = "modules/@angular/platform-browser-dynamic/package.json",
    module_name = "@angular/platform-browser-dynamic",
    strip_prefix = "/modules/@angular/platform-browser-dynamic",
)

ts_library(
    name = "platform-server",
    srcs = glob(
        ["modules/@angular/platform-server/**/*.ts"],
        exclude = [
            "modules/@angular/platform-server/platform_browser_dynamic_testing_private.ts",
            "modules/@angular/platform-server/test/**/*.ts",
        ]),
    deps = [
        "//:_types_jasmine",
        "//:_types_node",
        "//:zone.js",
        "//:core",
        "//:common",
        "//:compiler",
        "//:platform-browser",
        "//:platform-browser-dynamic",
    ],
    tsconfig = "modules/@angular/platform-server/tsconfig-es5.json",
    module_name = "@angular/platform-server",
)

ts_library(
    name = "platform-server_test_module",
    srcs = glob(["modules/@angular/platform-server/test/**/*.ts"]),
    deps = [
        "//:_types_node",
        "//:_types_jasmine",
        "//:zone.js",
        "//:core",
        "//:platform-browser",
        "//:platform-browser-dynamic",
        "//:platform-server",
        "//:facade",
    ],
    deps_use_internal = [
        "//:platform-server",
    ],
    tsconfig = "modules/tsconfig.json",
    root_dir = "modules/@angular/platform-server/test",
)

jasmine_node_test(
    name = "platform-server_test",
    srcs = [":platform-server_test_module"],
    helpers = [":jasmine_helper"],
    size = "small",
    args = ["--node_path=modules:tools"],
)

js_bundle(
    name = "platform-server_bundle",
    srcs = [":platform-server"],
    output = "modules/@angular/platform-server/platform-server.umd.js",
    entry_point = "modules/@angular/platform-server/esm/index.js",
    rollup_config = "modules/@angular/platform-server/rollup.config.js",
    banner = "modules/@angular/license-banner.txt",
)

ts_npm_package(
    name = "platform-server_package",
    srcs = [":platform-server"],
    data = [":platform-server_bundle"],
    manifest = "modules/@angular/platform-server/package.json",
    module_name = "@angular/platform-server",
    strip_prefix = "/modules/@angular/platform-server",
)

ts_library(
    name = "router",
    srcs = glob(
        ["modules/@angular/router/**/*.ts"],
        exclude = [
            "modules/@angular/router/test/**/*.ts",
        ]),
    deps = [
        "//:_types_node",
        "//:_types_jasmine",
        "//:zone.js",
        "//:core",
        "//:common",
        "//:compiler",
        "//:platform-browser",
        "//:platform-browser-dynamic",
    ],
    tsconfig = "modules/@angular/router/tsconfig-es5.json",
    module_name = "@angular/router",
)

ts_library(
    name = "router_test_module",
    srcs = glob(["modules/@angular/router/test/**/*.ts"]),
    deps = [
        "//:_types_node",
        "//:_types_jasmine",
        "//:zone.js",
        "//:core",
        "//:common",
        "//:router",
        "//:platform-browser",
        "//:facade",
    ],
    deps_use_internal = [
        "//:router",
    ],
    tsconfig = "modules/tsconfig.json",
    root_dir = "modules/@angular/router/test",
)

jasmine_node_test(
    name = "router_test",
    srcs = [":router_test_module"],
    helpers = [":jasmine_helper"],
    size = "small",
    args = ["--node_path=modules:tools"],
)

js_bundle(
    name = "router_bundle",
    srcs = [":router"],
    output = "modules/@angular/router/router.umd.js",
    entry_point = "modules/@angular/router/esm/index.js",
    rollup_config = "modules/@angular/router/rollup.config.js",
    banner = "modules/@angular/license-banner.txt",
)

ts_npm_package(
    name = "router_package",
    srcs = [":router"],
    data = [":router_bundle"],
    manifest = "modules/@angular/router/package.json",
    module_name = "@angular/router",
    strip_prefix = "/modules/@angular/router",
)

ts_library(
    name = "upgrade",
    srcs = glob(
        ["modules/@angular/upgrade/**/*.ts"],
        exclude = [
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
)

ts_library(
    name = "upgrade_test_module",
    srcs = glob(["modules/@angular/upgrade/test/**/*.ts"]),
    deps = [
        "//:_types_node",
        "//:_types_jasmine",
        "//:zone.js",
        "//:core",
        "//:platform-browser",
        "//:upgrade",
        "//:facade",
    ],
    deps_use_internal = [
        "//:upgrade",
    ],
    tsconfig = "modules/tsconfig.json",
    root_dir = "modules/@angular/upgrade/test",
)

js_bundle(
    name = "upgrade_bundle",
    srcs = [":upgrade"],
    output = "modules/@angular/upgrade/upgrade.umd.js",
    entry_point = "modules/@angular/upgrade/esm/index.js",
    rollup_config = "modules/@angular/upgrade/rollup.config.js",
    banner = "modules/@angular/license-banner.txt",
)

ts_npm_package(
    name = "upgrade_package",
    srcs = [":upgrade"],
    data = [":upgrade_bundle"],
    manifest = "modules/@angular/upgrade/package.json",
    module_name = "@angular/upgrade",
    strip_prefix = "/modules/@angular/upgrade",
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
    ],
)

karma_test(
    name = "karma_test",
    srcs = [
        ":core_test_module",
        ":common_test_module",
        ":compiler_test_module",
        ":compiler_test_codegen_js",
        ":forms_test_module",
        ":http_test_module",
        ":platform-browser_test_module",
        ":platform-browser-dynamic_test_module",
        # ":platform-server_test_module", # TODO: fix bug
        ":upgrade_test_module",
        "modules/empty.js",
        "shims_for_IE.js",
        "test-main.js",
    ],
    data = [
        ":angular",
        ":es6-shim",
        ":karma-browserstack-launcher",
        ":karma-chrome-launcher",
        ":karma-jasmine",
        ":karma-sauce-launcher",
        ":karma-sourcemap-loader",
        ":reflect-metadata",
        ":source-map",
        ":systemjs",
        "browser-providers.conf.js",
        "tools/karma/reporter.js",
        "tools/karma/ibazel_watcher.js",
    ],
    config = "karma-js.conf.js",
    size = "small",
    tags = ["local"],  # FIXME: make it run!
)

karma_test(
    name = "router_karma_test",
    srcs = [
        ":router_test_module",
        "modules/@angular/router/karma-test-shim.js",
    ],
    data = [
        ":angular",
        ":es6-shim",
        ":karma-browserstack-launcher",
        ":karma-chrome-launcher",
        ":karma-jasmine",
        ":karma-sauce-launcher",
        ":karma-sourcemap-loader",
        ":reflect-metadata",
        ":source-map",
        ":systemjs",
        "browser-providers.conf.js",
        "tools/karma/ibazel_watcher.js",
    ],
    config = "modules/@angular/router/karma.conf.js",
    size = "small",
    tags = ["local"],
)

###############################################################################
# End to end tests
###############################################################################
ts_library(
    name = "playground",
    srcs = glob(
        ["modules/playground/src/**/*.ts"],
        exclude = [
        ]),
    deps = [
        "//:core",
        "//:common",
        "//:forms",
        "//:http",
        "//:platform-browser",
        "//:platform-browser-dynamic",
        "//:router",
        "//:upgrade",
        "//:facade",
    ],
    data = glob(
        ["modules/playground/src/**/*"],
        exclude = [
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
        "//:_types_node",
        "//:_types_protractor",
        "//:_types_selenium-webdriver",
    ],
    tsconfig = "modules/tsconfig.json",
    root_dir = "modules/e2e_util",
    module_name = "e2e_util",
)

ts_library(
    name = "playground_test_module",
    srcs = glob(
        ["modules/playground/e2e_test/**/*.ts"],
    ),
    deps = [
        "//:_types_jasmine",
        "//:e2e_util",
    ],
    tsconfig = "modules/tsconfig.json",
)

protractor_test(
    name = "playground_test",
    srcs = [":playground_test_module"],
    data = [
        ":core",  # Needed for @angular/core/src/facade
        ":facade",
        ":core_bundle",
        ":common_bundle",
        ":compiler_bundle",
        ":forms_bundle",
        ":http_bundle",
        ":platform-browser_bundle",
        ":platform-browser-dynamic_bundle",
        ":platform-server_bundle",
        ":router_bundle",
        ":upgrade_bundle",
        ":playground",
        ":es6-shim",
        ":zone.js",
        ":systemjs",
        ":base64-js",
        ":reflect-metadata",
        ":rxjs",
        ":angular",
        "favicon.ico",
    ],
    config = "protractor-bazel.conf.js",
    # size = "medium",
    tags = ["local"],
    args = ["--node_path=modules:tools"],
)

public_api(
    name = "public_api",
    srcs = [
        ":core",
        ":common",
        ":platform-browser",
        ":platform-browser-dynamic",
        ":platform-server",
        ":http",
        ":forms",
        ":router",
        ":upgrade",
    ],
    entry_points = [
        "modules/@angular/core/index.d.ts",
        "modules/@angular/core/testing.d.ts",
        "modules/@angular/common/index.d.ts",
        "modules/@angular/common/testing.d.ts",
        "modules/@angular/upgrade/index.d.ts",
        "modules/@angular/platform-browser/index.d.ts",
        "modules/@angular/platform-browser/testing.d.ts",
        "modules/@angular/platform-browser-dynamic/index.d.ts",
        "modules/@angular/platform-browser-dynamic/testing.d.ts",
        "modules/@angular/platform-server/index.d.ts",
        "modules/@angular/platform-server/testing.d.ts",
        "modules/@angular/http/index.d.ts",
        "modules/@angular/http/testing.d.ts",
        "modules/@angular/forms/index.d.ts",
        "modules/@angular/router/index.d.ts",
    ],
    root_dir = "modules/@angular",
    out_dir = "tools/public_api_guard",
    arguments = [
        "--stripExportPattern ^__",
        "--allowModuleIdentifiers jasmine",
        "--allowModuleIdentifiers protractor",
        "--allowModuleIdentifiers angular",
        "--onStabilityMissing error",
    ],
)

public_api_test(
    name = "public_api_test",
    srcs = glob(["tools/public_api_guard/**/*"]),
    public_api = ":public_api",
)

nodejs_test(
    name = "check_cycle_test",
    srcs = [
        "//build_defs:check_cycle",
    ],
    deps = [
        ":madge",
    ],
    entry_point = "check_cycle.js",
    data = [
        ":core",
        ":common",
        ":compiler",
        ":compiler-cli",
        ":forms",
        ":http",
        ":platform-browser",
        ":platform-browser-dynamic",
        ":platform-server",
        ":router",
        ":upgrade",
        ":tsc-wrapped",
    ],
)
