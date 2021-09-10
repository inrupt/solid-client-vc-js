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

import fallbackFetch from "../fetcher";

import {
  isVerifiableCredential,
  Iri,
  JsonLd,
  VerifiableCredential,
  concatenateContexts,
  defaultContext,
  defaultCredentialTypes,
} from "../common/common";

/**
 * Request that a given Verifiable Credential (VC) Issuer issues a VC containing
 * the provided claims. The VC Issuer is expected to implement the [W3C VC Issuer HTTP API](https://w3c-ccg.github.io/vc-http-api/issuer.html).
 *
 * @param issuerEndpoint The `/issue` endpoint of the VC Issuer.
 * @param subjectId The identifier of the VC claims' subject.
 * @param subjectClaims Claims about the subject that will be attested by the VC.
 * @param credentialClaims Claims about the credential itself, rather than its subject, e.g. credential type or expiration.
 * @param options Optional parameter `options.fetch`: An alternative `fetch` function to make the HTTP request, compatible with the browser-native [fetch API](https://developer.mozilla.org/docs/Web/API/WindowOrWorkerGlobalScope/fetch#parameters).
 * This can be typically used for authentication. Note that if it is omitted, and
 * `@inrupt/solid-client-authn-browser` is in your dependencies, the default session
 * is picked up.
 * @returns the VC returned by the Issuer if the request is successful. Otherwise, an error is thrown.
 * @since 0.1.0
 */
export default async function issueVerifiableCredential(
  issuerEndpoint: Iri,
  subjectId: Iri,
  subjectClaims: JsonLd,
  credentialClaims?: JsonLd,
  options?: {
    fetch?: typeof fallbackFetch;
  }
): Promise<VerifiableCredential> {
  const internalOptions = { ...options };
  if (internalOptions.fetch === undefined) {
    internalOptions.fetch = fallbackFetch;
  }
  // credentialClaims should contain all the claims, but not the context.
  // const {
  //   "@context": subjectClaimsContext,
  //   ...contextlessSubjectClaims
  // } = subjectClaims;
  // The following lines refactor the previous deconstruction in order to work
  // around a misalignment between `rollup-plugin-typescript2` and NodeJS.
  // Issue tracking: https://github.com/ezolenko/rollup-plugin-typescript2/issues/282
  const contextlessSubjectClaims = { ...subjectClaims };
  delete contextlessSubjectClaims["@context"];
  const subjectClaimsContext = subjectClaims["@context"];

  // const {
  //   "@context": credentialClaimsContext,
  //   ...contextlessCredentialClaims
  // } = credentialClaims !== undefined ? credentialClaims : { "@context": [] };
  // The following lines refactor the previous deconstruction in order to work
  // around a misalignment between `rollup-plugin-typescript2` and NodeJS.
  // Issue tracking: https://github.com/ezolenko/rollup-plugin-typescript2/issues/282
  // When we add proper JSONLD parsing support, the following should be replaced.
  const contextlessCredentialClaims = { ...credentialClaims };
  delete contextlessCredentialClaims["@context"];
  const credentialClaimsContext =
    credentialClaims !== undefined ? credentialClaims["@context"] : [];

  // const {
  //   type: credentialTypeClaims,
  //   ...nonTypeCredentialClaims
  // } = contextlessCredentialClaims;
  // The following lines refactor the previous deconstruction in order to work
  // around a misalignment between `rollup-plugin-typescript2` and NodeJS.
  // Issue tracking: https://github.com/ezolenko/rollup-plugin-typescript2/issues/282
  const nonTypeCredentialClaims = { ...contextlessCredentialClaims };
  delete nonTypeCredentialClaims.type;
  const credentialTypeClaims = contextlessCredentialClaims.type;

  let credentialTypes = [];
  if (credentialTypeClaims !== undefined) {
    credentialTypes = Array.isArray(credentialTypeClaims)
      ? credentialTypeClaims
      : [credentialTypeClaims];
  }
  const credentialIssueBody = {
    // See https://w3c-ccg.github.io/vc-http-api/issuer.html
    credential: {
      "@context": concatenateContexts(
        defaultContext,
        subjectClaimsContext,
        credentialClaimsContext
      ),
      type: [...defaultCredentialTypes, ...credentialTypes],
      ...nonTypeCredentialClaims,
      credentialSubject: {
        id: subjectId,
        ...contextlessSubjectClaims,
      },
    },
  };
  const response = await (internalOptions.fetch as typeof global.fetch)(
    issuerEndpoint,
    {
      headers: {
        "Content-Type": "application/json",
      },
      method: "POST",
      body: JSON.stringify(credentialIssueBody),
    }
  );
  if (!response.ok) {
    // TODO: use the error library when available.
    throw new Error(
      `The VC issuing endpoint [${issuerEndpoint}] could not successfully issue a VC for provided subject [${subjectId}]: ${response.status} ${response.statusText}`
    );
  }
  const jsonData = await response.json();
  if (isVerifiableCredential(jsonData)) {
    return jsonData;
  }
  throw new Error(
    `The VC issuing endpoint [${issuerEndpoint}] returned an unexpected object: ${JSON.stringify(
      jsonData,
      null,
      "  "
    )}`
  );
}
