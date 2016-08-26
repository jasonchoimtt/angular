/** @inline */
function forEach(a: string[], fn: (k: string) => void) {
  for (const k of a) {
    fn(k);
  }
}

forEach(['a', 'b'], x => console.log(x));

import {isPresent, isString} from '../modules/@angular/facade/src/lang';


if (!decodeURIComponent('abc')) {
  console.log(!isString('def'));
}
