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

import inruptCfg, { ignoreTypedLinting } from "@inrupt/eslint-config-base";
import next from "@next/eslint-plugin-next";

import { defineConfig } from "eslint/config";

ignoreTypedLinting([
  "jest.e2e.setup.ts",
  "jest.config.ts",
  "playwright.config.ts",
  "**/jest.e2e.setup.ts",
]);

export default defineConfig([
  inruptCfg,
  {
    plugins: {
      "@next/next": next,
    },
    rules: {
      ...next.configs.recommended.rules,
      ...next.configs["core-web-vitals"].rules,
    },
    files: ["e2e/browser/test-app/"],
  },
  {
    rules: {
      "import/no-unresolved": "off",
    },
    files: ["**/e2e/browser/test-app/**"],
  },
  {
    rules: {
      "@typescript-eslint/no-non-null-assertion": "off",
    },
    files: ["**/*.test.ts"],
  },
]);
