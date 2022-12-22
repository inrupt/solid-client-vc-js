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
import { getNodeTestingEnvironment } from "@inrupt/internal-test-env";

// TODO: Add "vcProvider" to TestingEnvironmentBase instead of TestingEnvironmentNode since it is used by both instances.
const { vcProvider } = getNodeTestingEnvironment({
  vcProvider: "",
});

test("Issue credential to a resource, then revoking it", async ({
  page,
  auth,
}) => {
  await auth.login({ allow: true });
  // Create the resource
  await Promise.all([
    page.click("button[data-testid=create-resource]"),
    page.waitForRequest((request) => request.method() === "POST"),
    page.waitForResponse((response) => response.status() === 201),
    // eslint-disable-next-line playwright/no-conditional-in-test
    page.fill("input[data-testid=vcProvider]", vcProvider || ""),
  ]);
  await expect(
    page.innerText("span[data-testid=resource-iri]")
  ).resolves.toMatch(/https:\/\/.*\.txt/);

  // Issue VC for resource
  await Promise.all([
    page.click("button[data-testid=issue-vc]"),
    page.waitForRequest((request) => request.method() === "POST"),
    page.waitForResponse((response) => response.status() === 201),
  ]);
  await expect(
    page.innerText("pre[data-testid=verifiable-credential]")
  ).resolves.not.toBe("");

  // TODO add extra validation of claims here?

  // Revoke VC for resource
  await Promise.all([
    page.click("button[data-testid=issue-vc]"),
    page.waitForRequest((request) => request.method() === "POST"),
    page.waitForResponse((response) => response.status() === 201),
  ]);
  await expect(
    page.innerText("pre[data-testid=verifiable-credential]")
  ).resolves.not.toBe("");

  // Cleanup the resource
  await Promise.all([
    page.click("button[data-testid=delete-resource]"),
    page.waitForRequest((request) => request.method() === "DELETE"),
    page.waitForResponse((response) => response.status() === 204),
  ]);
  await expect(
    page.innerText("span[data-testid=resource-iri]")
  ).resolves.toMatch("");
});

test("Try issuing an invalid credential, get an error", async ({
  page,
  auth,
}) => {
  await auth.login({ allow: true });
  // Create the resource
  await Promise.all([
    page.click("button[data-testid=create-resource]"),
    page.waitForRequest((request) => request.method() === "POST"),
    page.waitForResponse((response) => response.status() === 201),
  ]);
  await expect(
    page.innerText("span[data-testid=resource-iri]")
  ).resolves.toMatch(/https:\/\/.*\.txt/);

  // Try to issue VC for resource
  await Promise.all([
    page.click("button[data-testid=issue-invalid-vc]"),
    page.waitForRequest((request) => request.method() === "POST"),
    page.waitForResponse((response) => response.status() === 400),
    page.click("button[data-nextjs-errors-dialog-left-right-close-button]"),
  ]);
  // Validate we get nothing in response
  await expect(
    page.innerText("pre[data-testid=verifiable-credential]")
  ).resolves.toBe("");

  // Cleanup the resource
  await Promise.all([
    page.click("button[data-testid=delete-resource]"),
    page.waitForRequest((request) => request.method() === "DELETE"),
    page.waitForResponse((response) => response.status() === 204),
  ]);
  await expect(
    page.innerText("span[data-testid=resource-iri]")
  ).resolves.toMatch("");
});
