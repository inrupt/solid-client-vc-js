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
 * @module verify
 */

import type { UrlString } from "@inrupt/solid-client";
import { fetch as fallbackFetch } from "@inrupt/universal-fetch";

import type {
  VerifiableCredential,
  VerifiablePresentation,
} from "../common/common";
import {
  getVerifiableCredential,
  getVerifiableCredentialApiConfiguration,
  isVerifiableCredential,
  isVerifiablePresentation,
} from "../common/common";
import type { ParseOptions } from "../parser/jsonld";

async function dereferenceVc(
  vc: VerifiableCredential | URL | UrlString,
  options?: ParseOptions,
): Promise<VerifiableCredential> {
  // This test passes for both URL and UrlString
  if (!vc.toString().startsWith("http")) {
    return vc as VerifiableCredential;
  }
  return getVerifiableCredential(vc.toString(), options);
}

/**
 * Verify that a VC is valid, i.e. :
 * - its signature matches its issuer's key
 * - it has not been revoked
 * - it isn't expired
 * These verifications are done server-side by a Verification Service, either
 * discovered from the VC Issuer or manually provided.
 *
 * @param vc The VC to verify
 * @param options Additional options
 * - `options.fetch`: An alternative `fetch` function to make the HTTP request,
 * compatible with the browser-native [fetch API](https://developer.mozilla.org/docs/Web/API/WindowOrWorkerGlobalScope/fetch#parameters).
 * This can be typically used for authentication.
 * - `options.verificationEndpoint`: Pass a trusted VC verification service
 *
 * @returns a JSON-shaped validation report structured accoring to the [VC Verifier API](https://w3c-ccg.github.io/vc-api/verifier.html#operation/verifyCredential).
 * @since 0.3.0
 */
export async function isValidVc(
  vc: VerifiableCredential | URL | UrlString,
  options?: Partial<{
    fetch?: typeof fetch;
    verificationEndpoint?: UrlString;
  }> &
    ParseOptions,
): Promise<{ checks: string[]; warnings: string[]; errors: string[] }> {
  const fetcher = options?.fetch ?? fallbackFetch;

  const vcObject = await dereferenceVc(vc, options);

  if (!isVerifiableCredential(vcObject)) {
    throw new Error(
      `The request to [${vc}] returned an unexpected response: ${JSON.stringify(
        vcObject,
        null,
        "  ",
      )}`,
    );
  }

  // Discover the consent endpoint from the resource part of the Access Grant.
  const verifierEndpoint =
    options?.verificationEndpoint ??
    (await getVerifiableCredentialApiConfiguration(vcObject.issuer))
      .verifierService;

  if (verifierEndpoint === undefined) {
    throw new Error(
      `The VC service provider ${vcObject.issuer} does not advertize for a verifier service in its .well-known/vc-configuration document`,
    );
  }

  const response = await fetcher(verifierEndpoint, {
    headers: {
      "Content-Type": "application/json",
    },
    method: "POST",
    body: JSON.stringify({
      verifiableCredential: vcObject,
    }),
  });

  if (!response.ok) {
    throw new Error(
      `The request to the verification endpoint [${verifierEndpoint}] failed: ${response.status} ${response.statusText}`,
    );
  }

  try {
    return await response.json();
  } catch (e) {
    throw new Error(
      `Parsing the response of the verification service hosted at [${verifierEndpoint}] as JSON failed: ${
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (e as any).toString()
      }`,
    );
  }
}

/**
 * Verify that a VP is valid and content has not ben tampered with.
 *
 * @param verificationEndpoint The verification endpoint
 * @param verifiablePresentation The VP to verify
 * @param options Additional options
 * - `options.fetch`: An alternative `fetch` function to make the HTTP request,
 * compatible with the browser-native [fetch API](https://developer.mozilla.org/docs/Web/API/WindowOrWorkerGlobalScope/fetch#parameters).
 * This can be typically used for authentication.
 * - `options.domain`: Pass a domain
 * - `options.challenge`: Pass a challenge
 *
 * @returns a JSON-shaped validation report structured accoring to the [VP Verifier API](https://w3c-ccg.github.io/vc-api/verifier.html#operation/verifyPresentation).
 * @since
 */
export async function isValidVerifiablePresentation(
  verificationEndpoint: string | null,
  verifiablePresentation: VerifiablePresentation,
  options: Partial<{
    fetch: typeof fetch;
    domain: string;
    challenge: string;
  }> = {},
): Promise<{ checks: string[]; warnings: string[]; errors: string[] }> {
  const fetcher = options.fetch ?? fallbackFetch;

  if (!isVerifiablePresentation(verifiablePresentation)) {
    throw new Error(
      `The request to [${verifiablePresentation}] returned an unexpected response: ${JSON.stringify(
        verifiablePresentation,
        null,
        "  ",
      )}`,
    );
  }

  const verifierEndpoint =
    verificationEndpoint ??
    (
      await getVerifiableCredentialApiConfiguration(
        verifiablePresentation.holder as string,
      )
    ).verifierService;

  if (verifierEndpoint === undefined) {
    throw new Error(
      `The VC service provider ${verifiablePresentation.holder} does not advertize for a verifier service in its .well-known/vc-configuration document`,
    );
  }

  const response = await fetcher(verifierEndpoint, {
    headers: {
      "Content-Type": "application/json",
    },
    method: "POST",
    body: JSON.stringify({
      verifiablePresentation,
      options: {
        domain: options.domain,
        challenge: options.challenge,
      },
    }),
  });

  if (!response.ok) {
    throw new Error(
      `The request to the verification endpoint [${verificationEndpoint}] failed: ${response.status} ${response.statusText}`,
    );
  }

  try {
    return await response.json();
  } catch (e) {
    throw new Error(
      `Parsing the response of the verification service hosted at [${verificationEndpoint}] as JSON failed: ${
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (e as any).toString()
      }`,
    );
  }
}
