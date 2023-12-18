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

import type { DatasetCore } from "@rdfjs/types";
import { DataFactory } from "n3";
import type {
  DatasetWithId,
  VerifiableCredentialBase,
  VerifiablePresentation,
} from "../common/common";
import {
  getVerifiableCredential,
  getVerifiableCredentialApiConfiguration,
  hasId,
  verifiableCredentialToDataset,
} from "../common/common";
import { getId, getIssuer } from "../common/getters";
import isRdfjsVerifiableCredential from "../common/isRdfjsVerifiableCredential";
import isRdfjsVerifiablePresentation, {
  getHolder,
  getVpSubject,
} from "../common/isRdfjsVerifiablePresentation";
import type {
  MinimalPresentation,
  ParsedVerifiablePresentation,
} from "../lookup/query";
import type { ParseOptions } from "../parser/jsonld";

const { namedNode } = DataFactory;

async function dereferenceVc(
  vc: VerifiableCredentialBase | DatasetWithId | URL | UrlString,
  options?: ParseOptions & {
    requireId?: boolean;
  },
): Promise<DatasetCore> {
  // This test passes for both URL and UrlString
  if (!vc.toString().startsWith("http")) {
    if (typeof (vc as DatasetCore).match === "function") {
      return vc as DatasetCore;
    }
    return verifiableCredentialToDataset(vc as VerifiableCredentialBase, {
      requireId: true,
    });
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
  vc: VerifiableCredentialBase | DatasetWithId | URL | UrlString,
  options?: Partial<{
    fetch?: typeof fetch;
    verificationEndpoint?: UrlString;
  }> &
    ParseOptions,
): Promise<{ checks: string[]; warnings: string[]; errors: string[] }> {
  const fetcher = options?.fetch ?? fetch;

  const vcObject = await dereferenceVc(vc, options);

  if (
    !hasId(vcObject) ||
    !isRdfjsVerifiableCredential(vcObject, namedNode(getId(vcObject)))
  ) {
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
    (await getVerifiableCredentialApiConfiguration(getIssuer(vcObject)))
      .verifierService;

  if (verifierEndpoint === undefined) {
    throw new Error(
      `The VC service provider ${getIssuer(
        vcObject,
      )} does not advertize for a verifier service in its .well-known/vc-configuration document`,
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

async function asDataset(
  data: DatasetCore | VerifiablePresentation,
  requireId: true,
): Promise<DatasetWithId>;
async function asDataset(
  data: DatasetCore | VerifiablePresentation,
  requireId: boolean,
): Promise<DatasetCore>;
async function asDataset(
  data: DatasetCore | VerifiablePresentation,
  requireId: boolean,
): Promise<DatasetCore> {
  return typeof (data as DatasetCore).match === "function"
    ? (data as DatasetCore)
    : verifiableCredentialToDataset(data as VerifiablePresentation, {
        requireId,
      });
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
  verifiablePresentation:
    | VerifiablePresentation
    | MinimalPresentation
    | ParsedVerifiablePresentation,
  options: Partial<{
    fetch: typeof fetch;
    domain: string;
    challenge: string;
  }> = {},
): Promise<{ checks: string[]; warnings: string[]; errors: string[] }> {
  const fetcher = options.fetch ?? fetch;
  const dataset = await asDataset(verifiablePresentation, false);
  const subject = getVpSubject(dataset);

  if (!isRdfjsVerifiablePresentation(dataset, subject)) {
    throw new Error(
      `The request to [${dataset}] returned an unexpected response: ${JSON.stringify(
        dataset,
        null,
        "  ",
      )}`,
    );
  }

  if (verifiablePresentation.verifiableCredential) {
    const datasets = await Promise.all(
      verifiablePresentation.verifiableCredential.map(async (vc) => {
        const vcDataset = await asDataset(vc, true);
        return isRdfjsVerifiableCredential(
          vcDataset,
          namedNode(getId(vcDataset)),
        );
      }),
    );
    if (datasets.some((vc) => vc === false)) {
      throw new Error(
        `The request to [${dataset}] returned an unexpected response: ${JSON.stringify(
          dataset,
          null,
          "  ",
        )}`,
      );
    }
  }

  const verifierEndpoint =
    verificationEndpoint ??
    (await getVerifiableCredentialApiConfiguration(getHolder(dataset, subject)))
      .verifierService;

  if (verifierEndpoint === undefined) {
    throw new Error(
      `The VC service provider ${getHolder(
        dataset,
        subject,
      )} does not advertize for a verifier service in its .well-known/vc-configuration document`,
    );
  }

  const response = await fetcher(verifierEndpoint, {
    headers: {
      "Content-Type": "application/json",
    },
    method: "POST",
    body: JSON.stringify({
      verifiablePresentation: dataset,
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
