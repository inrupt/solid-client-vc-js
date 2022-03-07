/**
 * Copyright 2022 Inrupt Inc.
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

import {
  concatenateContexts,
  defaultContext,
  Iri,
  isVerifiablePresentation,
  VerifiableCredential,
} from "../common/common";
import fallbackFetch from "../fetcher";

const INCLUDE_EXPIRED_VC_OPTION = "ExpiredVerifiableCredential" as const;

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
 * @returns A list of VCs matching the given VC shape. The list may be empty if
 * the holder does not hold any matching VC.
 * @since 0.1.0
 */
export default async function getVerifiableCredentialAllFromShape(
  holderEndpoint: Iri,
  vcShape: Partial<VerifiableCredential>,
  options?: Partial<{
    fetch: typeof fallbackFetch;
    includeExpiredVc: boolean;
  }>
): Promise<VerifiableCredential[]> {
  const internalOptions = { ...options };
  if (internalOptions.fetch === undefined) {
    internalOptions.fetch = fallbackFetch;
  }
  // credentialClaims should contain all the claims, but not the context.
  // const { "@context": claimsContext, ...credentialClaims } = vcShape;
  // The following lines refactor the previous deconstruction in order to work
  // around a misalignment between `rollup-plugin-typescript2` and NodeJS.
  // Issue tracking: https://github.com/ezolenko/rollup-plugin-typescript2/issues/282
  const credentialClaims = { ...vcShape };
  delete credentialClaims["@context"];
  const claimsContext = vcShape["@context"];
  const credentialRequestBody: {
    verifiableCredential: Partial<VerifiableCredential>;
    options?: { include: typeof INCLUDE_EXPIRED_VC_OPTION };
  } = {
    // See https://w3c-ccg.github.io/vc-api/holder.html
    verifiableCredential: {
      "@context": concatenateContexts(defaultContext, claimsContext),
      ...credentialClaims,
    },
  };
  if (internalOptions.includeExpiredVc) {
    credentialRequestBody.options = {
      include: INCLUDE_EXPIRED_VC_OPTION,
    };
  }
  const response = await internalOptions.fetch(holderEndpoint, {
    headers: {
      "Content-Type": "application/json",
    },
    method: "POST",
    body: JSON.stringify(credentialRequestBody),
  });
  if (!response.ok) {
    throw new Error(
      `The holder [${holderEndpoint}] returned an error: ${response.status} ${response.statusText}`
    );
  }

  let data;
  try {
    data = await response.json();
  } catch (e) {
    throw new Error(
      `The holder [${holderEndpoint}] did not return a valid JSON response: parsing failed with error ${e}`
    );
  }
  if (!isVerifiablePresentation(data)) {
    throw new Error(
      `The holder [${holderEndpoint}] did not return a Verifiable Presentation: ${JSON.stringify(
        data
      )}`
    );
  }
  return data.verifiableCredential ?? [];
}
