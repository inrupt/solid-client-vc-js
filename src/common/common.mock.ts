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

import {
  defaultCredentialTypes,
  Iri,
  VerifiableCredential,
  VerifiablePresentation,
} from "./common";

export type VerifiableClaims = {
  "@context": unknown;
  id: Iri;
  type: Iri[];
  proofType: string;
  proofCreated: string;
  proofVerificationMethod: string;
  proofPurpose: string;
  proofValue: string;
};

export type CredentialClaims = VerifiableClaims & {
  issuer: Iri;
  issuanceDate: string;
  subjectId: Iri;
  subjectClaims: Record<string, string>;
};

export const defaultVerifiableClaims: VerifiableClaims = {
  "@context": { ex: "https://example.org/ns/" },
  id: "ex:someCredentialInstance",
  type: [...defaultCredentialTypes, "ex:spaceDogCertificate"],
  proofType: "Ed25519Signature2018",
  proofCreated: "2021-08-19T16:08:31Z",
  proofVerificationMethod:
    "did:example:123#z6MksHh7qHWvybLg5QTPPdG2DgEjjduBDArV9EF9mRiRzMBN",
  proofPurpose: "assertionMethod",
  proofValue:
    "eyJhbGciOiJFZERTQSIsImI2NCI6ZmFsc2UsImNyaXQiOlsiYjY0Il19..YtqjEYnFENT7fNW-COD0HAACxeuQxPKAmp4nIl8jYAu__6IH2FpSxv81w-l5PvE1og50tS9tH8WyXMlXyo45CA",
};

export const defaultCredentialClaims: CredentialClaims = {
  ...defaultVerifiableClaims,
  issuer: "https://some.vc.issuer/in-ussr",
  issuanceDate: "1960-08-19T16:08:31Z",
  subjectId: "https://some.webid.provider/strelka",
  subjectClaims: {
    "ex:status": "https://example.org/ns/GoodDog",
    "ex:passengerOf": "https://example.org/ns/Korabl-Sputnik2",
  },
};

export const mockPartialCredential = (
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

export const mockCredential = (
  claims: CredentialClaims
): VerifiableCredential => {
  return mockPartialCredential(claims) as VerifiableCredential;
};

export const mockDefaultCredential = (): VerifiableCredential => {
  return {
    "@context": 'https://www.w3.org/2018/credentials/v1',
    ...mockPartialCredential(defaultCredentialClaims) 
  } as VerifiableCredential;
};

export const mockPartialPresentation = (
  credentials: VerifiableCredential[],
  claims?: Partial<VerifiableClaims>
): Record<string, unknown> => {
  return {
    id: claims?.id,
    type: claims?.type,
    verifiableCredential: credentials,
    proof: {
      type: claims?.proofType,
      created: claims?.proofCreated,
      verificationMethod: claims?.proofVerificationMethod,
      proofPurpose: claims?.proofPurpose,
      proofValue: claims?.proofValue,
    },
  };
};

export const mockDefaultPresentation = (
  vc: VerifiableCredential[] = [mockDefaultCredential()]
): VerifiablePresentation => {
  return mockPartialPresentation(
    vc,
    defaultVerifiableClaims
  ) as VerifiablePresentation;
};
