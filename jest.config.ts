import type { Config } from "jest";

type ArrayElement<MyArray> = MyArray extends Array<infer T> ? T : never;

const baseConfig: ArrayElement<NonNullable<Config["projects"]>> = {
  roots: ["<rootDir>"],
  testMatch: ["**/*.test.ts"],
  // This combination of preset/transformIgnorePatterns enforces that both TS and
  // JS files are transformed to CJS, and that the transform also applies to the
  // dependencies in the node_modules, so that ESM-only dependencies are supported.
  preset: "ts-jest",
  // deliberately set to an empty array to allow including node_modules when transforming code:
  transformIgnorePatterns: [],
  modulePathIgnorePatterns: ["dist/"],
  coveragePathIgnorePatterns: [".*.spec.ts", "dist/"],
  clearMocks: true,
  injectGlobals: false,
};

// Required by @peculiar/webcrypto, which comes from the polyfills
// loaded in the setup file.
process.env.OPENSSL_CONF = "/dev/null";

export default {
  reporters: ["default", "github-actions"],
  collectCoverage: true,
  coverageReporters: process.env.CI ? ["text", "lcov"] : ["text"],
  coverageThreshold: {
    global: {
      branches: 50,
      functions: 48,
      lines: 50,
      statements: 50,
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
  collectCoverageFrom: ["<rootDir>/src/**/*.ts"],
  projects: [
    {
      ...baseConfig,
      testEnvironment: "jsdom",
      displayName: "src",
      roots: ["<rootDir>/src"],
      // This test environment is an extension of jsdom. This module targets the
      // browser environment only, so tests only need to run in jsdom.
      // Currently, this is still required despite the polyfills in jest setup.
      // See comments in file.
    },
    {
      ...baseConfig,
      testEnvironment: "node",
      displayName: "e2e-node",
      roots: ["<rootDir>/e2e/node"],
      setupFiles: ["<rootDir>/jest.e2e.setup.ts"],
      slowTestThreshold: 30,
    },
  ],
} as Config;
