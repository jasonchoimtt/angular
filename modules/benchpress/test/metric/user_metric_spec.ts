/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import {ReflectiveInjector} from '@angular/core';
import {AsyncTestCompleter, afterEach, beforeEach, ddescribe, describe, expect, iit, inject, it, xit} from '@angular/core/testing/testing_internal';
import {StringMapWrapper} from '@angular/facade/src/collection';
import {Json} from '@angular/facade/src/lang';
import {Injector, Metric, MultiMetric, Options, PerfLogFeatures, PerflogMetric, UserMetric, WebDriverAdapter, WebDriverExtension, bind, provide} from 'benchpress/common';

export function main() {
  var wdAdapter: MockDriverAdapter;

  function createMetric(
      perfLogs, perfLogFeatures,
      {userMetrics}: {userMetrics?: {[key: string]: string}} = {}): UserMetric {
    if (perfLogFeatures === undefined || perfLogFeatures === null) {
      perfLogFeatures =
          new PerfLogFeatures({render: true, gc: true, frameCapture: true, userTiming: true});
    }
    if (userMetrics === undefined || userMetrics === null) {
      userMetrics = StringMapWrapper.create();
    }
    wdAdapter = new MockDriverAdapter();
    var bindings = [
      Options.DEFAULT_PROVIDERS, UserMetric.PROVIDERS,
      bind(Options.USER_METRICS).toValue(userMetrics),
      provide(WebDriverAdapter, {useValue: wdAdapter})
    ];
    return ReflectiveInjector.resolveAndCreate(bindings).get(UserMetric);
  }

  describe('user metric', () => {

    it('should describe itself based on userMetrics', () => {
      expect(createMetric([[]], new PerfLogFeatures(), {
               userMetrics: {'loadTime': 'time to load'}
             }).describe())
          .toEqual({'loadTime': 'time to load'});
    });

    describe('endMeasure', () => {
      it('should stop measuring when all properties have numeric values',
         inject([AsyncTestCompleter], (async) => {
           let metric = createMetric(
               [[]], new PerfLogFeatures(),
               {userMetrics: {'loadTime': 'time to load', 'content': 'time to see content'}});
           metric.beginMeasure()
               .then((_) => metric.endMeasure(true))
               .then((values: {[key: string]: string}) => {
                 expect(values['loadTime']).toBe(25);
                 expect(values['content']).toBe(250);
                 async.done();
               });

           wdAdapter.data['loadTime'] = 25;
           // Wait before setting 2nd property.
           setTimeout(() => { wdAdapter.data['content'] = 250; }, 50);

         }), 600);
    });
  });
}

class MockDriverAdapter extends WebDriverAdapter {
  data: any = {};

  executeScript(script: string): any {
    // Just handles `return window.propName` ignores `delete window.propName`.
    if (script.indexOf('return window.') == 0) {
      let metricName = script.substring('return window.'.length);
      return Promise.resolve(this.data[metricName]);
    } else if (script.indexOf('delete window.') == 0) {
      return Promise.resolve(null);
    } else {
      return Promise.reject(`Unexpected syntax: ${script}`);
    }
  }
}
