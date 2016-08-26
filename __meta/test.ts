/** @inline */
function forEach(a: string[], fn: (k: string) => void) {
  for (const k of a) {
    fn(k);
  }
}
  for (const k of ['a', 'b']) {/**TODO #facade @inline*/ (  x => console.log(x) )(k);
  }

;


if (!decodeURIComponent('abc')) {
  console.log(!( typeof 'def' === 'string'));
}
