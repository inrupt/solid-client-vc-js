module.exports = {
  preset: "ts-jest",
  testEnvironment: "jsdom",
  clearMocks: true,
  collectCoverage: true,
  coverageThreshold: {
    global: {
      branches: 100,
      functions: 100,
      lines: 100,
      statements: 100,
    },
  },
  coveragePathIgnorePatterns: [
    "/node_modules/",
    "<rootDir>/dist",
    "./*.mock.ts",
  ],
  testPathIgnorePatterns: [
    "/node_modules/",
    // By default we only run unit tests:
    "/src/e2e-node/",
    "/src/e2e-browser/",
  ],
  injectGlobals: false,
};
