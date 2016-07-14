require('source-map-support').install();
require('zone.js/dist/zone-node.js');
require('zone.js/dist/long-stack-trace-zone.js');
require('zone.js/dist/async-test.js');
require('zone.js/dist/fake-async-test.js');
require('zone.js/dist/jasmine-patch');

require('reflect-metadata/Reflect');

// Tun on full stack traces in errors to help debugging
(<any>Error)['stackTraceLimit'] = Infinity;

jasmine.DEFAULT_TIMEOUT_INTERVAL = 100;

// TODO: remove it if it is not needed
// (<any>jasmine).configureDefaultReporter({showColors: process.argv.indexOf('--no-color') === -1});

// "testing" clashes with selenium-webdriver declarations
import * as testing_ from '@angular/core/testing';
import * as testingPlatformServer from '@angular/platform-server/testing/server';

testing_.initTestEnvironment(
    testingPlatformServer.ServerTestModule, testingPlatformServer.serverTestPlatform());


import {Parse5DomAdapter} from '@angular/platform-server/src/parse5_adapter';

Parse5DomAdapter.makeCurrent();
