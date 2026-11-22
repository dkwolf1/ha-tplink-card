import globals from "globals";

const rules = {
  "no-undef": "error",
  "no-unused-vars": ["error", { caughtErrors: "none" }],
  "no-dupe-keys": "error",
  "no-unreachable": "error",
};

export default [
  {
    ignores: [
      "dist/**",
      "release/**",
      "test-results/**",
      "playwright-report/**",
    ],
  },
  {
    files: ["src/**/*.js", "demo/**/*.js"],
    languageOptions: { globals: globals.browser },
    rules,
  },
  {
    files: ["*.js", "scripts/**/*.mjs", "tests/**/*.{js,cjs}"],
    languageOptions: { globals: globals.node },
    rules,
  },
];
