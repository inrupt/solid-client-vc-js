module.exports = {
  extends: ["@inrupt/eslint-config-lib"],
  overrides: [
    {
      files: ["**/*.test.ts"],
      rules: {
        // Jest is configured not to inject the globals, but eslint complains.
        "no-shadow": "off",
      },
    },
  ],
};
