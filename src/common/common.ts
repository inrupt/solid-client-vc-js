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
  getSolidDataset,
  getThingAll,
  getJsonLdParser,
} from "@inrupt/solid-client";
import { fetch as uniFetch } from "@inrupt/universal-fetch";
import { Util } from "jsonld-streaming-serializer";
import type { DatasetCore } from "@rdfjs/types";
import type { Store, Term } from "n3";
import { DataFactory as DF } from "n3";
import contentTypeParser from "content-type";
import VcContext from "../parser/contexts/vc";
import { context } from "../parser/contexts";
import { getVcContext, jsonLdResponseToStore } from "../parser/jsonld";

export type Iri = string;
/**
 * A JSON-LD document is a JSON document including an @context entry. The other
 * fields may contain any value.
 */
export type JsonLd = {
  "@context": unknown;
  [property: string]: unknown;
};

type Proof = {
  type: string;
  /**
   * ISO-8601 formatted date
   */
  created: string;
  verificationMethod: string;
  proofPurpose: string;
  proofValue: string;
};

/**
 * A Verifiable Credential JSON-LD document, as specified by the W3C VC HTTP API.
 */
export type VerifiableCredential = JsonLd & {
  id: Iri;
  type: Iri[];
  issuer: Iri;
  /**
   * ISO-8601 formatted date
   */
  issuanceDate: string;
  /**
   * Entity the credential makes claim about.
   */
  credentialSubject: {
    id: Iri;
    /**
     * The claim set is open, as any RDF graph is suitable for a set of claims.
     */
    [property: string]: unknown;
  };
  proof: Proof;
};

export type VerifiablePresentation = JsonLd & {
  id?: string;
  type: string | string[];
  verifiableCredential?: VerifiableCredential[];
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
 */
export function isVerifiableCredential(
  data: unknown | VerifiableCredential
): data is VerifiableCredential {
  let dataIsVc = true;
  dataIsVc = typeof (data as VerifiableCredential).id === "string";
  dataIsVc = dataIsVc && Array.isArray((data as VerifiableCredential).type);
  dataIsVc =
    dataIsVc && typeof (data as VerifiableCredential).issuer === "string";
  dataIsVc =
    dataIsVc && typeof (data as VerifiableCredential).issuanceDate === "string";
  dataIsVc =
    dataIsVc &&
    !Number.isNaN(Date.parse((data as VerifiableCredential).issuanceDate));
  dataIsVc =
    dataIsVc &&
    typeof (data as VerifiableCredential).credentialSubject === "object";
  dataIsVc =
    dataIsVc &&
    typeof (data as VerifiableCredential).credentialSubject.id === "string";
  dataIsVc =
    dataIsVc && typeof (data as VerifiableCredential).proof === "object";
  dataIsVc =
    dataIsVc &&
    typeof (data as VerifiableCredential).proof.created === "string";
  dataIsVc =
    dataIsVc &&
    !Number.isNaN(Date.parse((data as VerifiableCredential).proof.created));
  dataIsVc =
    dataIsVc &&
    typeof (data as VerifiableCredential).proof.proofPurpose === "string";
  dataIsVc =
    dataIsVc &&
    typeof (data as VerifiableCredential).proof.proofValue === "string";
  dataIsVc =
    dataIsVc && typeof (data as VerifiableCredential).proof.type === "string";
  dataIsVc =
    dataIsVc &&
    typeof (data as VerifiableCredential).proof.verificationMethod === "string";
  return dataIsVc;
}

function isUrl(url: string): boolean {
  try {
    // If url is not URL-shaped, this will throw.
    // eslint-disable-next-line no-new
    new URL(url);
    return true;
  } catch (_e) {
    return false;
  }
}

export function isVerifiablePresentation(
  vp: unknown | VerifiablePresentation
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
        isVerifiableCredential
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
  vcServiceUrl: UrlString
): Promise<VerifiableCredentialApiConfiguration["legacy"]> {
  const wellKnownIri = new URL(".well-known/vc-configuration", vcServiceUrl);

  try {
    const vcConfigData = await getSolidDataset(wellKnownIri.href, {
      // The configuration discovery document is only available as JSON-LD.
      parsers: { "application/ld+json": getJsonLdParser() },
    });

    // The dataset should have a single blank node subject of all its triples.
    const wellKnownRootBlankNode = getThingAll(vcConfigData, {
      acceptBlankNodes: true,
    })[0];

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
  vcServiceUrl: UrlString
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
      vcServiceUrl
    ).toString(),
    presentationVerifierService: new URL(
      "/presentations/verify",
      vcServiceUrl
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
  vcServiceUrl: URL | UrlString
): Promise<VerifiableCredentialApiConfiguration> {
  const legacyEndpoints = await discoverLegacyEndpoints(
    vcServiceUrl.toString()
  );
  const specEndpoints = discoverSpecCompliantEndpoints(vcServiceUrl.toString());
  return {
    ...legacyEndpoints,
    legacy: legacyEndpoints,
    specCompliant: specEndpoints,
  };
}

/**
 * @param response Takes a response from a VC service and checks that it has the correct status and content type
 * @param vcUrl The URL of the VC
 * @returns The input response
 */
function validateVcResponse(response: Response, vcUrl: string): Response {
  if (!response.ok) {
    throw new Error(
      `Fetching the Verifiable Credential [${vcUrl}] failed: ${response.status} ${response.statusText}`
    );
  }

  const contentType = response.headers.get("Content-Type");

  // Ignoring since the test suite always adds a content type
  /* istanbul ignore if */
  if (!contentType) {
    throw new Error(
      `Fetching the Verifiable Credential [${vcUrl}] failed: Response does not have a Content-Type header; expected application/ld+json`
    );
  }

  const parsedContentType = contentTypeParser.parse(contentType);
  const [mediaType, subtypesString] = parsedContentType.type.split("/");
  const subtypes = subtypesString.split("+");

  if (
    mediaType !== "application" ||
    // TODO: See if the response is expected to include the ld
    // || !subtypes.includes('ld')
    !subtypes.includes("json")
  ) {
    throw new Error(
      `Fetching the Verifiable Credential [${vcUrl}] failed: Response has an unsupported Content-Type [${contentType}]; expected application/ld+json`
    );
  }

  return response;
}

async function responseToVcStore(
  response: Response,
  vcUrl: UrlString,
  options?: Partial<{
    fetch: typeof fetch;
  }>
): Promise<Store> {
  try {
    return await jsonLdResponseToStore(validateVcResponse(response, vcUrl), {
      fetch: options?.fetch,
      baseIRI: vcUrl,
    });
  } catch (e) {
    throw new Error(
      `Parsing the Verifiable Credential [${vcUrl}] as JSON-LD failed: ${e}`
    );
  }
}

const VC = "https://www.w3.org/2018/credentials#";
const RDF = "http://www.w3.org/1999/02/22-rdf-syntax-ns#";
const XSD = "http://www.w3.org/2001/XMLSchema#";
const SEC = "https://w3id.org/security#";
const CRED = "https://www.w3.org/2018/credentials#";
const RDF_TYPE = `${RDF}type`;
const VERIFIABLE_CREDENTIAL = `${VC}VerifiableCredential`;
const DATE_TIME = `${XSD}dateTime`;
const CREDENTIAL_SUBJECT = `${CRED}credentialSubject`;
const ISSUER = `${CRED}issuer`;
const ISSUANCE_DATE = `${CRED}issuanceDate`;
const PROOF = `${SEC}proof`;
const PROOF_PURPOSE = `${SEC}proofPurpose`;
const VERIFICATION_METHOD = `${SEC}verificationMethod`;
const PROOF_VALUE = `${SEC}proofValue`;

/**
 * @hidden
 */
export async function getVerifiableCredentialFromStore(
  vcStore: Store,
  vcUrl: UrlString
): Promise<VerifiableCredential & DatasetCore> {
  const vcContext = await getVcContext();

  const vcs = vcStore.getSubjects(
    RDF_TYPE,
    VERIFIABLE_CREDENTIAL,
    DF.defaultGraph()
  );
  if (vcs.length !== 1) {
    throw new Error(
      `Expected exactly one Verifiable Credential in [${vcUrl}], received: ${vcs.length}`
    );
  }

  const [vc] = vcs;
  if (vc.termType !== "NamedNode") {
    throw new Error(
      `Expected the Verifiable Credential in [${vcUrl}] to be a Named Node, received: ${vc.termType}`
    );
  }

  const type: string[] = [];
  for (const t of vcStore.getObjects(vc, RDF_TYPE, DF.defaultGraph())) {
    if (t.termType !== "NamedNode") {
      throw new Error(
        `Expected all VC types to be Named Nodes but received [${t.value}] of termType [${t.termType}]`
      );
    }

    const compact = vcContext.compactIri(t.value, true);

    if (/^[a-z]+$/i.test(compact)) type.push(compact);
  }

  function getSingleObject(
    fullProperty: string,
    subject?: Term,
    graph: Term = DF.defaultGraph()
  ): Term {
    const objects = vcStore.getObjects(subject ?? vc, fullProperty, graph);

    if (objects.length !== 1) {
      throw new Error(
        `Expected exactly one [${fullProperty}] for the Verifiable Credential ${vc.value}, received: ${objects.length}`
      );
    }

    return objects[0];
  }

  function getSingleObjectOfTermType(
    fullProperty: string,
    subject?: Term,
    graph?: Term,
    termType = "NamedNode",
    customContext = vcContext
  ) {
    const object = getSingleObject(fullProperty, subject, graph);

    if (object.termType !== termType) {
      throw new Error(
        `Expected property [${fullProperty}] of the Verifiable Credential [${vc.value}] to be a ${termType}, received: ${object.termType}`
      );
    }

    // TODO: Make sure that Literals with URIs are correclty handled here
    return object.termType === "NamedNode"
      ? customContext.compactIri(object.value, true)
      : object.value;
  }

  function getSingleDateTime(
    fullProperty: string,
    subject?: Term,
    graph?: Term
  ) {
    const object = getSingleObject(fullProperty, subject, graph);

    if (object.termType !== "Literal") {
      throw new Error(
        `Expected issuanceDate to be a Literal, received: ${object.termType}`
      );
    }
    if (!object.datatype.equals(DF.namedNode(DATE_TIME))) {
      throw new Error(
        `Expected issuanceDate to have dataType [${DATE_TIME}], received: [${object.datatype.value}]`
      );
    }

    if (Number.isNaN(Date.parse(object.value))) {
      throw new Error(`Invalid dateTime in VC [${object.value}]`);
    }

    return object.value;
  }

  // The proof lives within a named graph
  const proofGraph = getSingleObject(PROOF);
  const proofs = vcStore.getSubjects(null, null, proofGraph);

  if (proofs.length !== 1) {
    throw new Error(
      `Expected exactly one proof to live in the proofs graph, received ${proofs.length}`
    );
  }

  const [proof] = proofs;
  const proofType = getSingleObjectOfTermType(RDF_TYPE, proof, proofGraph);

  const proposedContextTemp =
    VcContext["@context"][proofType as keyof (typeof VcContext)["@context"]];
  const proposedContext =
    typeof proposedContextTemp === "object" &&
    "@context" in proposedContextTemp &&
    proposedContextTemp["@context"];

  let proofContext = vcContext;
  let proofPurposeContext = vcContext;

  if (typeof proposedContext === "object") {
    proofContext = await getVcContext(proposedContext);
    if (
      "proofPurpose" in proposedContext &&
      typeof proposedContext.proofPurpose["@context"] === "object"
    ) {
      proofPurposeContext = await getVcContext(
        proposedContext,
        proposedContext.proofPurpose["@context"]
      );
    } else {
      proofPurposeContext = proofContext;
    }
  }

  function getProperties(subject: Term, writtenTerms: string[] = []) {
    const object: Record<string, unknown> = {};

    for (const predicate of vcStore.getPredicates(
      subject,
      null,
      DF.defaultGraph()
    )) {
      if (predicate.termType !== "NamedNode") {
        throw new Error("Predicate must be a namedNode");
      }

      const compact = vcContext.compactIri(predicate.value, true);
      const objects = vcStore
        .getObjects(subject, predicate, DF.defaultGraph())
        // writeObject and getProperties depend on each other circularly
        // eslint-disable-next-line @typescript-eslint/no-use-before-define
        .map((obj) => writeObject(obj, writtenTerms))
        .filter(
          (obj) => typeof obj !== "object" || Object.keys(obj).length >= 1
        );

      if (objects.length === 1) {
        [object[compact]] = objects;
      } else if (objects.length > 1) {
        object[compact] = objects;
      }
    }

    return object;
  }

  let i = 0;
  const data: Record<string, number> = {};

  function writeObject(object: Term, writtenTerms: string[]) {
    switch (object.termType) {
      case "BlankNode": {
        const obj = writtenTerms.includes(object.value)
          ? {}
          : getProperties(object, [...writtenTerms, object.value]);

        // eslint-disable-next-line no-multi-assign
        obj["@id"] = `_:b${(data[object.value] ??= i += 1)}`;
        return obj;
      }
      // eslint-disable-next-line no-fallthrough
      case "NamedNode":
      case "Literal":
        return Util.termToValue(object, vcContext);
      default:
        throw new Error(`Unexpected term type: ${object.termType}`);
    }
  }

  const credentialSubjectTerm = getSingleObjectOfTermType(CREDENTIAL_SUBJECT);
  return {
    "@context": context,
    id: vc.value,
    // It is possible to have multiple claims in a credential subject
    // we do not support this
    // https://www.w3.org/TR/vc-data-model/#example-specifying-multiple-subjects-in-a-verifiable-credential
    credentialSubject: {
      ...getProperties(DF.namedNode(credentialSubjectTerm)),
      id: credentialSubjectTerm,
    },
    issuer: getSingleObjectOfTermType(ISSUER),
    issuanceDate: getSingleDateTime(ISSUANCE_DATE),
    type,
    proof: {
      created: getSingleDateTime(
        "http://purl.org/dc/terms/created",
        proof,
        proofGraph
      ),
      proofPurpose: getSingleObjectOfTermType(
        PROOF_PURPOSE,
        proof,
        proofGraph,
        "NamedNode",
        proofPurposeContext
      ),
      type: proofType,
      verificationMethod: getSingleObjectOfTermType(
        VERIFICATION_METHOD,
        proof,
        proofGraph,
        "NamedNode",
        proofContext
      ),
      proofValue: getSingleObjectOfTermType(
        PROOF_VALUE,
        proof,
        proofGraph,
        "Literal"
      ),
    },

    // Make this a DatasetCore without polluting the object with
    // all of the properties present in the N3.Store
    [Symbol.iterator]() {
      return vcStore[Symbol.iterator]();
    },
    has(quad) {
      return vcStore.has(quad);
    },
    match(subject, predicate, object, graph) {
      // We need to cast to DatasetCore because the N3.Store
      // type uses an internal type for Term rather than the @rdfjs/types Term
      return (vcStore as DatasetCore).match(subject, predicate, object, graph);
    },
    add() {
      throw new Error("Cannot mutate this dataset");
    },
    delete() {
      throw new Error("Cannot mutate this dataset");
    },
    get size() {
      return vcStore.size;
    },
  };
}

/**
 * Dereference a VC URL, and verify that the resulting content is valid.
 *
 * @param vcUrl The URL of the VC.
 * @param options Options to customize the function behavior.
 * - options.fetch: Specify a WHATWG-compatible authenticated fetch.
 * @returns The dereferenced VC if valid. Throws otherwise.
 * @since 0.4.0
 */
export async function getVerifiableCredentialFromResponse(
  response: Response,
  vcUrl: UrlString,
  options?: Partial<{
    fetch: typeof fetch;
  }>
): Promise<VerifiableCredential & DatasetCore> {
  const vcStore = await responseToVcStore(response, vcUrl, options);
  return getVerifiableCredentialFromStore(vcStore, vcUrl);
}

/**
 * Dereference a VC URL, and verify that the resulting content is valid.
 *
 * @param vcUrl The URL of the VC.
 * @param options Options to customize the function behavior.
 * - options.fetch: Specify a WHATWG-compatible authenticated fetch.
 * @returns The dereferenced VC if valid. Throws otherwise.
 * @since 0.4.0
 */
export async function getVerifiableCredential(
  vcUrl: UrlString,
  options?: Partial<{
    fetch: typeof fetch;
  }>
): Promise<VerifiableCredential & DatasetCore> {
  const authFetch = options?.fetch ?? uniFetch;
  const response = await authFetch(vcUrl);
  return getVerifiableCredentialFromResponse(response, vcUrl, options);
}
