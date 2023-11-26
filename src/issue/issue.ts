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

/**
 * @module issue
 */

import { fetch as fallbackFetch } from "@inrupt/universal-fetch";

import type { Iri, JsonLd, VerifiableCredential } from "../common/common";
import {
  concatenateContexts,
  defaultContext,
  defaultCredentialTypes,
  // eslint-disable-next-line camelcase
  internal_getVerifiableCredentialFromResponse,
} from "../common/common";
import type { ParseOptions } from "../parser/jsonld";
import type { DatasetWithId } from "../common/getters";

type OptionsType = {
  fetch?: typeof fallbackFetch;
  returnLegacyJsonld?: boolean;
};

// The following extracts the logic of issueVerifiableCredential to separate it
// from the deprecation logic. It can be merged back in issueVerifiableCredential
// when the deprecated signature is removed altogether.
// eslint-disable-next-line camelcase
async function internal_issueVerifiableCredential(
  issuerEndpoint: Iri,
  subjectClaims: JsonLd,
  credentialClaims?: JsonLd,
  options?: {
    fetch?: typeof fallbackFetch;
    returnLegacyJsonld?: true;
  } & ParseOptions,
): Promise<VerifiableCredential>;
async function internal_issueVerifiableCredential(
  issuerEndpoint: Iri,
  subjectClaims: JsonLd,
  credentialClaims?: JsonLd,
  options?: {
    fetch?: typeof fallbackFetch;
    returnLegacyJsonld?: boolean;
  } & ParseOptions,
): Promise<DatasetWithId>;
async function internal_issueVerifiableCredential(
  issuerEndpoint: Iri,
  subjectClaims: JsonLd,
  credentialClaims?: JsonLd,
  options?: {
    fetch?: typeof fallbackFetch;
    returnLegacyJsonld?: boolean;
  } & ParseOptions,
): Promise<DatasetWithId> {
  const internalOptions = { ...options };
  if (internalOptions.fetch === undefined) {
    internalOptions.fetch = fallbackFetch;
  }

  // credentialClaims should contain all the claims, but not the context.
  const { "@context": subjectClaimsContext, ...contextlessSubjectClaims } =
    subjectClaims;

  // When we add proper JSONLD parsing support, the following should be replaced.
  const {
    "@context": credentialClaimsContext,
    ...contextlessCredentialClaims
  } = credentialClaims !== undefined ? credentialClaims : { "@context": [] };

  const { type: credentialTypeClaims, ...nonTypeCredentialClaims } =
    contextlessCredentialClaims;

  let credentialTypes = [];
  if (credentialTypeClaims !== undefined) {
    credentialTypes = Array.isArray(credentialTypeClaims)
      ? credentialTypeClaims
      : [credentialTypeClaims];
  }
  const credentialIssueBody = {
    // See https://w3c-ccg.github.io/vc-api/issuer.html
    credential: {
      "@context": concatenateContexts(
        defaultContext,
        subjectClaimsContext,
        credentialClaimsContext,
      ),
      type: [...defaultCredentialTypes, ...credentialTypes],
      ...nonTypeCredentialClaims,
      credentialSubject: contextlessSubjectClaims,
    },
  };
  const response = await (internalOptions.fetch as typeof fetch)(
    issuerEndpoint,
    {
      headers: {
        "Content-Type": "application/json",
      },
      method: "POST",
      body: JSON.stringify(credentialIssueBody),
    },
  );
  if (!response.ok) {
    // TODO: use the error library when available.
    throw new Error(
      `The VC issuing endpoint [${issuerEndpoint}] could not successfully issue a VC: ${response.status} ${response.statusText}`,
    );
  }

  return internal_getVerifiableCredentialFromResponse(
    undefined,
    response,
    options,
  );
}

/**
 * Request that a given Verifiable Credential (VC) Issuer issues a VC containing
 * the provided claims. The VC Issuer is expected to implement the [W3C VC Issuer HTTP API](https://w3c-ccg.github.io/vc-api/issuer.html).
 *
 * @param issuerEndpoint The `/issue` endpoint of the VC Issuer.
 * @param subjectId The identifier of the VC claims' subject.
 * @param subjectClaims Claims about the subject that will be attested by the VC.
 * @param credentialClaims Claims about the credential itself, rather than its subject, e.g. credential type or expiration.
 * @param options
 * - options.fetch: An alternative `fetch` function to make the HTTP request, compatible with the browser-native [fetch API](https://developer.mozilla.org/docs/Web/API/WindowOrWorkerGlobalScope/fetch#parameters).
 * This can be typically used for authentication. Note that if it is omitted, and
 * `@inrupt/solid-client-authn-browser` is in your dependencies, the default session
 * is picked up.
 * - options.returnLegacyJsonld: Include the normalized JSON-LD in the response
 * @returns the VC returned by the Issuer if the request is successful. Otherwise, an error is thrown.
 * @since 0.1.0
 * @deprecated Deprecated in favour of setting returnLegacyJsonld: false. This will be the default value in future
 * versions of this library.
 */
export async function issueVerifiableCredential(
  issuerEndpoint: Iri,
  subjectClaims: JsonLd,
  credentialClaims?: JsonLd,
  options?: {
    fetch?: typeof fallbackFetch;
    returnLegacyJsonld?: true;
  },
): Promise<VerifiableCredential>;
/**
 * Request that a given Verifiable Credential (VC) Issuer issues a VC containing
 * the provided claims. The VC Issuer is expected to implement the [W3C VC Issuer HTTP API](https://w3c-ccg.github.io/vc-api/issuer.html).
 *
 * @param issuerEndpoint The `/issue` endpoint of the VC Issuer.
 * @param subjectId The identifier of the VC claims' subject.
 * @param subjectClaims Claims about the subject that will be attested by the VC.
 * @param credentialClaims Claims about the credential itself, rather than its subject, e.g. credential type or expiration.
 * @param options
 * - options.fetch: An alternative `fetch` function to make the HTTP request, compatible with the browser-native [fetch API](https://developer.mozilla.org/docs/Web/API/WindowOrWorkerGlobalScope/fetch#parameters).
 * This can be typically used for authentication. Note that if it is omitted, and
 * `@inrupt/solid-client-authn-browser` is in your dependencies, the default session
 * is picked up.
 * - options.returnLegacyJsonld: Include the normalized JSON-LD in the response
 * @returns the VC returned by the Issuer if the request is successful. Otherwise, an error is thrown.
 * @since 0.1.0
 */
export async function issueVerifiableCredential(
  issuerEndpoint: Iri,
  subjectClaims: JsonLd,
  credentialClaims?: JsonLd,
  options?: {
    fetch?: typeof fallbackFetch;
    returnLegacyJsonld?: boolean;
  },
): Promise<DatasetWithId>;
/**
 * @deprecated Please remove the `subjectId` parameter
 */
export async function issueVerifiableCredential(
  issuerEndpoint: Iri,
  subjectId: Iri,
  subjectClaims: JsonLd,
  credentialClaims?: JsonLd,
  options?: {
    fetch?: typeof fallbackFetch;
    returnLegacyJsonld?: true;
  },
): Promise<VerifiableCredential>;
/**
 * @deprecated Please remove the `subjectId` parameter
 */
export async function issueVerifiableCredential(
  issuerEndpoint: Iri,
  subjectId: Iri,
  subjectClaims: JsonLd,
  credentialClaims?: JsonLd,
  options?: OptionsType,
): Promise<DatasetWithId>;
// The signature of the implementation here is a bit confusing, but it avoid
// breaking changes until we remove the `subjectId` completely from the API
export async function issueVerifiableCredential(
  issuerEndpoint: Iri,
  subjectIdOrClaims: Iri | JsonLd,
  subjectOrCredentialClaims: JsonLd | undefined,
  credentialClaimsOrOptions?: JsonLd | OptionsType,
  options?: OptionsType,
): Promise<DatasetWithId> {
  if (typeof subjectIdOrClaims === "string") {
    // The function has been called with the deprecated signature, and the
    // subjectOrCredentialClaims parameter should be ignored.
    return internal_issueVerifiableCredential(
      issuerEndpoint,
      subjectOrCredentialClaims as JsonLd,
      credentialClaimsOrOptions as JsonLd,
      options,
    );
  }
  return internal_issueVerifiableCredential(
    issuerEndpoint,
    subjectIdOrClaims,
    subjectOrCredentialClaims,
    credentialClaimsOrOptions as OptionsType,
  );
}

export default issueVerifiableCredential;
