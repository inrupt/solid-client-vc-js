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

import type { DatasetCore } from "@rdfjs/types";
import { DataFactory } from "n3";
import type {
  DatasetWithId,
  Iri,
  VerifiableCredential,
  VerifiableCredentialBase,
  VerifiablePresentation,
} from "../common/common";
import {
  isVerifiablePresentation,
  normalizeVp,
  verifiableCredentialToDataset,
} from "../common/common";
import isRdfjsVerifiableCredential from "../common/isRdfjsVerifiableCredential";
import isRdfjsVerifiablePresentation, {
  getVpSubject,
} from "../common/isRdfjsVerifiablePresentation";
import { type ParseOptions } from "../parser/jsonld";

const { namedNode } = DataFactory;

/**
 * Based on https://w3c-ccg.github.io/vp-request-spec/#query-by-example.
 */
export type QueryByExample = {
  type: "QueryByExample";
  credentialQuery: {
    required?: boolean;
    reason?: string;
    example: Partial<VerifiableCredentialBase> & {
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
 * @hidden
 */
export interface ParsedVerifiablePresentation
  extends VerifiablePresentation,
    DatasetCore {
  verifiableCredential: VerifiableCredential[];
}

export type MinimalPresentation = {
  verifiableCredential: DatasetWithId[];
} & DatasetCore;

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
  options: ParseOptions & {
    fetch?: typeof fetch;
    returnLegacyJsonld: false;
    normalize?: (vc: VerifiableCredentialBase) => VerifiableCredentialBase;
  },
): Promise<MinimalPresentation>;
/**
 * @deprecated Use RDFJS API instead of relying on the JSON structure by setting `returnLegacyJsonld` to false
 */
export async function query(
  queryEndpoint: Iri,
  vpRequest: VerifiablePresentationRequest,
  options?: ParseOptions & {
    fetch?: typeof fetch;
    returnLegacyJsonld?: true;
    normalize?: (vc: VerifiableCredentialBase) => VerifiableCredentialBase;
  },
): Promise<ParsedVerifiablePresentation>;
/**
 * @deprecated Use RDFJS API instead of relying on the JSON structure by setting `returnLegacyJsonld` to false
 */
export async function query(
  queryEndpoint: Iri,
  vpRequest: VerifiablePresentationRequest,
  options?: ParseOptions & {
    fetch?: typeof fetch;
    returnLegacyJsonld?: boolean;
    normalize?: (vc: VerifiableCredentialBase) => VerifiableCredentialBase;
  },
): Promise<ParsedVerifiablePresentation | MinimalPresentation>;
export async function query(
  queryEndpoint: Iri,
  vpRequest: VerifiablePresentationRequest,
  options: ParseOptions &
    Partial<{
      fetch: typeof fetch;
      returnLegacyJsonld?: boolean;
      normalize?: (vc: VerifiableCredentialBase) => VerifiableCredentialBase;
    }> = {},
): Promise<ParsedVerifiablePresentation | MinimalPresentation> {
  const internalOptions = { ...options };
  if (internalOptions.fetch === undefined) {
    internalOptions.fetch = fetch;
  }
  const response = await internalOptions.fetch(queryEndpoint, {
    headers: {
      "Content-Type": "application/json",
    },
    method: "POST",
    body: JSON.stringify(vpRequest),
  });
  if (!response.ok) {
    throw new Error(
      `The query endpoint [${queryEndpoint}] returned an error: ${response.status} ${response.statusText}`,
    );
  }

  // Return to this approach once https://github.com/rubensworks/jsonld-streaming-parser.js/issues/122 is resolved
  // if (options?.returnLegacyJsonld === false) {
  //   try {
  //     const vpJson = await response.json();
  //     console.log(JSON.stringify(vpJson, null, 2), null, 2)
  //     const store = await jsonLdToStore(vpJson);
  //     const vp = [...store.match(null, rdf.type, cred.VerifiablePresentation, defaultGraph())]

  //     if (vp.length !== 1) {
  //       throw new Error(`Expected exactly 1 Verifiable Presentation. Found ${vp.length}.`)
  //     }

  //     const [{ subject }] = vp;

  //     if (subject.termType !== 'BlankNode' && subject.termType !== 'NamedNode') {
  //       throw new Error(`Expected VP to be a Blank Node or Named Node. Found [${subject.value}] of type [${subject.termType}].`)
  //     }

  //     if (!isRdfjsVerifiablePresentation(store, subject)) {
  //       throw new Error(
  //         `The holder [${queryEndpoint}] did not return a Verifiable Presentation: ${JSON.stringify(
  //           vpJson, null, 2
  //         )}`,
  //       );
  //     }

  //     // In the future we want to get rid of this and get the verifiableCredential ids from the store
  //     // the reason we need this for now is because we need the verifiableCredential JSON object for
  //     // the toJSON method.
  //     const verifiableCredential: DatasetWithId[] = vpJson.verifiableCredential.map((vc: unknown) => {
  //       if (vc === null || typeof vc !== 'object') {
  //         throw new Error(`Verifiable Credential entry is not an object`);
  //       }

  //       if (!('id' in vc) || typeof vc.id !== 'string') {
  //         throw new Error(`Verifiable credential is missing a string id`);
  //       }

  //       const c = internal_applyDataset(vc as { id: string }, store, options)

  //       if (!isRdfjsVerifiableCredential(store, namedNode(c.id))) {
  //         throw new Error(`[${c.id}] is not a valid Verifiable Credential`);
  //       }
  //     });
  //     return internal_applyDataset(vpJson, store, {
  //       ...options,
  //       additionalProperties: {
  //         verifiableCredential
  //       }
  //     });
  //   } catch (e) {
  //     throw new Error(
  //       `The holder [${queryEndpoint}] did not return a valid JSON response: parsing failed with error ${e}`,
  //     );
  //   }
  // }

  // All code below here should is deprecated
  let data: VerifiablePresentation & DatasetCore;
  let rawData: VerifiablePresentation;
  try {
    rawData = await response.json();

    if (options.returnLegacyJsonld !== false) {
      rawData = normalizeVp(rawData);
    }
    data = (await verifiableCredentialToDataset<VerifiablePresentation>(
      rawData,
      {
        includeVcProperties: options.returnLegacyJsonld !== false,
        additionalProperties:
          typeof rawData.id === "string" ? { id: rawData.id } : {},
        requireId: false,
        // This is a lie depending on how returnLegacyJsonld is set
      },
    )) as VerifiablePresentation & DatasetCore;
  } catch (e) {
    throw new Error(
      `The holder [${queryEndpoint}] did not return a valid JSON response: parsing failed with error ${e}`,
    );
  }

  const subject =
    typeof data.id === "string" ? namedNode(data.id) : getVpSubject(data);
  if (
    options.returnLegacyJsonld === false
      ? !isRdfjsVerifiablePresentation(data, subject)
      : !isVerifiablePresentation(data)
  ) {
    throw new Error(
      `The holder [${queryEndpoint}] did not return a Verifiable Presentation: ${JSON.stringify(
        data,
      )}`,
    );
  }

  const newVerifiableCredential: DatasetWithId[] = [];
  if (
    rawData.verifiableCredential &&
    Array.isArray(rawData.verifiableCredential)
  ) {
    for (let i = 0; i < rawData.verifiableCredential.length; i += 100) {
      newVerifiableCredential.push(
        // Limit concurrency to avoid memory overflows. For details see
        // https://github.com/inrupt/solid-client-vc-js/pull/849#discussion_r1377400688
        // eslint-disable-next-line no-await-in-loop
        ...(await Promise.all(
          rawData.verifiableCredential
            .slice(i, i + 100)
            .map(async (_vc: VerifiableCredentialBase) => {
              let vc = _vc;
              if (typeof vc !== "object" || vc === null) {
                throw new Error(`Verifiable Credentail is an invalid object`);
              }

              if (options.normalize) {
                vc = options.normalize(vc);
              }

              const res = await verifiableCredentialToDataset(vc, {
                ...options,
                includeVcProperties: options.returnLegacyJsonld !== false,
              });

              if (!isRdfjsVerifiableCredential(res, namedNode(res.id))) {
                throw new Error(
                  `[${res.id}] is not a Valid Verifiable Credential`,
                );
              }

              return res;
            }),
        )),
      );
    }
  }
  return {
    ...data,
    verifiableCredential: newVerifiableCredential,
  } as
    | ParsedVerifiablePresentation
    | ({ verifiableCredential: DatasetWithId[] } & DatasetCore);
}
