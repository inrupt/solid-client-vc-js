//
// Copyright 2022 Inrupt Inc.
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

import { test, expect } from "@inrupt/internal-playwright-helpers";
import { getBrowserTestingEnvironment } from "@inrupt/internal-test-env";

const { vcProvider } = getBrowserTestingEnvironment({
  vcProvider: "",
});

test("Issue credential to a resource, then revoking it", async ({
  page,
  auth,
}) => {
  await auth.login({ allow: true });
  // eslint-disable-next-line playwright/no-conditional-in-test
  await page.fill("input[data-testid=vcProvider]", vcProvider || "");

  // Issue VC
  await Promise.all([
    page.click("button[data-testid=issue-vc]"),
    page.waitForRequest((request) => request.method() === "POST"),
    page.waitForResponse((response) => response.status() === 201),
  ]);
  await expect(
    page.innerText("pre[data-testid=verifiable-credential]")
  ).resolves.not.toBe("");

  // Validation of type claims

  const vcData = JSON.parse(
    await page.innerText("pre[data-testid=verifiable-credential]")
  );

  expect(vcData.type).toContain("VerifiableCredential");
  expect(vcData["@context"]).not.toBe("");

  // Revoke VC
  await Promise.all([
    page.click("button[data-testid=issue-vc]"),
    page.waitForRequest((request) => request.method() === "POST"),
    page.waitForResponse((response) => response.status() === 201),
  ]);
  await expect(
    page.innerText("pre[data-testid=verifiable-credential]")
  ).resolves.not.toBe("");
});

test("Try issuing an invalid credential, get an error", async ({
  page,
  auth,
}) => {
  await auth.login({ allow: true });

  // Try to issue VC with invalid credentials
  await Promise.all([
    page.click("button[data-testid=issue-invalid-vc]"),
    page.click("button[data-nextjs-errors-dialog-left-right-close-button]"),
    page.waitForRequest((request) => request.method() === "POST"),
    page.waitForResponse((response) => response.status() === 400),
  ]);
  // Validate we get nothing in response
  await expect(
    page.innerText("pre[data-testid=verifiable-credential]")
  ).resolves.toBe("");
});
