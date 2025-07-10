// Copyright Inrupt Inc.
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal in
// the Software without restriction, including without limitation the rights to use,
// copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the
// Software, and to permit persons to whom the Software is furnished to do so,
// subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED,
// INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A
// PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
// HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
// OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
// SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
//

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
      branches: 95,
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
      setupFilesAfterEnv: [],
    },
  ],
} as Config;
