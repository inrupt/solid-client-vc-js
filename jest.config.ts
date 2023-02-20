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
  coveragePathIgnorePatterns: [
    ".*.spec.ts",
    "dist/",
    "node_modules/",
    ".*.mock..*",
  ],
  clearMocks: true,
  injectGlobals: false,
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
};

export default {
  reporters: ["default", "github-actions"],
  collectCoverage: true,
  coverageReporters: process.env.CI ? ["text", "lcov"] : ["text"],
  coverageThreshold: {
    global: {
      branches: 100,
      functions: 100,
      lines: 100,
      statements: 100,
    },
  },
  injectGlobals: false,
  clearMocks: true,
  collectCoverageFrom: ["<rootDir>/src/**/*.ts"],
  projects: [
    {
      ...baseConfig,
      testEnvironment: "jsdom",
      displayName: "browser",
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
      setupFiles: ["<rootDir>/e2e/node/jest.e2e.setup.ts"],
      slowTestThreshold: 30,
    },
  ],
} as Config;
