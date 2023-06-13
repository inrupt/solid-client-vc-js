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

import { fetch as fallbackFetch } from "@inrupt/universal-fetch";
import {
  getVerifiableCredentialFromResponse,
  Iri,
  VerifiableCredential,
  VerifiablePresentation,
} from "../common/common";

/**
 * Based on https://w3c-ccg.github.io/vp-request-spec/#query-by-example.
 */
export type QueryByExample = {
  type: "QueryByExample";
  credentialQuery: {
    required?: boolean;
    reason?: string;
    example: Partial<VerifiableCredential> & {
      credentialSchema?: {
        id: string;
        type: string;
      };
      trustedIssuer?: {
        required: boolean;
        issuer: string;
      }[];
    };
  }[];
};

/**
 * A VP request is a standard way of getting a Verifiable Presentation matching
 * the requestor's needs.
 *
 * Note: Currently, only the QueryByExample type is implemented, but support for
 * other query types may be added in the future.
 */
export type VerifiablePresentationRequest = {
  query: QueryByExample[];
  challenge?: string;
  domain?: string;
};

/**
 * Send a Verifiable Presentation Request to a query endpoint in order to retrieve
 * all Verifiable Credentials matching the query, wrapped in a single Presentation.
 * 
 * @example The following shows how to query for credentials of a certain type. Adding
 * a reason to the request is helpful when interacting with a user. The resulting
 * Verifiable Presentation will wrap zero or more Verifiable Credentials.
 * 
 * ```
 * const verifiablePresentation = await query(
    "https://example.org/query", { 
      query: [{
        type: "QueryByExample",
        credentialQuery: [
          {
            reason: "Some reason",
            example: {
              type: ["SomeCredentialType"],
            },
          },
        ],
      }]
    },
    { fetch: session.fetch }
  );
 * ```
 *
 * @param queryEndpoint URL of the query endpoint.
 * @param vpRequest VP Request object, compliant with https://w3c-ccg.github.io/vp-request-spec
 * @param options Options object, including an authenticated `fetch`.
 * @returns The resulting Verifiable Presentation wrapping all the Credentials matching the query.
 */
export async function query(
  queryEndpoint: Iri,
  vpRequest: VerifiablePresentationRequest,
  options?: Partial<{
    fetch: typeof fallbackFetch;
  }>
): Promise<VerifiablePresentation> {
  const response = await (options?.fetch ?? fallbackFetch)(queryEndpoint, {
    headers: { "Content-Type": "application/json" },
    method: "POST",
    body: JSON.stringify(vpRequest),
  });
  return getVerifiableCredentialFromResponse(response, response.url, options);
}
