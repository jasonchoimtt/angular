Compilation unit: compiler_test_module
modules/@angular/compiler/
  output_emitter_codegen_util.ts
  output_emitter_codegen_typed.ts
  output_emitter_codegen_untyped.ts
  output_emitter_generated_typed.d.ts
  output_emitter_generated_untyped.d.ts

  output_emitter_codegen_spec.ts


build_defs/
  compiler_output_emitter_codegen.sh (nodejs entrypoint that calls .emit())

where
  _spec includes _generated_typed and _generated_untyped

Compilation unit: compiler_test_emitter_codegen
  genrule that calls compiler_output_emitter_codegen.sh

Test unit: compiler_test
runs tests in compiler_test_module and compiler_test_emitter_codegen
