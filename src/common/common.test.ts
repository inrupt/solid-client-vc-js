/**
 * Copyright 2021 Inrupt Inc.
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
import { VerifiableCredential } from "..";
import {
  concatenateContexts,
  isVerifiableCredential,
  isVerifiablePresentation,
} from "./common";
import {
  defaultCredentialClaims,
  mockPartialCredential,
  mockDefaultCredential,
  mockDefaultPresentation,
  mockPartialPresentation,
  defaultVerifiableClaims,
} from "./common.mock";

describe("isVerifiableCredential", () => {
  it("returns true if all the expected fields are present in the credential", () => {
    expect(isVerifiableCredential(mockDefaultCredential())).toBe(true);
  });

  describe("returns false if", () => {
    it.each([
      ["id"],
      ["type"],
      ["issuer"],
      ["issuanceDate"],
      ["subjectId"],
      ["proofType"],
      ["proofCreated"],
      ["proofVerificationMethod"],
      ["proofPurpose"],
      ["proofValue"],
    ])("is missing field %s", (entry) => {
      expect(
        isVerifiableCredential(
          mockPartialCredential({
            ...defaultCredentialClaims,
            [`${entry}`]: undefined,
          })
        )
      ).toBe(false);
    });

    it("misses a credential subject", () => {
      const mockedCredential = mockDefaultCredential();
      delete (mockedCredential as {
        credentialSubject: undefined | Record<string, unknown>;
      }).credentialSubject;
      expect(isVerifiableCredential(mockedCredential)).toBe(false);
    });

    it("misses a proof", () => {
      const mockedCredential = mockDefaultCredential();
      delete (mockedCredential as {
        proof: undefined | Record<string, unknown>;
      }).proof;
      expect(isVerifiableCredential(mockedCredential)).toBe(false);
    });

    it("has an unexpected date format for the issuance", () => {
      expect(
        isVerifiableCredential(
          mockPartialCredential({
            ...defaultCredentialClaims,
            issuanceDate: "Not a date",
          })
        )
      ).toBe(false);
    });

    it("has an unexpected date format for the proof creation", () => {
      expect(
        isVerifiableCredential(
          mockPartialCredential({
            ...defaultCredentialClaims,
            proofCreated: "Not a date",
          })
        )
      ).toBe(false);
    });
  });
});

describe("isVerifiablePresentation", () => {
  describe("returns true", () => {
    it("has all the expected fields are present in the credential", () => {
      expect(isVerifiablePresentation(mockDefaultPresentation())).toBe(true);
    });

    it("has no associated credentials", () => {
      expect(isVerifiablePresentation(mockDefaultPresentation([]))).toBe(true);
    });

    it("has an URL shaped holder", () => {
      const mockedPresentation = mockDefaultPresentation();
      mockedPresentation.holder = "https://some.holder";
      expect(isVerifiablePresentation(mockedPresentation)).toBe(true);
    });

    it("is passed a correct VP with a single type", () => {
      const vp = JSON.parse(`{
        "@context": [
            "https://www.w3.org/2018/credentials/v1"
        ],
        "holder": "https://vc.dev-next.inrupt.com",
        "type": "VerifiablePresentation",
        "verifiableCredential": [
            {
                "@context": [
                    "https://www.w3.org/2018/credentials/v1",
                    "https://w3id.org/security/suites/ed25519-2020/v1",
                    "https://w3id.org/vc-revocation-list-2020/v1",
                    "https://consent.pod.inrupt.com/credentials/v1"
                ],
                "credentialStatus": {
                    "id": "https://vc.dev-next.inrupt.com/status/niiL#0",
                    "revocationListCredential": "https://vc.dev-next.inrupt.com/status/niiL",
                    "revocationListIndex": "0",
                    "type": "RevocationList2020Status"
                },
                "credentialSubject": {
                    "providedConsent": {
                        "mode": [
                            "http://www.w3.org/ns/auth/acl#Read"
                        ],
                        "hasStatus": "https://w3id.org/GConsent#ConsentStatusExplicitlyGiven",
                        "forPersonalData": [
                            "https://storage.dev-next.inrupt.com/8c6a313e-98ae-4eb2-9ab3-2df201d81a02/bookmarks/"
                        ],
                        "forPurpose": "https://example.org/someSpecificPurpose",
                        "isProvidedTo": "https://pod.inrupt.com/womenofsolid/profile/card#me"
                    },
                    "id": "https://id.dev-next.inrupt.com/virginia",
                    "inbox": "https://pod.inrupt.com/womenofsolid/inbox/"
                },
                "id": "https://vc.dev-next.inrupt.com/vc/9f0855b1-7494-4770-8c49-c3fe91d82f93",
                "issuanceDate": "2021-10-20T07:29:20.062Z",
                "issuer": "https://vc.dev-next.inrupt.com",
                "proof": {
                    "created": "2021-10-20T07:31:08.898Z",
                    "domain": "solid",
                    "proofPurpose": "assertionMethod",
                    "proofValue": "Q4-x1J0RqnIYBsW-O4IPskIeN_SOyUqtO8nZQdHlvz-PTwAe-L5lv2QhQHdUZpel1pEfdnll1rRD0vBdJ_svBg",
                    "type": "Ed25519Signature2020",
                    "verificationMethod": "https://vc.dev-next.inrupt.com/key/3eb16a3d-d31e-4f6e-b1ca-581257c69412"
                },
                "type": [
                    "VerifiableCredential",
                    "SolidAccessGrant"
                ]
            }
        ]
    }`);
      expect(isVerifiablePresentation(vp)).toBe(true);
    });
  });

  describe("returns false if", () => {
    it.each([["type"]])("is missing field %s", (entry) => {
      expect(
        isVerifiablePresentation(
          mockPartialPresentation([], {
            ...defaultVerifiableClaims,
            [`${entry}`]: undefined,
          })
        )
      ).toBe(false);
    });

    it("has a malformed credential", () => {
      const mockedPresentation = mockDefaultPresentation([
        {} as VerifiableCredential,
      ]);
      expect(isVerifiablePresentation(mockedPresentation)).toBe(false);
    });

    it("has a non-URL shaped holder", () => {
      const mockedPresentation = mockDefaultPresentation();
      mockedPresentation.holder = "some non-URL holder";
      expect(isVerifiablePresentation(mockedPresentation)).toBe(false);
    });
  });
});

describe("concatenateContexts", () => {
  it("concatenates string-like contexts", () => {
    expect(
      concatenateContexts("https://some.context", "https://some.other.context")
    ).toEqual(["https://some.context", "https://some.other.context"]);
  });

  it("concatenates array-like contexts", () => {
    expect(
      concatenateContexts(
        ["https://some.context"],
        ["https://some.other.context"]
      )
    ).toEqual(["https://some.context", "https://some.other.context"]);
  });

  it("concatenates mixed contexts", () => {
    expect(
      concatenateContexts(
        ["https://some.context"],
        "https://some.other.context"
      )
    ).toEqual(["https://some.context", "https://some.other.context"]);
  });

  it("prevents a value to be added twice", () => {
    expect(
      concatenateContexts("https://some.context", "https://some.context")
    ).toEqual(["https://some.context"]);
  });

  it("prevents undefined values to be added", () => {
    expect(concatenateContexts("https://some.context", undefined)).toEqual([
      "https://some.context",
    ]);
  });
});
