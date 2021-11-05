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

import { describe, it, expect, beforeEach, afterEach } from "@jest/globals";
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

type OidcIssuer = string;
type VcIssuer = string;
type VcSubject = string;
type ClientId = string;
type ClientSecret = string;
type AuthDetails = [OidcIssuer, ClientId, ClientSecret, VcIssuer, VcSubject];
// Instructions for obtaining these credentials can be found here:
// https://github.com/inrupt/solid-client-authn-js/blob/1a97ef79057941d8ac4dc328fff18333eaaeb5d1/packages/node/example/bootstrappedApp/README.md
const serversUnderTest: AuthDetails[] = [
  // pod.inrupt.com:
  [
    // Cumbersome workaround, but:
    // Trim `https://` from the start of these URLs,
    // so that GitHub Actions doesn't replace them with *** in the logs.
    process.env.E2E_TEST_ESS_IDP_URL!.replace(/^https:\/\//, ""),
    process.env.E2E_TEST_ESS_VC_ISSUER!.replace(/^https:\/\//, ""),
    process.env.E2E_TEST_ESS_VC_SUBJECT!.replace(/^https:\/\//, ""),
    process.env.E2E_TEST_ESS_CLIENT_ID!,
    process.env.E2E_TEST_ESS_CLIENT_SECRET!,
  ],
  // dev-next.inrupt.com:
  [
    // Cumbersome workaround, but:
    // Trim `https://` from the start of these URLs,
    // so that GitHub Actions doesn't replace them with *** in the logs.
    process.env.E2E_TEST_DEV_NEXT_IDP_URL!.replace(/^https:\/\//, ""),
    process.env.E2E_TEST_DEV_NEXT_VC_ISSUER!.replace(/^https:\/\//, ""),
    process.env.E2E_TEST_DEV_NEXT_VC_SUBJECT!.replace(/^https:\/\//, ""),
    process.env.E2E_TEST_DEV_NEXT_CLIENT_ID!,
    process.env.E2E_TEST_DEV_NEXT_CLIENT_SECRET!,
  ],
];

describe.each(serversUnderTest)(
  "VC client end-to-end tests authenticated to [%s], issuing from [%s] for [%s]",
  (
    oidcIssuerDisplay,
    vcIssuerDisplay,
    vcSubjectDisplay,
    clientId,
    clientSecret
  ) => {
    const oidcIssuer = "https://" + oidcIssuerDisplay;
    const vcIssuer = "https://" + vcIssuerDisplay;
    const vcSubject = "https://" + vcSubjectDisplay;

    describe("issueVerifiableCredential", () => {
      it("has the appropriate environment variables", () => {
        expect(oidcIssuer).not.toBeUndefined();
        expect(clientId).not.toBeUndefined();
        expect(clientSecret).not.toBeUndefined();
        expect(vcIssuer).not.toBeUndefined();
        expect(vcSubject).not.toBeUndefined();
      });

      const session = new Session();

      beforeEach(async () => {
        await session.login({
          oidcIssuer,
          clientId,
          clientSecret,
        });
      });

      afterEach(async () => {
        // Making sure the session is logged out prevents tests from hanging due
        // to the callback refreshing the access token.
        await session.logout();
      });

      describe("issue a VC", () => {
        it("Successfully gets a VC from a valid issuer", async () => {
          const credential = await issueVerifiableCredential(
            vcIssuer,
            vcSubject,
            validCredentialClaims,
            undefined,
            {
              fetch: session.fetch,
            }
          );
          expect(credential.credentialSubject.id).toBe(vcSubject);
        });

        it("throws if the issuer returns an error", async () => {
          await expect(
            issueVerifiableCredential(
              vcIssuer,
              vcSubject,
              invalidCredentialClaims,
              undefined,
              {
                fetch: session.fetch,
              }
            )
          ).rejects.toThrow("400");
        });
      });

      // describe("lookup VCs", () => {
      //   it("returns all VC issued matching a given shape", async () => {

      //   })
      // });
    });
  }
);
