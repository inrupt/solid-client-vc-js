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

// FIXME: Remove when refactoring to test matrix
/* eslint-disable @typescript-eslint/no-non-null-assertion */

import { describe, it, expect, beforeEach, afterEach } from "@jest/globals";
import { Session } from "@inrupt/solid-client-authn-node";
import { setupEnv, getNodeTestingEnvironment } from "@inrupt/internal-test-env";
import {
  getVerifiableCredentialAllFromShape,
  issueVerifiableCredential,
  revokeVerifiableCredential,
} from "../../src/index";

// Load environment variables from .env.local if available:
setupEnv();

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
    isConsentForDataSubject: {
      "@id": "gc:isConsentForDataSubject",
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
    isConsentForDataSubject: "https://some.webid/resource-owner",
  },
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
};

const {
  environment,
  idp: oidcIssuer,
  vcProvider,
  clientCredentials,
} = getNodeTestingEnvironment({
  vcProvider: "",
  clientCredentials: {
    owner: { id: "", secret: "" },
  },
});

describe(`End-to-end verifiable credentials tests for environment:[${environment}}]`, () => {
  const clientId = clientCredentials.owner.id;
  const clientSecret = clientCredentials.owner.secret;
  let vcSubject: string;
  const session = new Session();
  beforeEach(async () => {
    await session.login({
      oidcIssuer,
      clientId,
      clientSecret,
    });

    vcSubject = session.info.webId || "";

    // The following code snippet doesn't work in Jest, probably because of
    // https://github.com/standard-things/esm/issues/706 which seems to be
    // related to https://github.com/facebook/jest/issues/9430. The JSON-LD
    // module depends on @digitalbazaar/http-client, which uses esm, which
    // looks like it confuses Jest. Working around this by hard-coding the
    // endpoints IRIs.
    // vcConfiguration = await getVerifiableCredentialApiConfiguration(
    //   vcProvider
    // );
  });

  afterEach(async () => {
    // Making sure the session is logged out prevents tests from hanging due
    // to the callback refreshing the access token.
    await session.logout();
  });

  describe("issue a VC", () => {
    it("Successfully gets a VC from a valid issuer", async () => {
      const credential = await issueVerifiableCredential(
        new URL("issue", vcProvider).href,
        validCredentialClaims,
        undefined,
        {
          fetch: session.fetch,
        }
      );
      expect(credential.credentialSubject.id).toBe(vcSubject);
    });

    // FIXME: based on configuration, the server may have one of two behaviors
    // when receiving a VC not matching any preconfigured shape. It may respond
    // with 400 bad request, but may also respond with a VC not having the type
    // associated to the preconfigured shape.
    it("throws if the issuer returns an error", async () => {
      const vcPromise = issueVerifiableCredential(
        new URL("issue", vcProvider).href,
        invalidCredentialClaims,
        undefined,
        {
          fetch: session.fetch,
        }
      );
      try {
        const vc = await vcPromise;
        expect(vc.type).not.toContain("SolidAccessGrant");
        // There are two default type values, there should not be more.
        expect(vc.type).toHaveLength(2);
      } catch (error) {
        // If the promise rejects, it means the
        // server responded with an error.
        // eslint-disable-next-line jest/no-conditional-expect
        expect((error as Error).toString()).toMatch("400");
      }
    });
  });

  describe("lookup VCs", () => {
    it("returns all VC issued matching a given shape", async () => {
      const result = await getVerifiableCredentialAllFromShape(
        new URL("derive", vcProvider).href,
        {
          credentialSubject: {
            id: vcSubject,
          },
        },
        {
          fetch: session.fetch,
        }
      );
      expect(result).not.toHaveLength(0);
    });
  });

  describe("revoke VCs", () => {
    it("can revoke a VC", async () => {
      const result = await getVerifiableCredentialAllFromShape(
        new URL("derive", vcProvider).href,
        {},
        {
          fetch: session.fetch,
        }
      );
      await expect(
        revokeVerifiableCredential(
          new URL("status", vcProvider).href,
          result[0].id,
          {
            fetch: session.fetch,
          }
        )
      ).resolves.not.toThrow();
      const verificationResponse = await session.fetch(
        new URL("verify", vcProvider).href,
        {
          method: "POST",
          body: JSON.stringify({ verifiableCredential: result[0] }),
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
      const verification = await verificationResponse.json();
      expect(verification.errors).toEqual([
        "credentialStatus validation has failed: credential has been revoked",
      ]);
    });
  });
});
