module.exports = {
  "ecmaFeatures": {
    "blockBindings": true
  },
  "parser": "babel-eslint",
  "env": {
    "node": true,
    "mocha": true,
    "es6": true
  },
  "globals": {
  },
  "plugins": [
    "json",
  ],
  "extends": "eslint:recommended",
  "rules": {

    "no-console": 0,

    "no-invalid-this": 0,

    /**
     * Good practices, although violating them doesn't cause problems
     */

    // rule #1, enforce consistent indentation (double spaces)
    "indent": [ 1, 2, { "SwitchCase": 1, "VariableDeclarator": 2 } ],

    // enforce valid JSDoc comments
    "valid-jsdoc": 1,

    // disallow extending native types
    "no-extend-native": 1,

    // disallow unnecessary calls to .bind()
    "no-extra-bind": 1,

    // disallow function declarations and expressions inside loop statements
    "no-loop-func": 1,

    // disallow throwing literals as exceptions
    "no-throw-literal": 1,

    // enforce consistent spacing inside single-line blocks
    "block-spacing": 1,

    // enforce consistent comma style
    "comma-style": [1, "last"],

    // enforce consistent brace style for all control statements
    "curly": 1,

    // disallow if statements as the only statement in else blocks
    "no-lonely-if": 1,

    // disallow mixed spaces and tabs for indentation
    "no-mixed-spaces-and-tabs": [1, "smart-tabs"],

    // disallow trailing whitespace at the end of lines
    "no-trailing-spaces": 1,

    // disallow ternary operators when simpler alternatives exist
    "no-unneeded-ternary": 1,

    // enforce consistent linebreak style for operators
    "operator-linebreak": [1, "after"],

    // require spacing around operators
    "space-infix-ops": [ 1, { "int32Hint": false } ],

    // enforce consistent spacing before or after unary operators
    "space-unary-ops": 1,

    // enforce consistent linebreak style
    "linebreak-style": [ 2, "unix" ],

    // disallow unused variables
    "no-unused-vars": 1,

    // disallow unnecessary semicolons
    "no-extra-semi": 1,

    // disallow unnecessary parentheses
    "no-extra-parens": 1,

    // disallow empty functions
    "no-empty-function": 1,

    // disallow multiple spaces
    "no-multi-spaces": 1,

    // enforce consistent spacing before and after commas
    "comma-spacing": [ 1, { "before": false, "after": true } ],

    // enforce dot notation whenever possible
    "dot-notation": [ 1, { allowPattern: '^[a-z]+(.[a-z]+)+$' } ],

    /**
     * Error: violating following rules may cause problems
     */

    // enforce the use of variables within the scope they are defined
    "block-scoped-var": 2,

    // Require === and !==
    "eqeqeq": [2, "smart"],

    // disallow null comparisons without type-checking operators
    "no-eq-null": 2,

    // disallow the use of eval()
    "no-eval": 2,

    // disallow leading or trailing decimal points in numeric literals
    "no-floating-decimal": 2,

    // disallow this keywords outside of classes or class-like objects
    "no-invalid-this": 2,

    // disallow unnecessary nested blocks
    "no-lone-blocks": 2,

    // disallow new operators with the String, Number, and Boolean objects
    "no-new-wrappers": 2,

    // disallow assignment operators in return statements
    "no-return-assign": 2,

    // disallow new operators outside of assignments or comparisons
    "no-new": 2,

    // disallow comparisons where both sides are exactly the same
    "no-self-compare": 2,

    // disallow comma operators
    "no-sequences": 2,

    // disallow void operators
    "no-void": 2,

    // disallow unnecessary calls to .call() and .apply()
    "no-useless-call": 2,

    // disallow with statements
    "no-with": 2,

    // require or disallow semicolons instead of ASI
    "semi": [2, "always"]
  }
};
