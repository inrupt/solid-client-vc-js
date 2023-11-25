//
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

// FIXME: Remove when refactoring to test matrix
/* eslint-disable @typescript-eslint/no-non-null-assertion */

import {
  getAuthenticatedSession,
  getNodeTestingEnvironment,
} from "@inrupt/internal-test-env";
import type { Session } from "@inrupt/solid-client-authn-node";
import { afterEach, beforeEach, describe, expect, it } from "@jest/globals";
import {
  getVerifiableCredentialAllFromShape,
  getVerifiableCredentialApiConfiguration,
  issueVerifiableCredential,
  revokeVerifiableCredential,
} from "../../src/index";

const validCredentialClaims = {
  "@context": [
    "https://www.w3.org/2018/credentials/v1",
    "https://schema.inrupt.com/credentials/v1.jsonld",
  ],
  type: ["SolidAccessRequest"],
};
const validSubjectClaims = (options?: { resource?: string }) => ({
  "@context": [
    "https://www.w3.org/2018/credentials/v1",
    "https://schema.inrupt.com/credentials/v1.jsonld",
  ],
  hasConsent: {
    mode: "Read",
    forPersonalData: options?.resource ?? "https://example.org/ns/someData",
    forPurpose: "https://example.org/ns/somePurpose",
    hasStatus: "ConsentStatusRequested",
    isConsentForDataSubject: "https://some.webid/resource-owner",
  },
});

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

const env = getNodeTestingEnvironment({
  vcProvider: true,
  clientCredentials: {
    owner: { id: true, secret: true },
  },
});
describe("End-to-end verifiable credentials tests for environment", () => {
  let vcSubject: string;
  let session: Session;
  let issuerService: string;
  let derivationService: string;
  let statusService: string;
  let verifierService: string;

  beforeEach(async () => {
    session = await getAuthenticatedSession(env);

    if (!session.info.webId) {
      throw new Error("Client session missing critical data: webId");
    } else {
      vcSubject = session.info.webId;
    }

    if (typeof env.vcProvider !== "string") {
      throw new Error("vcProvider not available in context");
    }

    const vcConfiguration = await getVerifiableCredentialApiConfiguration(
      env.vcProvider.toString(),
    );

    if (
      typeof vcConfiguration.issuerService !== "string" ||
      typeof vcConfiguration.derivationService !== "string" ||
      typeof vcConfiguration.statusService !== "string" ||
      typeof vcConfiguration.verifierService !== "string"
    ) {
      throw new Error("A service endpoint is undefined");
    }

    issuerService = vcConfiguration.issuerService;
    derivationService = vcConfiguration.derivationService;
    statusService = vcConfiguration.statusService;
    verifierService = vcConfiguration.verifierService;
  });

  afterEach(async () => {
    // Making sure the session is logged out prevents tests from hanging due
    // to the callback refreshing the access token.
    await session.logout();
  });

  describe("issue a VC", () => {
    it("Successfully gets a VC from a valid issuer", async () => {
      const credential = await issueVerifiableCredential(
        issuerService,
        validSubjectClaims(),
        validCredentialClaims,
        {
          fetch: session.fetch,
        },
      );
      expect(credential.credentialSubject.id).toBe(vcSubject);
      await revokeVerifiableCredential(statusService, credential.id, {
        fetch: session.fetch,
      });
    });

    // FIXME: based on configuration, the server may have one of two behaviors
    // when receiving a VC not matching any preconfigured shape. It may respond
    // with 400 bad request, but may also respond with a VC not having the type
    // associated to the preconfigured shape.
    it("throws if the issuer returns an error", async () => {
      const vcPromise = issueVerifiableCredential(
        issuerService,
        invalidCredentialClaims,
        undefined,
        {
          fetch: session.fetch,
        },
      );
      await expect(vcPromise).rejects.toThrow(/400/);
    });
  });

  describe("lookup VCs", () => {
    it("returns all VC issued matching a given shape", async () => {
      const [credential1, credential2] = await Promise.all([
        issueVerifiableCredential(
          issuerService,
          validSubjectClaims({ resource: "https://example.org/some-resource" }),
          validCredentialClaims,
          {
            fetch: session.fetch,
          },
        ),
        issueVerifiableCredential(
          issuerService,
          validSubjectClaims({
            resource: "https://example.org/another-resource",
          }),
          validCredentialClaims,
          {
            fetch: session.fetch,
          },
        ),
      ]);

      await expect(
        getVerifiableCredentialAllFromShape(
          derivationService,
          {
            "@context": [
              "https://www.w3.org/2018/credentials/v1",
              "https://schema.inrupt.com/credentials/v1.jsonld",
            ],
            type: ["VerifiableCredential"],
          },
          {
            fetch: session.fetch,
          },
        ),
      ).resolves.not.toHaveLength(0);

      await expect(
        getVerifiableCredentialAllFromShape(derivationService, credential1, {
          fetch: session.fetch,
        }),
      ).resolves.toHaveLength(1);

      await expect(
        getVerifiableCredentialAllFromShape(derivationService, credential2, {
          fetch: session.fetch,
        }),
      ).resolves.toHaveLength(1);

      await Promise.all([
        revokeVerifiableCredential(statusService, credential1.id, {
          fetch: session.fetch,
        }),
        revokeVerifiableCredential(statusService, credential2.id, {
          fetch: session.fetch,
        }),
      ]);
    }, 60_000);
  });

  describe("revoke VCs", () => {
    it("can revoke a VC", async () => {
      const credential = await issueVerifiableCredential(
        issuerService,
        validSubjectClaims(),
        validCredentialClaims,
        {
          fetch: session.fetch,
        },
      );
      await expect(
        revokeVerifiableCredential(statusService, credential.id, {
          fetch: session.fetch,
        }),
      ).resolves.not.toThrow();
      const verificationResponse = await session.fetch(verifierService, {
        method: "POST",
        body: JSON.stringify({ verifiableCredential: credential }),
        headers: {
          "Content-Type": "application/json",
        },
      });
      const verification = await verificationResponse.json();
      expect(verification.errors).toEqual([
        "credentialStatus validation has failed: credential has been revoked",
      ]);
    });
  });
});
