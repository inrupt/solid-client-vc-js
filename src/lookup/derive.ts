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

import LinkHeader from "http-link-header";
import {
  concatenateContexts,
  defaultContext,
  Iri,
  isVerifiableCredential,
  VerifiableCredential,
} from "../common/common";
import fallbackFetch from "../fetcher";

/**
 * This function iteratively gets all the paginated credentials from the holder's
 * response by following successive Link headers with rel=next.
 * @param holderResponse The response from the holder.
 * @param authFetch The authenticated fetch function
 * @returns An array of Verifiable Credentials.
 */
async function crawlDerivedCredentialAll(
  holderResponse: Response,
  credentialAccumulator: VerifiableCredential[],
  authFetch: typeof fallbackFetch,
  holderEndpoint: Iri
): Promise<VerifiableCredential[]> {
  if (!holderResponse.ok) {
    throw new Error(
      `The holder [${holderEndpoint}] returned an error: ${holderResponse.status} ${holderResponse.statusText}`
    );
  }
  let jsonData;
  // This clone is only used to display a more useful error message.
  const responseClone = holderResponse.clone();
  try {
    jsonData = await holderResponse.json();
  } catch (e) {
    throw new Error(
      `The holder [${holderEndpoint}] returned a malformed, non-JSON response: ${await responseClone.text()}`
    );
  }

  if (isVerifiableCredential(jsonData)) {
    // If the Holder's response is valid, see if additional credentials are available.
    const linkHeader = holderResponse.headers.get("Link");
    if (linkHeader !== null) {
      const parsedLinks = LinkHeader.parse(linkHeader);
      // The response should only contain a single 'rel=next' Link header.
      if (parsedLinks.get("rel", "next").length > 1) {
        throw new Error(
          `The holder [${holderEndpoint}] unexpectedly linked to more than one other credential.`
        );
      }
      if (parsedLinks.get("rel", "next").length === 1) {
        return crawlDerivedCredentialAll(
          await authFetch(parsedLinks.get("rel", "next")[0].uri),
          [jsonData, ...credentialAccumulator],
          authFetch,
          holderEndpoint
        );
      }
    }
    return [jsonData, ...credentialAccumulator];
  }
  throw new Error(
    `The holder [${holderEndpoint}] returned an unexpected response: ${JSON.stringify(
      jsonData
    )}`
  );
}

export default async function getVerifiableCredentialAllFromShape(
  holderEndpoint: Iri,
  vcShape: Partial<VerifiableCredential>,
  options?: {
    fetch?: typeof fallbackFetch;
  }
): Promise<VerifiableCredential[]> {
  const internalOptions = { ...options };
  if (internalOptions.fetch === undefined) {
    internalOptions.fetch = fallbackFetch;
  }
  // credentialClaims should contain all the claims, but not the context.
  const { "@context": claimsContext, ...credentialClaims } = vcShape;
  const credentialRequestBody = {
    // See https://w3c-ccg.github.io/vc-http-api/holder.html
    credential: {
      "@context": concatenateContexts(defaultContext, claimsContext),
      ...credentialClaims,
    },
  };
  const response = await internalOptions.fetch(holderEndpoint, {
    headers: {
      "Content-Type": "application/json",
    },
    method: "POST",
    body: JSON.stringify(credentialRequestBody),
  });
  return crawlDerivedCredentialAll(
    response,
    [],
    internalOptions.fetch,
    holderEndpoint
  );
}
