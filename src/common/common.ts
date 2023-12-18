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
 * @module common
 */

import type { UrlString } from "@inrupt/solid-client";
import {
  getIri,
  getJsonLdParser,
  getSolidDataset,
  getThingAll,
} from "@inrupt/solid-client";
import type { DatasetCore, Quad } from "@rdfjs/types";
import { DataFactory } from "n3";
import type { ParseOptions } from "../parser/jsonld";
import { jsonLdToStore } from "../parser/jsonld";
import isRdfjsVerifiableCredential from "./isRdfjsVerifiableCredential";

const { namedNode } = DataFactory;

export type DatasetWithId = DatasetCore & { id: string };

export type Iri = string;
/**
 * A JSON-LD document is a JSON document including an @context entry. The other
 * fields may contain any value.
 * @deprecated Use RDFJS API instead
 */
export type JsonLd = {
  "@context": unknown;
  [property: string]: unknown;
};

/**
 * @deprecated Use RDFJS API instead
 */
type Proof = {
  /**
   * @deprecated Use RDFJS API instead
   */
  type: string;
  /**
   * ISO-8601 formatted date
   */
  created: string;
  /**
   * @deprecated Use RDFJS API instead
   */
  verificationMethod: string;
  /**
   * @deprecated Use RDFJS API instead
   */
  proofPurpose: string;
  /**
   * @deprecated Use RDFJS API instead
   */
  proofValue: string;
};

/**
 * A Verifiable Credential JSON-LD document, as specified by the W3C VC HTTP API.
 * @deprecated Use RDFJS API instead
 */
export type VerifiableCredentialBase = JsonLd & {
  id: Iri;
  /**
   * @deprecated Use RDFJS API instead
   */
  type: Iri[];
  /**
   * @deprecated Use RDFJS API instead
   */
  issuer: Iri;
  /**
   * ISO-8601 formatted date
   * @deprecated Use RDFJS API instead
   */
  issuanceDate: string;
  /**
   * Entity the credential makes claim about.
   * @deprecated Use RDFJS API instead
   */
  credentialSubject: {
    /**
     * @deprecated Use RDFJS API instead
     */
    id: Iri;
    /**
     * The claim set is open, as any RDF graph is suitable for a set of claims.
     * @deprecated Use RDFJS API instead
     */
    [property: string]: unknown;
  };
  /**
   * @deprecated Use RDFJS API instead
   */
  proof: Proof;
};

export type VerifiableCredential = VerifiableCredentialBase & DatasetCore;

export type VerifiablePresentation = JsonLd & {
  id?: string;
  type: string | string[];
  verifiableCredential?: VerifiableCredentialBase[];
  holder?: string;
  proof?: Proof;
};

function isUnknownObject(x: unknown): x is {
  [key in PropertyKey]: unknown;
} {
  return x !== null && typeof x === "object";
}

function hasProof(x: { [key in PropertyKey]: unknown }): x is {
  proof: { [key in PropertyKey]: unknown };
} {
  return x.proof !== null && typeof x.proof === "object";
}

/**
 * This function is a temporary stopgap until we implement proper JSON-LD parsing.
 * It refactors know misalignments between the JSON-LD object we receive and the
 * JSON frame we expect.
 *
 * @param vcJson A JSON-LD VC.
 * @returns an equivalent JSON-LD VC, fitted to a specific frame.
 */
export function normalizeVc<T>(vcJson: T): T {
  if (!isUnknownObject(vcJson) || !hasProof(vcJson)) {
    // The received JSON doesn't have the shape we want to refactor
    return vcJson;
  }
  const normalized = { ...vcJson };
  if (
    typeof vcJson.proof["https://w3id.org/security#proofValue"] === "string"
  ) {
    normalized.proof.proofValue =
      vcJson.proof["https://w3id.org/security#proofValue"];
    delete normalized.proof["https://w3id.org/security#proofValue"];
  }
  return normalized;
}

function hasCredentials(x: { [key in PropertyKey]: unknown }): x is {
  verifiableCredential: unknown[];
} {
  return (
    x.verifiableCredential !== null && Array.isArray(x.verifiableCredential)
  );
}

/**
 * Normalizes all VCs wrapped in a VP.
 *
 * @param vpJson A JSON-LD VP.
 * @returns An equivalent JSON-LD VP, with its contained VCs fitted to a specific frame.
 */
export function normalizeVp<T>(vpJson: T): T {
  if (!isUnknownObject(vpJson) || !hasCredentials(vpJson)) {
    // The received JSON doesn't have the shape we want to refactor
    return vpJson;
  }
  const normalizedVp = { ...vpJson };
  normalizedVp.verifiableCredential =
    normalizedVp.verifiableCredential.map(normalizeVc);

  return normalizedVp;
}

/**
 * Verifies that a given JSON-LD payload conforms to the Verifiable Credential
 * schema we expect.
 * @param data The JSON-LD payload
 * @returns true is the payload matches our expectation.
 * @deprecated Use isRdfjsVerifiableCredential instead
 */
export function isVerifiableCredential(
  data: unknown | VerifiableCredentialBase,
): data is VerifiableCredentialBase {
  let dataIsVc = true;
  dataIsVc = typeof (data as VerifiableCredentialBase).id === "string";
  dataIsVc = dataIsVc && Array.isArray((data as VerifiableCredentialBase).type);
  dataIsVc =
    dataIsVc && typeof (data as VerifiableCredentialBase).issuer === "string";
  dataIsVc =
    dataIsVc &&
    typeof (data as VerifiableCredentialBase).issuanceDate === "string";
  dataIsVc =
    dataIsVc &&
    !Number.isNaN(Date.parse((data as VerifiableCredentialBase).issuanceDate));
  dataIsVc =
    dataIsVc &&
    typeof (data as VerifiableCredentialBase).credentialSubject === "object";
  dataIsVc =
    dataIsVc &&
    typeof (data as VerifiableCredentialBase).credentialSubject.id === "string";
  dataIsVc =
    dataIsVc && typeof (data as VerifiableCredentialBase).proof === "object";
  dataIsVc =
    dataIsVc &&
    typeof (data as VerifiableCredentialBase).proof.created === "string";
  dataIsVc =
    dataIsVc &&
    !Number.isNaN(Date.parse((data as VerifiableCredentialBase).proof.created));
  dataIsVc =
    dataIsVc &&
    typeof (data as VerifiableCredentialBase).proof.proofPurpose === "string";
  dataIsVc =
    dataIsVc &&
    typeof (data as VerifiableCredentialBase).proof.proofValue === "string";
  dataIsVc =
    dataIsVc &&
    typeof (data as VerifiableCredentialBase).proof.type === "string";
  dataIsVc =
    dataIsVc &&
    typeof (data as VerifiableCredentialBase).proof.verificationMethod ===
      "string";
  return dataIsVc;
}

export function isUrl(url: string): boolean {
  try {
    // If url is not URL-shaped, this will throw.
    // eslint-disable-next-line no-new
    new URL(url);
    return true;
  } catch (_e) {
    return false;
  }
}

/**
 * @deprecated Use isRdfjsVerifiableCredential instead
 */
export function isVerifiablePresentation(
  vp: unknown | VerifiablePresentation,
): vp is VerifiablePresentation {
  let inputIsVp = true;
  inputIsVp =
    inputIsVp &&
    (Array.isArray((vp as VerifiablePresentation).type) ||
      typeof (vp as VerifiablePresentation).type === "string");
  if ((vp as VerifiablePresentation).verifiableCredential !== undefined) {
    inputIsVp =
      inputIsVp &&
      Array.isArray((vp as VerifiablePresentation).verifiableCredential);
    inputIsVp =
      inputIsVp &&
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      (vp as VerifiablePresentation).verifiableCredential!.every(
        isVerifiableCredential,
      );
  }
  if ((vp as VerifiablePresentation).holder !== undefined) {
    inputIsVp =
      inputIsVp && typeof (vp as VerifiablePresentation).holder === "string";
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    inputIsVp = inputIsVp && isUrl((vp as VerifiablePresentation).holder!);
  }
  // TODO: No type checking is currently implemented for the proof.
  return inputIsVp;
}

export function concatenateContexts(...contexts: unknown[]): unknown {
  const result: Set<unknown> = new Set();
  contexts.forEach((additionalContext) => {
    // Case when the context is an array of IRIs and/or inline contexts
    if (Array.isArray(additionalContext)) {
      additionalContext.forEach((contextEntry) => result.add(contextEntry));
    } else if (additionalContext !== null && additionalContext !== undefined) {
      // Case when the context is a single remote URI or a single inline context
      result.add(additionalContext);
    }
  });
  return Array.from(result.values());
}

/**
 * This context contains the required elements to build a valid VC issuance request.
 */
export const defaultContext = ["https://www.w3.org/2018/credentials/v1"];

export const defaultCredentialTypes = ["VerifiableCredential"];

/**
 * A Verifiable Credential API configuration details.
 */
export type VerifiableCredentialApiConfiguration =
  // Legacy endpoints
  Partial<{
    derivationService: UrlString;
    issuerService: UrlString;
    statusService: UrlString;
    verifierService: UrlString;
  }> & {
    // Spec-compliant endpoints, available in the `specCompliant` object
    specCompliant: Partial<{
      derivationService: UrlString;
      issuerService: UrlString;
      issuerCredentialAll: UrlString;
      holderPresentationAll: UrlString;
      statusService: UrlString;
      credentialVerifierService: UrlString;
      presentationVerifierService: UrlString;
      queryService: UrlString;
      exchangeService: UrlString;
      proveService: UrlString;
    }>;
  } & {
    // Legacy endpoints, available in the `legacy` object too to ease transition
    legacy: Partial<{
      derivationService: UrlString;
      issuerService: UrlString;
      statusService: UrlString;
      verifierService: UrlString;
    }>;
  };

// Solid VC URIs
const SOLID_VC_NS = "http://www.w3.org/ns/solid/vc#";
const SOLID_VC_DERIVATION_SERVICE = SOLID_VC_NS.concat("derivationService");
const SOLID_VC_ISSUER_SERVICE = SOLID_VC_NS.concat("issuerService");
const SOLID_VC_STATUS_SERVICE = SOLID_VC_NS.concat("statusService");
const SOLID_VC_VERIFIER_SERVICE = SOLID_VC_NS.concat("verifierService");

async function discoverLegacyEndpoints(
  vcServiceUrl: UrlString,
): Promise<VerifiableCredentialApiConfiguration["legacy"]> {
  const wellKnownIri = new URL(".well-known/vc-configuration", vcServiceUrl);

  try {
    const vcConfigData = await getSolidDataset(wellKnownIri.href, {
      // The configuration discovery document is only available as JSON-LD.
      parsers: { "application/ld+json": getJsonLdParser() },
    });

    // The dataset should have a single blank node subject of all its triples.
    const [wellKnownRootBlankNode] = getThingAll(vcConfigData, {
      acceptBlankNodes: true,
    });

    return {
      derivationService:
        getIri(wellKnownRootBlankNode, SOLID_VC_DERIVATION_SERVICE) ??
        undefined,
      issuerService:
        getIri(wellKnownRootBlankNode, SOLID_VC_ISSUER_SERVICE) ?? undefined,
      statusService:
        getIri(wellKnownRootBlankNode, SOLID_VC_STATUS_SERVICE) ?? undefined,
      verifierService:
        getIri(wellKnownRootBlankNode, SOLID_VC_VERIFIER_SERVICE) ?? undefined,
    };
  } catch (e) {
    // The target provider may not implement the legacy endpoints, in which case
    // the request above would fail.
    return {};
  }
}

function discoverSpecCompliantEndpoints(
  vcServiceUrl: UrlString,
): VerifiableCredentialApiConfiguration["specCompliant"] {
  return {
    issuerService: new URL("/credentials/issue", vcServiceUrl).toString(),
    issuerCredentialAll: new URL("/credentials", vcServiceUrl).toString(),
    statusService: new URL("/credentials/status", vcServiceUrl).toString(),
    holderPresentationAll: new URL("/presentations", vcServiceUrl).toString(),
    derivationService: new URL("/credentials/derive", vcServiceUrl).toString(),
    exchangeService: new URL("/exchanges", vcServiceUrl).toString(),
    proveService: new URL("/presentations/prove", vcServiceUrl).toString(),
    queryService: new URL("/query", vcServiceUrl).toString(),
    credentialVerifierService: new URL(
      "/credentials/verify",
      vcServiceUrl,
    ).toString(),
    presentationVerifierService: new URL(
      "/presentations/verify",
      vcServiceUrl,
    ).toString(),
  };
}

/**
 * Discover the available services for a given VC service provider. The detail of
 * some of these services are given by the [W3C VC API](https://github.com/w3c-ccg/vc-api/).
 *
 * The returned value has two entries at its top-level, `legacy` and `specCompliant`.
 * The former reflects the legacy (default) behavior, and relies on an ad-hoc discovery
 * mechanism. The latter follows what the VC-API specification requires.
 *
 * Note that since the specification only mandates URL patterns, what the discovery
 * gets you is the URL where the endpoint should be available **if it is present**.
 * Whether it actually is available or not is something you cannot assume and must
 * explicitly check.
 *
 * @example
 * Here is how the spec-compliant endpoints are discovered:
 * ```
 * const config = await getVerifiableCredentialApiConfiguration("https://example.org/vc-provider");
 * const issuer = config.specCompliant.issuerService;
 * ```
 *
 * Here is how legacy endpoints are accessed:
 * ```
 * const config = await getVerifiableCredentialApiConfiguration("https://example.org/vc-provider");
 * const legacyIssuer = config.legacy.issuerService;
 *```
 * @param vcServiceUrl The URL of the VC services provider. Only the domain is relevant, any provided path will be ignored.
 * @returns A map of the services available and their URLs.
 * @since 0.2.0
 */
export async function getVerifiableCredentialApiConfiguration(
  vcServiceUrl: URL | UrlString,
): Promise<VerifiableCredentialApiConfiguration> {
  const legacyEndpoints = await discoverLegacyEndpoints(
    vcServiceUrl.toString(),
  );
  const specEndpoints = discoverSpecCompliantEndpoints(vcServiceUrl.toString());
  return {
    ...legacyEndpoints,
    legacy: legacyEndpoints,
    specCompliant: specEndpoints,
  };
}

// eslint-disable-next-line camelcase
export function internal_applyDataset<T extends { id?: string }>(
  vc: T,
  store: DatasetCore,
  options?: ParseOptions & {
    includeVcProperties?: boolean;
    additionalProperties?: Record<string, unknown>;
    requireId?: boolean;
  },
): DatasetCore {
  return Object.freeze({
    ...(options?.requireId !== false && { id: vc.id }),
    ...(options?.includeVcProperties && vc),
    ...options?.additionalProperties,
    // Make this a DatasetCore without polluting the object with
    // all of the properties present in the N3.Store
    [Symbol.iterator]() {
      return store[Symbol.iterator]();
    },
    has(quad: Quad) {
      return store.has(quad);
    },
    match(...args: Parameters<DatasetCore["match"]>) {
      return store.match(...args);
    },
    add() {
      throw new Error("Cannot mutate this dataset");
    },
    delete() {
      throw new Error("Cannot mutate this dataset");
    },
    get size() {
      return store.size;
    },
    // For backwards compatibility the dataset properties
    // SHOULD NOT be included when we JSON.stringify the object
    toJSON() {
      return vc;
    },
  });
}

/**
 * @hidden
 */
export async function verifiableCredentialToDataset<T extends { id?: string }>(
  vc: T,
  options?: ParseOptions & {
    includeVcProperties: true;
    additionalProperties?: Record<string, unknown>;
    requireId?: true;
  },
): Promise<T & DatasetWithId>;
export async function verifiableCredentialToDataset<T extends { id?: string }>(
  vc: T,
  options?: ParseOptions & {
    includeVcProperties?: boolean;
    additionalProperties?: Record<string, unknown>;
    requireId?: true;
  },
): Promise<DatasetWithId>;
export async function verifiableCredentialToDataset<T extends { id?: string }>(
  vc: T,
  options: ParseOptions & {
    includeVcProperties: true;
    additionalProperties?: Record<string, unknown>;
    requireId: false;
  },
): Promise<T & DatasetCore>;
export async function verifiableCredentialToDataset<T extends { id?: string }>(
  vc: T,
  options?: ParseOptions & {
    includeVcProperties?: boolean;
    additionalProperties?: Record<string, unknown>;
    requireId?: boolean;
  },
): Promise<DatasetCore>;
export async function verifiableCredentialToDataset<T extends { id?: string }>(
  vc: T,
  options?: ParseOptions & {
    includeVcProperties?: boolean;
    additionalProperties?: Record<string, unknown>;
    requireId?: boolean;
  },
): Promise<DatasetCore> {
  let store: DatasetCore;
  try {
    store = await jsonLdToStore(vc, options);
  } catch (e) {
    throw new Error(
      `Parsing the Verifiable Credential as JSON-LD failed: ${e}`,
    );
  }

  if (options?.requireId !== false && typeof vc.id !== "string") {
    throw new Error(
      `Expected vc.id to be a string, found [${
        vc.id
      }] of type [${typeof vc.id}] on ${JSON.stringify(vc, null, 2)}`,
    );
  }

  return internal_applyDataset(vc as { id: string }, store, options);
}

export function hasId(vc: unknown): vc is { id: string } {
  return (
    typeof vc === "object" &&
    vc !== null &&
    typeof (vc as { id: unknown }).id === "string"
  );
}

/**
 * @hidden
 */
// eslint-disable-next-line camelcase
export async function internal_getVerifiableCredentialFromResponse(
  vcUrl: UrlString | undefined,
  response: Response,
  options: ParseOptions & {
    returnLegacyJsonld: false;
    skipValidation?: boolean;
  },
): Promise<DatasetWithId>;
/**
 * @deprecated Deprecated in favour of setting returnLegacyJsonld: false. This will be the default value in future
 * versions of this library.
 */
export async function internal_getVerifiableCredentialFromResponse(
  vcUrl: UrlString | undefined,
  response: Response,
  options?: ParseOptions & {
    returnLegacyJsonld?: true;
    skipValidation?: boolean;
    normalize?: (object: VerifiableCredentialBase) => VerifiableCredentialBase;
  },
): Promise<VerifiableCredential>;
/**
 * @deprecated Deprecated in favour of setting returnLegacyJsonld: false. This will be the default value in future
 * versions of this library.
 */
export async function internal_getVerifiableCredentialFromResponse(
  vcUrl: UrlString | undefined,
  response: Response,
  options?: ParseOptions & {
    returnLegacyJsonld?: boolean;
    skipValidation?: boolean;
    noVerify?: boolean;
  },
): Promise<DatasetWithId>;
export async function internal_getVerifiableCredentialFromResponse(
  vcUrlInput: UrlString | undefined,
  response: Response,
  options?: ParseOptions & {
    returnLegacyJsonld?: boolean;
    skipValidation?: boolean;
    normalize?: (object: VerifiableCredentialBase) => VerifiableCredentialBase;
  },
): Promise<DatasetWithId> {
  const returnLegacy = options?.returnLegacyJsonld !== false;
  let vc: unknown | VerifiableCredentialBase;
  let vcUrl = vcUrlInput;
  try {
    vc = await response.json();

    if (typeof vcUrl !== "string") {
      if (!isUnknownObject(vc) || !("id" in vc) || typeof vc.id !== "string") {
        throw new Error("Cannot establish id of verifiable credential");
      }
      vcUrl = vc.id;
    }

    // If you're wondering why this is not inside the if (returnLegacy) condition outside this try/catch statement
    // see https://github.com/inrupt/solid-client-vc-js/pull/849#discussion_r1405853022
    if (returnLegacy) {
      vc = normalizeVc(vc);
    }
  } catch (e) {
    throw new Error(
      `Parsing the Verifiable Credential [${vcUrl}] as JSON failed: ${e}`,
    );
  }

  if (returnLegacy) {
    if (!options?.skipValidation && !isVerifiableCredential(vc)) {
      throw new Error(
        `The value received from [${vcUrl}] is not a Verifiable Credential`,
      );
    }
    if (options?.normalize) {
      vc = options.normalize(vc as VerifiableCredentialBase);
    }
    return verifiableCredentialToDataset(vc as VerifiableCredentialBase, {
      allowContextFetching: options?.allowContextFetching,
      baseIRI: options?.baseIRI,
      contexts: options?.contexts,
      includeVcProperties: true,
    });
  }

  if (!hasId(vc)) {
    throw new Error(
      "Verifiable credential is not an object, or does not have an id",
    );
  }
  const parsedVc = await verifiableCredentialToDataset(vc, {
    allowContextFetching: options.allowContextFetching,
    baseIRI: options.baseIRI,
    contexts: options.contexts,
    includeVcProperties: false,
  });

  if (
    !options.skipValidation &&
    !isRdfjsVerifiableCredential(parsedVc, namedNode(parsedVc.id))
  ) {
    throw new Error(
      `The value received from [${vcUrl}] is not a Verifiable Credential`,
    );
  }
  return parsedVc;
}

/**
 * Dereference a VC URL, and verify that the resulting content is valid.
 *
 * @param vcUrl The URL of the VC.
 * @param options Options to customize the function behavior.
 * - options.fetch: Specify a WHATWG-compatible authenticated fetch.
 * - options.returnLegacyJsonld: Include the normalized JSON-LD in the response
 * @returns The dereferenced VC if valid. Throws otherwise.
 * @since 0.4.0
 */
export async function getVerifiableCredential(
  vcUrl: UrlString,
  options: ParseOptions & {
    fetch?: typeof fetch;
    skipValidation?: boolean;
    returnLegacyJsonld: false;
    normalize?: (object: VerifiableCredentialBase) => VerifiableCredentialBase;
  },
): Promise<DatasetWithId>;
/**
 * Dereference a VC URL, and verify that the resulting content is valid.
 *
 * @param vcUrl The URL of the VC.
 * @param options Options to customize the function behavior.
 * - options.fetch: Specify a WHATWG-compatible authenticated fetch.
 * - options.returnLegacyJsonld: Include the normalized JSON-LD in the response
 * @returns The dereferenced VC if valid. Throws otherwise.
 * @since 0.4.0
 * @deprecated Deprecated in favour of setting returnLegacyJsonld: false. This will be the default value in future
 * versions of this library.
 */
export async function getVerifiableCredential(
  vcUrl: UrlString,
  options?: ParseOptions & {
    fetch?: typeof fetch;
    skipValidation?: boolean;
    returnLegacyJsonld?: true;
    normalize?: (object: VerifiableCredentialBase) => VerifiableCredentialBase;
  },
): Promise<VerifiableCredential>;
/**
 * Dereference a VC URL, and verify that the resulting content is valid.
 *
 * @param vcUrl The URL of the VC.
 * @param options Options to customize the function behavior.
 * - options.fetch: Specify a WHATWG-compatible authenticated fetch.
 * - options.returnLegacyJsonld: Include the normalized JSON-LD in the response
 * @returns The dereferenced VC if valid. Throws otherwise.
 * @since 0.4.0
 * @deprecated Deprecated in favour of setting returnLegacyJsonld: false. This will be the default value in future
 * versions of this library.
 */
export async function getVerifiableCredential(
  vcUrl: UrlString,
  options?: ParseOptions & {
    fetch?: typeof fetch;
    skipValidation?: boolean;
    returnLegacyJsonld?: boolean;
    normalize?: (object: VerifiableCredentialBase) => VerifiableCredentialBase;
  },
): Promise<DatasetWithId>;
export async function getVerifiableCredential(
  vcUrl: UrlString,
  options?: ParseOptions & {
    fetch?: typeof fetch;
    skipValidation?: boolean;
    returnLegacyJsonld?: boolean;
    normalize?: (object: VerifiableCredentialBase) => VerifiableCredentialBase;
  },
): Promise<DatasetWithId> {
  const authFetch = options?.fetch ?? fetch;
  const response = await authFetch(vcUrl);

  if (!response.ok) {
    throw new Error(
      `Fetching the Verifiable Credential [${vcUrl}] failed: ${response.status} ${response.statusText}`,
    );
  }

  return internal_getVerifiableCredentialFromResponse(vcUrl, response, options);
}
