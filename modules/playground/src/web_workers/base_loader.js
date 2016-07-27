/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

importScripts(
    '/node_modules/es6-shim/es6-shim.js',
    '/node_modules/zone.js/dist/zone.js',
    '/node_modules/zone.js/dist/long-stack-trace-zone.js',
    '/node_modules/systemjs/dist/system.src.js',
    '/node_modules/reflect-metadata/Reflect.js');

System.config({
  map: {
    '@angular/core': '/modules/@angular/core/core.umd.js',
    '@angular/common': '/modules/@angular/common/common.umd.js',
    '@angular/compiler': '/modules/@angular/compiler/compiler.umd.js',
    '@angular/platform-browser': '/modules/@angular/platform-browser/platform-browser.umd.js',
    '@angular/platform-browser-dynamic': '/modules/@angular/platform-browser-dynamic/platform-browser-dynamic.umd.js',
    '@angular/http': '/modules/@angular/http/http.umd.js',
    '@angular/upgrade': '/modules/@angular/upgrade/upgrade.umd.js',
    '@angular/router-deprecated': '/modules/@angular/router-deprecated/router-deprecated.umd.js',
    '@angular/router': '/modules/@angular/router/router.umd.js',
    '@angular/core/src/facade': '/modules/@angular/core/src/facade',
    'rxjs': '/node_modules/rxjs'
  },
  packages: {
    '@angular/core/src/facade': {defaultExtension: 'js'},
    'rxjs': {defaultExtension: 'js'}
  },
  defaultJSExtensions: true
});
