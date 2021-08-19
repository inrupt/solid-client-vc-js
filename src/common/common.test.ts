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
import { Iri, isVerifiableCredential, VerifiableCredential } from "./common";

type CredentialClaims = {
  id: Iri;
  type: Iri[];
  issuer: Iri;
  issuanceDate: string;
  subjectId: Iri;
  subjectClaims: Record<string, string>;
  proofType: string;
  proofCreated: string;
  proofVerificationMethod: string;
  proofPurpose: string;
  proofValue: string;
};

const defaultCredentialClaims: CredentialClaims = {
  id: "https://example.org/ns/someCredentialInstance",
  type: ["https://example.org/ns/spaceDogCertificate"],
  issuer: "https://some.vc.issuer/in-ussr",
  issuanceDate: "1960-08-19T16:08:31Z",
  subjectId: "https://some.webid.provider/strelka",
  subjectClaims: {
    "https://example.org/ns/status": "https://example.org/ns/GoodDog",
    "https://example.org/ns/passengerOf":
      "https://example.org/ns/Korabl-Sputnik2",
  },
  proofType: "Ed25519Signature2018",
  proofCreated: "2021-08-19T16:08:31Z",
  proofVerificationMethod:
    "did:example:123#z6MksHh7qHWvybLg5QTPPdG2DgEjjduBDArV9EF9mRiRzMBN",
  proofPurpose: "assertionMethod",
  proofValue:
    "eyJhbGciOiJFZERTQSIsImI2NCI6ZmFsc2UsImNyaXQiOlsiYjY0Il19..YtqjEYnFENT7fNW-COD0HAACxeuQxPKAmp4nIl8jYAu__6IH2FpSxv81w-l5PvE1og50tS9tH8WyXMlXyo45CA",
};

const mockCredential = (claims?: Partial<CredentialClaims>) => {
  return {
    id: claims?.id,
    type: claims?.type,
    issuer: claims?.issuer,
    issuanceDate: claims?.issuanceDate,
    credentialSubject: {
      id: claims?.subjectId,
      ...claims?.subjectClaims,
    },
    proof: {
      type: claims?.proofType,
      created: claims?.proofCreated,
      verificationMethod: claims?.proofVerificationMethod,
      proofPurpose: claims?.proofPurpose,
      proofValue: claims?.proofValue,
    },
  };
};

const mockDefaultCredential = (): VerifiableCredential => {
  return mockCredential(defaultCredentialClaims) as VerifiableCredential;
};

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
          mockCredential({
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
          mockCredential({
            ...defaultCredentialClaims,
            issuanceDate: "Not a date",
          })
        )
      ).toBe(false);
    });

    it("has an unexpected date format for the proof creation", () => {
      expect(
        isVerifiableCredential(
          mockCredential({
            ...defaultCredentialClaims,
            proofCreated: "Not a date",
          })
        )
      ).toBe(false);
    });
  });
});
