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

// Assertions are made conditionally on problem details responses because not all
// servers support this feature.

import {
  getAuthenticatedSession,
  getNodeTestingEnvironment,
} from "@inrupt/internal-test-env";
import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
} from "@jest/globals";
import {
  getCredentialSubject,
  getVerifiableCredentialApiConfiguration,
  getVerifiableCredential,
  issueVerifiableCredential,
  revokeVerifiableCredential,
  isValidVc,
  getId,
} from "../../src/index";

const validCredentialClaims = {
  "@context": [
    "https://www.w3.org/2018/credentials/v1",
    "https://schema.inrupt.com/credentials/v1.jsonld",
  ],
  type: ["SolidAccessRequest"],
  expirationDate: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
};
const validSubjectClaims = (options?: {
  resource?: string;
  purpose?: string;
}) => ({
  "@context": [
    "https://www.w3.org/2018/credentials/v1",
    "https://schema.inrupt.com/credentials/v1.jsonld",
  ],
  hasConsent: {
    mode: "Read",
    forPersonalData: options?.resource ?? "https://example.org/ns/someData",
    forPurpose: options?.purpose ?? "https://example.org/ns/somePurpose",
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
  let session: Awaited<ReturnType<typeof getAuthenticatedSession>>;
  let issuerService: string;
  let statusService: string;
  let verifierService: string;
  let revokedObject: {
    errors: string[];
  };

  beforeEach(() => {
    revokedObject = {
      errors: [
        "credentialStatus validation has failed: credential has been revoked",
      ],
    };
  });

  beforeAll(async () => {
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
      typeof vcConfiguration.statusService !== "string" ||
      typeof vcConfiguration.verifierService !== "string"
    ) {
      throw new Error("A service endpoint is undefined");
    }

    issuerService = vcConfiguration.issuerService;
    statusService = vcConfiguration.statusService;
    verifierService = vcConfiguration.verifierService;
  });

  afterAll(async () => {
    // Making sure the session is logged out prevents tests from hanging due
    // to the callback refreshing the access token.
    await session.logout();
  });

  describe("issue a VC", () => {
    it("Successfully gets a VC from a valid issuer", async () => {
      const [
        credential,
        credentialWithSubject,
        credentialWithSubjectNoLegacyJson,
        credentialNoProperties,
      ] = await Promise.all([
        issueVerifiableCredential(
          issuerService,
          validSubjectClaims(),
          validCredentialClaims,
          {
            fetch: session.fetch,
          },
        ),
        issueVerifiableCredential(
          issuerService,
          validSubjectClaims(),
          validCredentialClaims,
          {
            fetch: session.fetch,
          },
        ),
        issueVerifiableCredential(
          issuerService,
          validSubjectClaims(),
          validCredentialClaims,
          {
            fetch: session.fetch,
            returnLegacyJsonld: false,
          },
        ),
        issueVerifiableCredential(
          issuerService,
          validSubjectClaims(),
          validCredentialClaims,
          {
            fetch: session.fetch,
            returnLegacyJsonld: false,
          },
        ),
      ]);

      expect(credential.credentialSubject.id).toBe(vcSubject);
      expect(getCredentialSubject(credential).value).toBe(vcSubject);

      expect(credentialWithSubject.credentialSubject.id).toBe(vcSubject);
      expect(getCredentialSubject(credentialWithSubject).value).toBe(vcSubject);

      expect(
        // @ts-expect-error the credentialSubject property should not exist if legacy json is disabled
        credentialWithSubjectNoLegacyJson.credentialSubject,
      ).toBeUndefined();
      expect(
        getCredentialSubject(credentialWithSubjectNoLegacyJson).value,
      ).toBe(vcSubject);

      // @ts-expect-error the credentialSubject property should not exist if legacy json is disabled
      expect(credentialNoProperties.credentialSubject).toBeUndefined();
      expect(getCredentialSubject(credentialNoProperties).value).toBe(
        vcSubject,
      );

      await Promise.all(
        [
          credential.id,
          credentialWithSubject.id,
          credentialWithSubjectNoLegacyJson.id,
          credentialNoProperties.id,
        ].map((cred) =>
          revokeVerifiableCredential(statusService, cred, {
            fetch: session.fetch,
          }),
        ),
      );
    });

    it("successfully performs isValidVc checks", async () => {
      const purpose = `http://example.org/some/purpose/${Date.now()}`;
      const [credential1, credential2] = await Promise.all([
        issueVerifiableCredential(
          issuerService,
          validSubjectClaims({
            resource: "https://example.org/some-resource",
            purpose,
          }),
          validCredentialClaims,
          {
            fetch: session.fetch,
          },
        ),
        issueVerifiableCredential(
          issuerService,
          validSubjectClaims({
            resource: "https://example.org/another-resource",
            purpose,
          }),
          validCredentialClaims,
          {
            fetch: session.fetch,
            returnLegacyJsonld: false,
          },
        ),
      ]);

      const creds = [
        credential1,
        credential2,
        credential1.id,
        credential2.id,
        getId(credential1),
        getId(credential2),
      ];
      await Promise.all(
        creds.map((cred) =>
          expect(
            isValidVc(cred, {
              fetch: session.fetch,
              verificationEndpoint: verifierService,
            }),
          ).resolves.toMatchObject({ errors: [] }),
        ),
      );

      await Promise.all([
        revokeVerifiableCredential(statusService, credential1.id, {
          fetch: session.fetch,
        }),
        revokeVerifiableCredential(statusService, credential2.id, {
          fetch: session.fetch,
        }),
      ]);

      await Promise.all(
        creds.map((cred) =>
          expect(
            isValidVc(cred, {
              fetch: session.fetch,
              verificationEndpoint: verifierService,
            }),
          ).resolves.toMatchObject(revokedObject),
        ),
      );
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

      const expectedErrorShape: Record<string, string | object> = {
        name: "Error",
        message: `The VC issuing endpoint [${issuerService}] could not successfully issue a VC`,
      };

      if (env?.features?.PROBLEM_DETAILS === "true") {
        // Check that the Error contains Problem Details
        expectedErrorShape.problemDetails = expect.objectContaining({
          status: 400,
          title: "Bad Request",
          detail: expect.stringMatching(/.+/),
          instance: expect.not.stringMatching(""),
        });
      }

      await expect(vcPromise).rejects.toThrow(
        expect.objectContaining(expectedErrorShape),
      );
    });
  });

  describe("lookup VCs", () => {
    it("returns a valid VP for the VCs matching a given shape", async () => {
      const purpose = `http://example.org/some/purpose/${Date.now()}`;
      const [credential1, credential2] = await Promise.all([
        issueVerifiableCredential(
          issuerService,
          validSubjectClaims({
            resource: "https://example.org/some-resource",
            purpose,
          }),
          validCredentialClaims,
          {
            fetch: session.fetch,
          },
        ),
        issueVerifiableCredential(
          issuerService,
          validSubjectClaims({
            resource: "https://example.org/another-resource",
            purpose,
          }),
          validCredentialClaims,
          {
            fetch: session.fetch,
          },
        ),
      ]);

      expect(credential1.credentialSubject.id).toBe(vcSubject);
      expect(getCredentialSubject(credential1).value).toBe(vcSubject);
      expect(credential2.credentialSubject.id).toBe(vcSubject);
      expect(getCredentialSubject(credential2).value).toBe(vcSubject);
    }, 60_000);

    it("throws if error occurred retrieving a VC", async () => {
      const vcUrl = `${issuerService}/non-existing-vc`;
      const vcPromise = getVerifiableCredential(vcUrl, {
        fetch: session.fetch,
        returnLegacyJsonld: false,
      });

      const expectedErrorShape: Record<string, string | object> = {
        name: "Error",
        message: `Fetching the Verifiable Credential [${vcUrl}] failed`,
      };

      if (env?.features?.PROBLEM_DETAILS === "true") {
        // Check that the Error contains Problem Details
        expectedErrorShape.problemDetails = expect.objectContaining({
          status: 404,
          title: "Not Found",
          detail: expect.stringMatching(/.+/),
          instance: expect.not.stringMatching(""),
        });
      }

      await expect(vcPromise).rejects.toThrow(
        expect.objectContaining(expectedErrorShape),
      );
    });
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

    it("throws if error occurred revoking a VC", async () => {
      const vcUrl = `${issuerService}/non-existing-vc`;
      const vcPromise = revokeVerifiableCredential(statusService, vcUrl, {
        fetch: session.fetch,
      });

      const expectedErrorShape: Record<string, string | object> = {
        name: "Error",
        message: `The issuer [${statusService}] returned an error`,
      };

      if (env?.features?.PROBLEM_DETAILS === "true") {
        // Check that the Error contains Problem Details
        expectedErrorShape.problemDetails = expect.objectContaining({
          status: 404,
          title: "Not Found",
          detail: expect.stringMatching(/.+/),
          instance: expect.not.stringMatching(""),
        });
      }

      await expect(vcPromise).rejects.toThrow(
        expect.objectContaining(expectedErrorShape),
      );
    });
  });
});
