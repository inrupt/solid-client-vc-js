import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  jest,
} from "@jest/globals";
import {
  getVerifiableCredentialAllFromShape,
  issueVerifiableCredential,
  revokeVerifiableCredential,
} from "../../src/index";
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
type VcService = string;
type VcSubject = string;
type ClientId = string;
type ClientSecret = string;
type AuthDetails = [OidcIssuer, ClientId, ClientSecret, VcService, VcSubject];
// Instructions for obtaining these credentials can be found here:
// https://github.com/inrupt/solid-client-authn-js/blob/1a97ef79057941d8ac4dc328fff18333eaaeb5d1/packages/node/example/bootstrappedApp/README.md
const serversUnderTest: AuthDetails[] = [
  // pod.inrupt.com:
  [
    // Cumbersome workaround, but:
    // Trim `https://` from the start of these URLs,
    // so that GitHub Actions doesn't replace them with *** in the logs.
    process.env.E2E_TEST_ESS_IDP_URL!.replace(/^https:\/\//, ""),
    process.env.E2E_TEST_ESS_VC_SERVICE!.replace(/^https:\/\//, ""),
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
    process.env.E2E_TEST_DEV_NEXT_VC_SERVICE!.replace(/^https:\/\//, ""),
    process.env.E2E_TEST_DEV_NEXT_VC_SUBJECT!.replace(/^https:\/\//, ""),
    process.env.E2E_TEST_DEV_NEXT_CLIENT_ID!,
    process.env.E2E_TEST_DEV_NEXT_CLIENT_SECRET!,
  ],
];

describe.each(serversUnderTest)(
  "VC client end-to-end tests authenticated to [%s], issuing from [%s] for [%s]",
  (
    oidcIssuerDisplay,
    vcServiceDisplay,
    vcSubjectDisplay,
    clientId,
    clientSecret
  ) => {
    const oidcIssuer = new URL(`https://${oidcIssuerDisplay}`).href;
    const vcService = new URL(`https://${vcServiceDisplay}`).href;
    const vcSubject = new URL(`https://${vcSubjectDisplay}`).href;

    it("has the appropriate environment variables", () => {
      expect(oidcIssuer).not.toBeUndefined();
      expect(clientId).not.toBeUndefined();
      expect(clientSecret).not.toBeUndefined();
      expect(vcService).not.toBeUndefined();
      expect(vcSubject).not.toBeUndefined();
    });

    const session = new Session();
    // let vcConfiguration: Partial<{
    //   derivationService: string;
    //   issuerService: string;
    //   statusService: string;
    //   verifierService: string;
    // }>;

    beforeEach(async () => {
      await session.login({
        oidcIssuer,
        clientId,
        clientSecret,
      });
      // The following code snippet doesn't work in Jest, probably because of
      // https://github.com/standard-things/esm/issues/706 which seems to be
      // related to https://github.com/facebook/jest/issues/9430. The JSON-LD
      // module depends on @digitalbazaar/http-client, which uses esm, which
      // looks like it confuses Jest. Working around this by hard-coding the
      // endpoints IRIs.
      // vcConfiguration = await getVerifiableCredentialApiConfiguration(
      //   vcService
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
          `${vcService}/issue`,
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
            `${vcService}/issue`,
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

    describe("lookup VCs", () => {
      it("returns all VC issued matching a given shape", async () => {
        if (vcService === "https://consent.pod.inrupt.com/") {
          // This skips the test if the derive endpoint isn't available. It's not
          // mandatory, so the test shouldn't fail.
          return;
        }
        const result = await getVerifiableCredentialAllFromShape(
          `${vcService}/derive`,
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
        if (vcService === "https://consent.pod.inrupt.com/") {
          // This skips the test if the derive endpoint isn't available. It's not
          // mandatory, so the test shouldn't fail.
          return;
        }
        const result = await getVerifiableCredentialAllFromShape(
          `${vcService}/derive`,
          {},
          {
            fetch: session.fetch,
          }
        );
        await expect(
          revokeVerifiableCredential(`${vcService}/status`, result[0].id, {
            fetch: session.fetch,
          })
        ).resolves.not.toThrow();
        const verificationResponse = await session.fetch(
          `${vcService}/verify`,
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
  }
);
