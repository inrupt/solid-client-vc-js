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
} from "../common/common";

function concatenateContexts(contextA: unknown[], contextB: unknown): unknown {
  const result = [...contextA];
  // Case when the context is an array of IRIs and/or inline contexts
  if (Array.isArray(contextB)) {
    return result.concat(contextB);
  }
  // Case when the context is a single remote URI or a single inline context
  result.push(contextB);
  return result;
}

/**
 * This context contains the required elements to build a valid VC issuance request.
 */
export const defaultContext = ["https://www.w3.org/2018/credentials/v1"];

export default async function issueVerifiableCredential(
  issuerEndpoint: Iri,
  subject: Iri,
  claims: JsonLd,
  options?: {
    fetch?: typeof fallbackFetch;
  }
): Promise<VerifiableCredential> {
  const internalOptions = { ...options };
  if (internalOptions.fetch === undefined) {
    internalOptions.fetch = fallbackFetch;
  }
  // credentialClaims should contain all the claims, but not the context.
  const { "@context": claimsContext, ...credentialClaims } = claims;
  const credentialIssueBody = {
    // See https://w3c-ccg.github.io/vc-http-api/issuer.html
    credential: {
      "@context": concatenateContexts(defaultContext, claimsContext),
      credentialSubject: {
        id: subject,
        ...credentialClaims,
      },
    },
  };
  const response = await internalOptions.fetch(issuerEndpoint, {
    headers: {
      "Content-Type": "application/json",
    },
    method: "POST",
    body: JSON.stringify(credentialIssueBody),
  });
  if (!response.ok) {
    // TODO: use the error library when available.
    throw new Error(
      `The VC issuing endpoint [${issuerEndpoint}] could not successfully issue a VC: ${response.status} ${response.statusText}`
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
