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
  VerifiableCredential,
  VerifiableCredentialBase,
  DatasetWithId,
} from "../common/common";
import { concatenateContexts, defaultContext } from "../common/common";
import type { VerifiablePresentationRequest } from "./query";
import { query } from "./query";

const INCLUDE_EXPIRED_VC_OPTION = "ExpiredVerifiableCredential" as const;

/**
 * This creates the proprietary data structure used for querying the legacy /derive
 * endpoint of ESS.
 *
 * @param vcShape The VC example used for the VP request
 * @param includeExpiredVc An option to query for expired VC as well
 * @returns A legacy object expected by the /derive endpoint of the ESS 2.0 VC service
 */
function buildLegacyQuery(
  vcShape: Partial<VerifiableCredentialBase>,
  includeExpiredVc: boolean,
) {
  // credentialClaims should contain all the claims, but not the context.
  const { "@context": claimsContext, ...credentialClaims } = vcShape;
  return {
    // See https://w3c-ccg.github.io/vc-api/holder.html
    verifiableCredential: {
      "@context": concatenateContexts(defaultContext, claimsContext),
      ...credentialClaims,
    },
    options: {
      include: includeExpiredVc ? INCLUDE_EXPIRED_VC_OPTION : undefined,
    },
  };
}

/**
 * See https://w3c-ccg.github.io/vp-request-spec/#query-by-example.
 * @param vcShape The VC example used for the VP request
 * @returns A Query by Example VP Request based on the provided example.
 */
function buildQueryByExample(
  vcShape: Partial<VerifiableCredentialBase>,
): VerifiablePresentationRequest {
  return {
    query: [
      {
        type: "QueryByExample",
        credentialQuery: [
          {
            example: vcShape,
          },
        ],
      },
    ],
  };
}

/**
 * Look up VCs from a given holder according to a subset of their claims, such as
 * the VC type, or any property associated to the subject in the VC. The holder
 * is expected to implement the [W3C VC Holder HTTP API](https://w3c-ccg.github.io/vc-api/holder.html).
 *
 * @param holderEndpoint The `/derive` endpoint of the holder.
 * @param vcShape The subset of claims you expect the matching VCs to contain.
 * @param options Optional parameter:
 * - `options.fetch`: An alternative `fetch` function to make the HTTP request, compatible with the browser-native [fetch API](https://developer.mozilla.org/docs/Web/API/WindowOrWorkerGlobalScope/fetch#parameters).
 * This can be typically used for authentication. Note that if it is omitted, and
 * `@inrupt/solid-client-authn-browser` is in your dependencies, the default session
 * is picked up.
 * - `options.includeExpiredVc`: include expired VC matching the shape in the
 * result set.
 * - `options.returnLegacyJsonld`: : Include the normalized JSON-LD in the response
 * @returns A list of VCs matching the given VC shape. The list may be empty if
 * the holder does not hold any matching VC.
 * @since 0.1.0
 */
export async function getVerifiableCredentialAllFromShape(
  holderEndpoint: Iri,
  vcShape: Partial<VerifiableCredentialBase>,
  options: {
    fetch?: typeof fetch;
    includeExpiredVc?: boolean;
    returnLegacyJsonld: false;
  },
): Promise<DatasetWithId[]>;
/**
 * Look up VCs from a given holder according to a subset of their claims, such as
 * the VC type, or any property associated to the subject in the VC. The holder
 * is expected to implement the [W3C VC Holder HTTP API](https://w3c-ccg.github.io/vc-api/holder.html).
 *
 * @param holderEndpoint The `/derive` endpoint of the holder.
 * @param vcShape The subset of claims you expect the matching VCs to contain.
 * @param options Optional parameter:
 * - `options.fetch`: An alternative `fetch` function to make the HTTP request, compatible with the browser-native [fetch API](https://developer.mozilla.org/docs/Web/API/WindowOrWorkerGlobalScope/fetch#parameters).
 * This can be typically used for authentication. Note that if it is omitted, and
 * `@inrupt/solid-client-authn-browser` is in your dependencies, the default session
 * is picked up.
 * - `options.includeExpiredVc`: include expired VC matching the shape in the
 * result set.
 * - `options.returnLegacyJsonld`: : Include the normalized JSON-LD in the response
 * @returns A list of VCs matching the given VC shape. The list may be empty if
 * the holder does not hold any matching VC.
 * @since 0.1.0
 * @deprecated Deprecated in favour of setting returnLegacyJsonld: false. This will be the default value in future
 * versions of this library.
 */
export async function getVerifiableCredentialAllFromShape(
  holderEndpoint: Iri,
  vcShape: Partial<VerifiableCredentialBase>,
  options?: {
    fetch?: typeof fetch;
    includeExpiredVc?: boolean;
    returnLegacyJsonld?: true;
    normalize?: (vc: VerifiableCredentialBase) => VerifiableCredentialBase;
  },
): Promise<VerifiableCredential[]>;
/**
 * Look up VCs from a given holder according to a subset of their claims, such as
 * the VC type, or any property associated to the subject in the VC. The holder
 * is expected to implement the [W3C VC Holder HTTP API](https://w3c-ccg.github.io/vc-api/holder.html).
 *
 * @param holderEndpoint The `/derive` endpoint of the holder.
 * @param vcShape The subset of claims you expect the matching VCs to contain.
 * @param options Optional parameter:
 * - `options.fetch`: An alternative `fetch` function to make the HTTP request, compatible with the browser-native [fetch API](https://developer.mozilla.org/docs/Web/API/WindowOrWorkerGlobalScope/fetch#parameters).
 * This can be typically used for authentication. Note that if it is omitted, and
 * `@inrupt/solid-client-authn-browser` is in your dependencies, the default session
 * is picked up.
 * - `options.includeExpiredVc`: include expired VC matching the shape in the
 * result set.
 * - `options.returnLegacyJsonld`: : Include the normalized JSON-LD in the response
 * @returns A list of VCs matching the given VC shape. The list may be empty if
 * the holder does not hold any matching VC.
 * @since 0.1.0
 * @deprecated Deprecated in favour of setting returnLegacyJsonld: false. This will be the default value in future
 * versions of this library.
 */
export async function getVerifiableCredentialAllFromShape(
  holderEndpoint: Iri,
  vcShape: Partial<VerifiableCredentialBase>,
  options?: {
    fetch?: typeof fetch;
    includeExpiredVc?: boolean;
    returnLegacyJsonld?: boolean;
    normalize?: (vc: VerifiableCredentialBase) => VerifiableCredentialBase;
  },
): Promise<DatasetWithId[]>;
export async function getVerifiableCredentialAllFromShape(
  holderEndpoint: Iri,
  vcShape: Partial<VerifiableCredentialBase>,
  options?: {
    fetch?: typeof fetch;
    includeExpiredVc?: boolean;
    returnLegacyJsonld?: boolean;
    normalize?: (vc: VerifiableCredentialBase) => VerifiableCredentialBase;
  },
): Promise<DatasetWithId[]> {
  const fetchFn = options?.fetch ?? fetch;
  // The request payload depends on the target endpoint.
  const vpRequest = holderEndpoint.endsWith("/query")
    ? // The target endpoint is spec-compliant, and uses a standard VP request.
      // This is based on an implementation-specific assumption about the endpoint
      // being available under the /query path.
      buildQueryByExample(vcShape)
    : // The target endpoint is legacy, and uses a proprietary request format.
      (buildLegacyQuery(
        vcShape,
        options?.includeExpiredVc ?? false,
        // The legacy proprietary format is casted as a VP request to be passed to the `query` function.
      ) as unknown as VerifiablePresentationRequest);

  const vp = await query(holderEndpoint, vpRequest, {
    fetch: fetchFn,
    returnLegacyJsonld: options?.returnLegacyJsonld,
    normalize: options?.normalize,
  });
  return vp.verifiableCredential;
}

export default getVerifiableCredentialAllFromShape;
