/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import {SchemaMetadata, SecurityContext} from '@angular/core';

import {ElementSchemaRegistry} from '../index';

export class MockSchemaRegistry implements ElementSchemaRegistry {
  constructor(
      public existingProperties: {[key: string]: boolean},
      public attrPropMapping: {[key: string]: string}) {}

  hasProperty(tagName: string, property: string, schemas: SchemaMetadata[]): boolean {
    var result = this.existingProperties[property];
    return result !== undefined && result !== null ? result : true;
  }

  securityContext(tagName: string, property: string): SecurityContext {
    return SecurityContext.NONE;
  }

  getMappedPropName(attrName: string): string {
    var result = this.attrPropMapping[attrName];
    return result !== undefined && result !== null ? result : attrName;
  }

  getDefaultComponentElementName(): string { return 'ng-component'; }
}
