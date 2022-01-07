import { ClientFunction } from "testcafe";
import { config } from "dotenv-flow";
import { essUserLogin } from "./roles";

// We re-use the test helpers from elsewhere, but we need to ignore the
// TypeScript error (TS6059) that complains about not all files being under the
// one 'rootDir'.
// @ts-ignore
import type { getHelpers } from "../../.codesandbox/sandbox/src/end-to-end-test-helpers";

// E2eHelpers is a global defined in .codesandbox/sandbox/src/end-to-end-helpers.
// Since code inside of ClientFunction is executed in that context in the browser,
// that variable is available to it - but as far as TypeScript is concerned,
// it is executed in the context of this test file.
// Hence, we just declare this variable to be of the same type here.
const E2eHelpers: ReturnType<typeof getHelpers> = {} as any;

// Load environment variables from .env.test.local if available:
config({
  default_node_env: process.env.NODE_ENV || "test",
  path: __dirname,
  // In CI, actual environment variables will overwrite values from .env files.
  // We don't need warning messages in the logs for that:
  silent: process.env.CI === "true",
});

fixture("End-to-end tests").page("http://localhost:1234/end-to-end-test.html");

// eslint-disable-next-line jest/expect-expect, jest/no-done-callback
test("solid-client-vc example functions", async (t: TestController) => {
  // const sampleModuleFn = ClientFunction(() => E2eHelpers.sampleModuleFn());
  const sampleModuleFn = ClientFunction(() => true);

  await essUserLogin(t);

  await t.expect(sampleModuleFn()).eql(true);
});
