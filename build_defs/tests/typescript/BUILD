load("//build_defs:typescript.bzl", "ts_library", "ts_ext_library")

# ts_library should reject empty srcs. (FAIL)
ts_library(
    name = "nothing_FAIL",
    srcs = glob(["blackhole/**/*.ts"]),
    tsconfig = "tsconfig.json",
    tags = ["manual"],
)

# ts_library should build a module at a normal position.
ts_library(
    name = "basic",
    srcs = glob(["*.ts"]),
    tsconfig = "tsconfig.json",
)

# ts_library should default root_dir to tsconfig.json location.
# ts_library should support aliasing modules.
ts_library(
    name = "nested",
    srcs = ["nested/@nested/index.ts"],
    # Interestingly, paths starting with "@" will be recognized as a special
    # label, so we cannot address "@nested/tsconfig.json" directly.
    tsconfig = "nested/@nested/tsconfig.json",
    module_name = "@nested/nested",
)

# ts_library should support importing deps modules.
# ts_library should support importing sub-modules.
ts_library(
    name = "importing_modules",
    srcs = ["importing_modules/index.ts"],
    deps = [":basic", ":nested"],
    tsconfig = "tsconfig.json",
    root_dir = "importing_modules",
)

# ts_library should not use @internal declarations by default. (FAIL)
ts_library(
    name = "use_internal_wrong_FAIL",
    srcs = ["use_internal/index.ts"],
    deps = [":basic"],
    tsconfig = "tsconfig.json",
    root_dir = "use_internal",
    out_dir = "use_internal_wrong",
    tags = ["manual"],
)

# ts_library should check that deps_use_internal is a subset of deps. (FAIL)
ts_library(
    name = "use_internal_subset_FAIL",
    srcs = ["use_internal/index.ts"],
    deps_use_internal = [":basic"],
    tsconfig = "tsconfig.json",
    root_dir = "use_internal",
    out_dir = "use_internal_wrong",
    tags = ["manual"],
)

# ts_library should support using @internal declarations.
ts_library(
    name = "use_internal",
    srcs = ["use_internal/index.ts"],
    deps = [":basic"],
    deps_use_internal = [":basic"],
    tsconfig = "tsconfig.json",
    root_dir = "use_internal",
)

# ts_library should make transitive declarations available.
ts_library(
    name = "use_transitive",
    srcs = ["use_transitive/index.ts"],
    deps = [":use_internal"],
    tsconfig = "tsconfig.json",
    root_dir = "use_transitive",
)

# ts_library should load ambient declarations from ts_ext_library.
ts_ext_library(
    name = "ambient",
    declarations = glob(["ambient/*.d.ts"]),
    root_dir = "ambient",
    ambient = True,
    entry_point = "ambient/index.d.ts",
)

ts_library(
    name = "use_ambient",
    srcs = ["use_ambient/index.ts"],
    deps = [":ambient"],
    tsconfig = "tsconfig.json",
    root_dir = "use_ambient",
)

# ts_library should load non-ambient declarations from ts_ext_library.
ts_ext_library(
    name = "non_ambient",
    declarations = glob(["non_ambient/*.d.ts"]),
    root_dir = "non_ambient",
    ambient = False,
    entry_point = "non_ambient/index.d.ts",
)

ts_library(
    name = "use_non_ambient",
    srcs = ["use_non_ambient/index.ts"],
    deps = [":non_ambient"],
    tsconfig = "tsconfig.json",
    root_dir = "use_non_ambient",
)

# ts_library should make transitive ambient declarations available.
ts_library(
    name = "use_transitive_ambient",
    srcs = ["use_transitive_ambient/index.ts"],
    deps = [":use_ambient"],
    tsconfig = "tsconfig.json",
    root_dir = "use_transitive_ambient",
)

# ts_library should support using only generated sources.
genrule(
    name = "generated_source",
    outs = ["generated.ts"],
    cmd = "echo \"export const generated = 'generated';\" > $@",
)

ts_library(
    name = "use_generated_source",
    srcs = [":generated_source"],
    tsconfig = "tsconfig.json",
)
