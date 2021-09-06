/**
 * Copyright 2020 Inrupt Inc.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal in
 * the Software without restriction, including without limitation the rights to use,
 * copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the
 * Software, and to permit persons to whom the Software is furnished to do so,
 * subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED,
 * INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A
 * PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
 * HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
 * OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
 * SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

import { describe, it, expect } from "@jest/globals";
import { issueVerifiableCredential } from "../../src/index";
import { Session } from "@inrupt/solid-client-authn-node";
import { config } from "dotenv-flow";

// Load environment variables from .env.test.local if available:
config({
  path: __dirname,
  // In CI, actual environment variables will overwrite values from .env files.
  // We don't need warning messages in the logs for that:
  silent: process.env.CI === "true",
});

const validCredentialClaims = {
  "@context": {
    gc: "https://w3id.org/GConsent#",
    consent: "http://www.w3.org/ns/solid/consent#",
    ldp: "http://www.w3.org/ns/ldp#",
    acl: "http://www.w3.org/ns/auth/acl#",
    inbox: {
      "@id": "ldp:inbox",
      "@type": "@id",
    },
    Read: "acl:Read",
    mode: {
      "@id": "acl:mode",
      "@type": "@id",
    },
    forPersonalData: {
      "@id": "gc:forPersonalData",
      "@type": "@id",
    },
    forPurpose: {
      "@id": "gc:forPurpose",
      "@type": "@id",
    },
    hasConsent: {
      "@id": "gc:hasConsent",
      "@type": "@id",
    },
    hasStatus: {
      "@id": "gc:hasStatus",
      "@type": "@id",
    },
  },
  hasConsent: {
    forPurpose: "https://example.org/ns/somePurpose",
    forPersonalData: "https://example.org/ns/someData",
    hasStatus: "gc:ConsentStatusRequested",
    mode: "acl:Read",
  },
  inbox: "https://pod.inrupt.com/solid-client-e2e-tester-ess/inbox/",
};

/**
 * These claims don't match the SHACL shape expected by the consent service.
 */
const invalidCredentialClaims = {
  "@context": {
    ldp: "http://www.w3.org/ns/ldp#",
    acl: "http://www.w3.org/ns/auth/acl#",
    inbox: {
      "@id": "ldp:inbox",
      "@type": "@id",
    },
    Read: "acl:Read",
    mode: {
      "@id": "acl:mode",
      "@type": "@id",
    },
  },
  inbox: "https://pod.inrupt.com/solid-client-e2e-tester-ess/inbox/",
};

describe("issueVerifiableCredential", () => {
  it("has the appropriate environment variables", () => {
    expect(process.env.E2E_TEST_ESS_IDP_URL).not.toBeUndefined();
    expect(process.env.E2E_TEST_ESS_CLIENT_ID).not.toBeUndefined();
    expect(process.env.E2E_TEST_ESS_CLIENT_SECRET).not.toBeUndefined();
    expect(process.env.E2E_TEST_ESS_VC_ISSUER).not.toBeUndefined();
    expect(process.env.E2E_TEST_ESS_VC_SUBJECT).not.toBeUndefined();
  });

  it("Successfully gets a VC from a valid issuer", async () => {
    const session = new Session();
    await session.login({
      oidcIssuer: process.env.E2E_TEST_ESS_IDP_URL,
      clientId: process.env.E2E_TEST_ESS_CLIENT_ID,
      clientSecret: process.env.E2E_TEST_ESS_CLIENT_SECRET,
    });
    const credential = await issueVerifiableCredential(
      process.env.E2E_TEST_ESS_VC_ISSUER!,
      process.env.E2E_TEST_ESS_VC_SUBJECT!,
      validCredentialClaims,
      { "@context": [] },
      {
        fetch: session.fetch,
      }
    );
    expect(credential.credentialSubject.id).toBe(
      process.env.E2E_TEST_ESS_VC_SUBJECT
    );
    await session.logout();
  });

  it("throws if the issuer returns an error", async () => {
    const session = new Session();
    await session.login({
      oidcIssuer: process.env.E2E_TEST_ESS_IDP_URL,
      clientId: process.env.E2E_TEST_ESS_CLIENT_ID,
      clientSecret: process.env.E2E_TEST_ESS_CLIENT_SECRET,
    });
    await expect(
      issueVerifiableCredential(
        process.env.E2E_TEST_ESS_VC_ISSUER!,
        process.env.E2E_TEST_ESS_VC_SUBJECT!,
        invalidCredentialClaims,
        { "@context": [] },
        {
          fetch: session.fetch,
        }
      )
    ).rejects.toThrow("400");
    await session.logout();
  });
});
