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

import type {
  Iri,
  VerifiableCredentialBase,
  VerifiablePresentation,
} from "./common";
import { defaultCredentialTypes } from "./common";

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
  "@context": [
    "https://www.w3.org/2018/credentials/v1",
    "https://schema.inrupt.com/credentials/v1.jsonld",
  ],
  id: "https://example.org/ns/someCredentialInstance",
  type: [
    ...defaultCredentialTypes,
    "https://example.org/ns/spaceDogCertificate",
  ],
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
    "https://example.org/ns/status": "https://example.org/ns/GoodDog",
    "https://example.org/ns/passengerOf":
      "https://example.org/ns/Korabl-Sputnik2",
  },
};

export const mockPartialCredential = (
  claims?: Partial<CredentialClaims>,
  id?: string,
): Record<string, unknown> => {
  return {
    "@context": claims?.["@context"],
    id: id ?? claims?.id,
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

export const mockPartialCredential2Proofs = (
  claims?: Partial<CredentialClaims>,
  id?: string,
): Record<string, unknown> => {
  return {
    ...mockPartialCredential(claims, id),
    proof: [
      mockPartialCredential(claims, id).proof,
      mockPartialCredential(claims, id).proof,
    ],
  };
};

export const mockCredential = (
  claims: CredentialClaims,
): VerifiableCredentialBase => {
  return mockPartialCredential(claims) as VerifiableCredentialBase;
};

export const mockDefaultCredential = (
  id?: string,
): VerifiableCredentialBase => {
  return mockPartialCredential(
    defaultCredentialClaims,
    id,
  ) as VerifiableCredentialBase;
};

export const mockDefaultCredential2Proofs = (
  id?: string,
): VerifiableCredentialBase => {
  return mockPartialCredential2Proofs(
    defaultCredentialClaims,
    id,
  ) as VerifiableCredentialBase;
};

export const mockPartialPresentation = (
  credentials?: VerifiableCredentialBase[],
  claims?: Partial<VerifiableClaims>,
): Record<string, unknown> => {
  return {
    "@context": [
      "https://www.w3.org/2018/credentials/v1",
      "https://schema.inrupt.com/credentials/v1.jsonld",
    ],
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
  vc: VerifiableCredentialBase[] = [mockDefaultCredential()],
): VerifiablePresentation => {
  return mockPartialPresentation(
    vc,
    defaultVerifiableClaims,
  ) as VerifiablePresentation;
};

export const mockAnonymousDefaultPresentation = (
  vc: VerifiableCredentialBase[] = [mockDefaultCredential()],
): VerifiablePresentation => {
  return mockPartialPresentation(vc, {
    ...defaultVerifiableClaims,
    id: undefined,
  }) as VerifiablePresentation;
};

export const mockAccessGrant = () => ({
  "@context": ["https://www.w3.org/2018/credentials/v1"],
  type: "VerifiablePresentation",
  holder: "https://vc.inrupt.com",
  verifiableCredential: [
    {
      id: "https://example.org/ns/someCredentialInstance",
      type: ["SolidAccessRequest", "VerifiableCredential"],
      proof: {
        type: "Ed25519Signature2020",
        created: "2023-12-05T00:11:29.159Z",
        domain: "solid",
        proofPurpose: "assertionMethod",
        proofValue: "z4pPdpe9iQyFm2opvCJeoiW61Kajx8LqZQUFYLd",
        verificationMethod: "https://example.org/verificationMethod/keys/1",
      },
      credentialStatus: {
        id: "https://vc.inrupt.com/status/At3i#0",
        type: "RevocationList2020Status",
        revocationListCredential: "https://vc.inrupt.com/status/At3i",
        revocationListIndex: "0",
      },
      credentialSubject: {
        id: "https://some.webid.provider/strelka",
        hasConsent: {
          mode: "Read",
          forPersonalData: "https://example.org/another-resource",
          forPurpose: "http://example.org/some/purpose/1701735088943",
          hasStatus: "ConsentStatusRequested",
          isConsentForDataSubject: "https://some.webid/resource-owner",
        },
      },
      issuanceDate: "1960-08-19T16:08:31Z",
      issuer: "https://some.vc.issuer/in-ussr",
      "@context": [
        "https://www.w3.org/2018/credentials/v1",
        "https://schema.inrupt.com/credentials/v1.jsonld",
        "https://w3id.org/security/data-integrity/v1",
        "https://w3id.org/vc-revocation-list-2020/v1",
        "https://w3id.org/vc/status-list/2021/v1",
        "https://w3id.org/security/suites/ed25519-2020/v1",
      ],
    },
  ],
});
