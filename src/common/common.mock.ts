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

import { Iri, VerifiableCredential } from "./common";

export type CredentialClaims = {
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

export const defaultCredentialClaims: CredentialClaims = {
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

export const mockCredential = (
  claims?: Partial<CredentialClaims>
): Record<string, unknown> => {
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

export const mockDefaultCredential = (): VerifiableCredential => {
  return mockCredential(defaultCredentialClaims) as VerifiableCredential;
};
