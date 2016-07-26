// Tun on full stack traces in errors to help debugging
Error.stackTraceLimit=Infinity;

jasmine.DEFAULT_TIMEOUT_INTERVAL = 100;

// Cancel Karma's synchronous start,
// we will call `__karma__.start()` later, once all the specs are loaded.
__karma__.loaded = function() {};

System.config({
  baseURL: '/base',
  defaultJSExtensions: true,
  map: {
    // 'benchpress/*': 'modules/benchpress/*.js',
    '@angular': 'modules/@angular',
    'rxjs': 'node_modules/rxjs',
    'parse5/index': 'modules/empty.js',
    '@angular/platform-server/src/parse5_adapter': 'modules/empty.js'
  },
  packages: {
    '@angular/core': {
      main: 'index.js',
      defaultExtension: 'js'
    },
    '@angular/compiler': {
      main: 'index.js',
      defaultExtension: 'js'
    },
    '@angular/common': {
      main: 'index.js',
      defaultExtension: 'js'
    },
    '@angular/forms': {
      main: 'index.js',
      defaultExtension: 'js'
    },
    // remove after all tests imports are fixed
    '@angular/facade': {
      main: 'index.js',
      defaultExtension: 'js'
    },
    '@angular/router-deprecated': {
      main: 'index.js',
      defaultExtension: 'js'
    },
    '@angular/http': {
      main: 'index.js',
      defaultExtension: 'js'
    },
    '@angular/upgrade': {
      main: 'index.js',
      defaultExtension: 'js'
    },
    '@angular/platform-browser': {
      main: 'index.js',
      defaultExtension: 'js'
    },
    '@angular/platform-browser-dynamic': {
      main: 'index.js',
      defaultExtension: 'js'
    },
    '@angular/platform-server': {
      main: 'index.js',
      defaultExtension: 'js'
    }
  },
  transpiler: null,
});


// Set up the test injector, then import all the specs, execute their `main()`
// method and kick off Karma (Jasmine).
System.import('@angular/core/testing')
  .then(function(coreTesting){
    return System.import('@angular/platform-browser-dynamic/testing')
      .then(function(browserTesting) {
         coreTesting.initTestEnvironment(
           browserTesting.BrowserDynamicTestModule,
           browserTesting.browserDynamicTestPlatform());
      });
  })
.then(function() {
  return Promise.all(
    Object.keys(window.__karma__.files) // All files served by Karma.
    .filter(onlySpecFiles)
    // .map(window.file2moduleName)        // Normalize paths to module names.
    .map(function(path) {
      return System.import(path).then(function(module) {
        if (module.hasOwnProperty('main')) {
          module.main();
        }
      });
    }));
})
.then(function() {
  __karma__.start();
}, function(error) {
  __karma__.error(error.stack || error);
});


function onlySpecFiles(path) {
  return /_spec\.js$/.test(path);
}
