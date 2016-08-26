make_tsconfig config = stringifyJson
  { rootDir: "."
  , outDir: "."
  , module: "commonjs"
  , moduleResolution: "node"
  , *config }

tsc_base :compiler { files = {}, deps = {}, config = {}, module_name = @name }
  where
    (all (match '( *.ts )) files) and
    (all (not << (match '( *.d.ts ))) files)
=
  let
    tsconfig = file (tmpFile "tsconfig.json") (make_tsconfig config)
    main =
      let
        js_files = mapExtension ".ts" ".js" files
        d_ts_files = mapExtension ".d.ts" "js" files
      in
        transform
          (run :compiler ["-p", tsconfig])
          ( files
          , map file (js_files + d_ts_files) )
  in
    { files: main
    , javascript:
        { root: files.root
        , module_name = takeFirst [module_name, @name] }
    , typescript:
        { declarations = !() } }

:tsc = nodejs_binary
  { files: !( node_modules/typescript/**/*.ts )
  , entry_point: = !( node_modules/typescript/bin/tsc ) }

typescript = tsc_base :tsc

:tsc_wrapped =
  { files: !( tools/@angular/tsc-wrapped => **/*.ts ) }
  |> \x -> typescript { *x, deps: !( @types//:node, @types//:jasmine ) }
  |> \x -> nodejs_binary { *x, entry_point: find '( src/main.js ) x.files }

tsc_wrapped = tsc_base :tsc_wrapped
