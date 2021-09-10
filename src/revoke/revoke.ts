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

import { Iri } from "../common/common";
import fallbackFetch from "../fetcher";

/**
 * Revoke a given VC from a given issuer. This changes the status of the VC so that
 * subsequent verifications will fail. The issuer is expected to implement the
 * [W3C VC Issuer HTTP API](https://w3c-ccg.github.io/vc-http-api/issuer.html),
 * in particular [VC status update](https://w3c-ccg.github.io/vc-http-api/issuer.html#operation/updateCredentialStatus).
 *
 * @param issuerEndpoint The `/status` endpoint of the holder.
 * @param credentialId The identifier of the VC to be revoked.
 * @param options Optional parameter `options.fetch`: An alternative `fetch` function to make the HTTP request, compatible with the browser-native [fetch API](https://developer.mozilla.org/docs/Web/API/WindowOrWorkerGlobalScope/fetch#parameters).
 * This can be typically used for authentication. Note that if it is omitted, and
 * `@inrupt/solid-client-authn-browser` is in your dependencies, the default session
 * is picked up.
 * @since 0.1.0
 */
export default async function revokeVerifiableCredential(
  issuerEndpoint: Iri,
  credentialId: Iri,
  options?: {
    fetch: typeof fetch;
  }
): Promise<void> {
  const internalOptions = { ...options };
  if (internalOptions.fetch === undefined) {
    try {
      const { fetch: fetchFn } = await import(
        /* eslint-disable import/no-unresolved */
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        "@inrupt/solid-client-authn-browser"
      );
      /* istanbul ignore next : `solid-client-authn-browser` is not a dependency of this library */
      internalOptions.fetch = fetchFn;
      /* eslint no-empty: 0 */
    } catch (e) {
      internalOptions.fetch = fallbackFetch;
    }
    // internalOptions.fetch = fallbackFetch;
  }
  const response = await (internalOptions.fetch as typeof global.fetch)(
    issuerEndpoint,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        credentialId,
        credentialStatus: [
          {
            type: "RevocationList2020Status",
            status: "0",
          },
        ],
      }),
    }
  );
  if (!response.ok) {
    throw new Error(
      `The issuer [${issuerEndpoint}] returned an error: ${response.status} ${response.statusText}`
    );
  }
}
