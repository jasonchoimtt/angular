/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import {ElementSchemaRegistry} from '../src/schema/element_schema_registry';
import {UrlResolver, createUrlResolverWithoutPackagePrefix} from '../src/url_resolver';
import {XHR} from '../src/xhr';

import {MockSchemaRegistry} from './schema_registry_mock';
import {MockXHR} from './xhr_mock';

// This provider is put here just so that we can access it from various
// internal test packages.
// TODO: get rid of it or move to a separate @angular/internal_testing package
export var TEST_COMPILER_PROVIDERS: any[] = [
  {provide: ElementSchemaRegistry, useValue: new MockSchemaRegistry({}, {})},
  {provide: XHR, useClass: MockXHR},
  {provide: UrlResolver, useFactory: createUrlResolverWithoutPackagePrefix}
];
