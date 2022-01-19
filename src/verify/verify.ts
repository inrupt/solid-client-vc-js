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

import { UrlString } from "@inrupt/solid-client";
import {
  VerifiableCredential,
  getVerifiableCredentialApiConfiguration,
  isVerifiableCredential,
} from "../common/common";
import fallbackFetch from "../fetcher";

async function dereferenceVc(
  vc: VerifiableCredential | URL | UrlString,
  fetcher: typeof fetch
): Promise<VerifiableCredential> {
  // This test passes for both URL and UrlString
  if (!vc.toString().startsWith("http")) {
    return vc as VerifiableCredential;
  }
  // vc is either an IRI-shaped string or a URL object. In both
  // cases, vc.toString() is an IRI.
  const vcResponse = await fetcher(vc.toString());
  if (!vcResponse.ok) {
    throw new Error(
      `Dereferencing [${vc.toString()}] failed: ${vcResponse.status} ${
        vcResponse.statusText
      }`
    );
  }
  try {
    return await vcResponse.json();
  } catch (e) {
    throw new Error(
      `Parsing the value obtained when dereferencing [${vc.toString()}] as JSON failed: ${
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (e as any).toString()
      }`
    );
  }
}

export default async function isValidVc(
  vc: VerifiableCredential | URL | UrlString,
  options: Partial<{
    fetch?: typeof fetch;
    verificationEndpoint?: UrlString;
  }> = {}
): Promise<{ checks: string[]; warnings: string[]; errors: string[] }> {
  const fetcher = options.fetch ?? fallbackFetch;

  const vcObject = await dereferenceVc(vc, fetcher);

  if (!isVerifiableCredential(vcObject)) {
    throw new Error(
      `The request to [${vc}] returned an unexpected response: ${JSON.stringify(
        vcObject,
        null,
        "  "
      )}`
    );
  }

  // Discover the consent endpoint from the resource part of the Access Grant.
  const verifierEndpoint =
    options.verificationEndpoint ??
    (await getVerifiableCredentialApiConfiguration(vcObject.issuer))
      .verifierService;

  if (verifierEndpoint === undefined) {
    throw new Error(
      `The VC service provider ${vcObject.issuer} does not advertize for a verifier service in its .well-known/vc-configuration document`
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
      `The request to the verification endpoint [${verifierEndpoint}] failed: ${response.status} ${response.statusText}`
    );
  }

  try {
    return await response.json();
  } catch (e) {
    throw new Error(
      `Parsing the response of the verification service hosted at [${verifierEndpoint}] as JSON failed: ${
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (e as any).toString()
      }`
    );
  }
}
