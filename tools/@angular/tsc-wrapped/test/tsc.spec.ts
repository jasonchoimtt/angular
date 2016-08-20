import {Tsc} from '@angular/tsc-wrapped/src/tsc';
import * as ts from 'typescript';

describe('options parsing', () => {

  const tsc = new Tsc(
      () => `
{
    "angularCompilerOptions": {
        "googleClosureOutput": true
    },
    "compilerOptions": {
        "module": "commonjs",
        "outDir": "built"
    }
}`,
      () => ['tsconfig.json']);

  it('should combine all options into ngOptions', () => {
    const {parsed, ngOptions} = tsc.readConfiguration('projectDir', 'basePath');

    expect(ngOptions).toEqual({
      genDir: 'basePath',
      googleClosureOutput: true,
      module: ts.ModuleKind.CommonJS,
      outDir: 'basePath/built',
      configFilePath: undefined
    });
  });
});
