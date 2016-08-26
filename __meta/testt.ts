defineTransform('Inline isPresent', () => {
  return compose([
    simpleTransform(
        Matcher.fromAst((/*@Matcher.Complex()*/ i: Object) => isPresent(i)),
        [Template.fromAst((i) => i), Template.fromAst((i) => !!i)]),
    simpleTransform(
        Matcher.fromAst((i: any) => isPresent(i)),
        Template.fromAst((i) => i !== null && i !== undefined)),
    simpleTransform(
        Matcher.fromAst((/*@Matcher.Complex()*/ i: any) => {
          if (Matchers.BignaryExpression(isPresent(i))) {
            Matchers.Statements();
          }
        }),
        Template.fromAst((i) => {
          const val = i;
          if (Matchers.BinaryExpression(val !== null && val !== undefined)) {
            Matchers.Statements();
          }
        }))
  ]);
});
