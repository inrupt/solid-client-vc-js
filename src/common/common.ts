//
// Copyright 2022 Inrupt Inc.
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

import {
  getIri,
  getSolidDataset,
  getThingAll,
  UrlString,
  getJsonLdParser,
} from "@inrupt/solid-client";
import { Util } from "jsonld-streaming-serializer";
import { fetch as uniFetch } from "@inrupt/universal-fetch";
import { Store, DataFactory as DF } from "n3";
import { Term, DatasetCore, Quad } from "@rdfjs/types";
import { getVcContext, jsonLdResponseToStore } from "../parser/jsonld";
import parse from "content-type";

export type Iri = string;

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
export type VerifiableCredential = {
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

export type VerifiablePresentation = {
  id?: string;
  type: string | string[];
  verifiableCredential?: VerifiableCredential[];
  holder?: string;
  proof?: Proof;
};

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

const VC = "https://www.w3.org/2018/credentials#";
const RDF = "http://www.w3.org/1999/02/22-rdf-syntax-ns#";
const XSD = "http://www.w3.org/2001/XMLSchema#";
const SEC = "https://w3id.org/security#";
const CRED = "https://www.w3.org/2018/credentials#";

/**
 * @param response Takes a response from a VC service and checks that it has the correct status and content type
 * @param vcUrl The URL of the VC
 * @returns The input response
 */
function validateVcResponse(response: globalThis.Response, vcUrl: string): globalThis.Response {
  if (!response.ok) {
    throw new Error(
      `Fetching the Verifiable Credential [${vcUrl}] failed: ${response.status} ${response.statusText}`
    );
  }

  const contentType = response.headers.get("Content-Type");

  if (!contentType) {
    throw new Error(`Fetching the Verifiable Credential [${vcUrl}] failed: Response does not have a Content-Type header; expected application/ld+json`)
  }

  const parsedContentType = parse.parse(contentType);
  const [mediaType, subtypesString] = parsedContentType.type.split("/");
  const subtypes = subtypesString.split('+');

  if (mediaType !== "application" || !subtypes.includes('ld') || !subtypes.includes('json')) {
    throw new Error(`Fetching the Verifiable Credential [${vcUrl}] failed: Response has an unsupported Content-Type header; expected application/ld+json`)
  }

  return response;
}

async function fetchVcStore(
  vcUrl: UrlString,
  options?: Partial<{
    fetch: typeof fetch;
  }>
): Promise<Store> {
  const authFetch = options?.fetch ?? uniFetch;
  // FIXME: See if we need content negotiation here
  const response = validateVcResponse(await authFetch(vcUrl), vcUrl);

  try {
    return await jsonLdResponseToStore(response, { fetch: authFetch });
  } catch (e) {
    throw new Error(
      `Parsing the Verifiable Credential [${vcUrl}] as JSON-LD failed: ${e}`
    );
  }
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
  const vcStore = await fetchVcStore(vcUrl, options);
  const context = await getVcContext();

  const vcs = vcStore.getSubjects(
    `${RDF}type`,
    `${VC}VerifiableCredential`,
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
  for (const t of vcStore.getObjects(vc, `${RDF}type`, DF.defaultGraph())) {
    if (t.termType !== "NamedNode") {
      throw new Error(
        `Expected all VC types to be Named Nodes but received [${t.value}] of termType [${t.termType}]`
      );
    }

    const compact = context.compactIri(t.value, true);

    if (/^[a-z]+$/i.test(compact))
      type.push(compact);
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
    termType = "NamedNode"
  ) {
    const object = getSingleObject(fullProperty, subject, graph);

    if (object.termType !== termType) {
      throw new Error(
        `Expected property [${fullProperty}] of the Verifiable Credential [${vc.value}] to be a ${termType}, received: ${object.termType}`
      );
    }

    // TODO: Make sure that Literals with URIs are correclty handled here
    return object.value;
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
    if (!object.datatype.equals(DF.namedNode(`${XSD}dateTime`))) {
      throw new Error(
        `Expected issuanceDate to have dataType [${XSD}dateTime], received: [${object.datatype.value}]`
      );
    }

    return object.value;
  }

  // The proof lives within a named graph
  const proofGraph = getSingleObject(`${SEC}proof`);
  const proofs = vcStore.getSubjects(null, null, proofGraph);

  if (proofs.length !== 1) {
    throw new Error(
      `Expected exactly one proof to live in the proofs graph, received ${proofs.length}`
    );
  }

  const [proof] = proofs;
  function getProperties(subject: Term, writtenTerms: string[] = []) {
    const object: Record<string, unknown> = {};

    for (const predicate of vcStore.getPredicates(
      subject,
      null,
      DF.defaultGraph()
    )) {
      if (predicate.termType !== "NamedNode") {
        throw new Error("Predicate must be a named node")
      }

      const compact = context.compactIri(predicate.value, true);
      if (/^[a-z]+$/i.test(compact)) {
        const objects: any[] = vcStore.getObjects(
          subject,
          predicate,
          DF.defaultGraph()
        ).map(object => writeObject(object, writtenTerms))
          .filter(object => typeof object !== "object" || Object.keys(object).length > 1)

        if (objects.length === 1) {
          object[compact] = objects[0]
        } else if (objects.length > 1) {
          object[compact] = objects
        }
      }
    }

    return object;
  }

  function writeObject(object: Term, writtenTerms: string[] = []) {
    switch (object.termType) {
      case "BlankNode":
        return writtenTerms.includes(object.value)
          ? {}
          : getProperties(object, [...writtenTerms, object.value]);
      case "NamedNode":
        // TODO: See if we actually want to do compacting here
        // given how ConsentStatusExplicitlyGiven as the full
        // URI in e2e tests, and this may make it look like a
        // literal
        return context.compactIri(object.value, true);
      case "Literal":
        return Util.termToValue(object, context);
      default:
        throw new Error("Unexpected term type")
    }
  }

  const credentialSubject = getSingleObjectOfTermType(`${CRED}credentialSubject`);
  return {
    id: vc.value,
    // It is possible to have multiple claims in a credential subject
    // we do not support this
    // https://www.w3.org/TR/vc-data-model/#example-specifying-multiple-subjects-in-a-verifiable-credential
    credentialSubject: {
      ...getProperties(DF.namedNode(credentialSubject)),
      id: credentialSubject
    },
    issuer: getSingleObjectOfTermType(`${CRED}issuer`),
    issuanceDate: getSingleDateTime(`${CRED}issuanceDate`),
    type,
    proof: {
      created: getSingleDateTime(
        "http://purl.org/dc/terms/created",
        proof,
        proofGraph
      ),
      proofPurpose: getSingleObjectOfTermType(
        `${SEC}proofPurpose`,
        proof,
        proofGraph
      ),
      type: getSingleObjectOfTermType(`${RDF}type`, proof, proofGraph),
      verificationMethod: getSingleObjectOfTermType(
        `${SEC}verificationMethod`,
        proof,
        proofGraph
      ),
      proofValue: getSingleObjectOfTermType(
        `${SEC}proofValue`,
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
      // @ts-ignore
      return vcStore.match(subject, predicate, object, graph);
    },
    add(quad) {
      throw new Error("Cannot mutate this dataset");
    },
    delete(quad) {
      throw new Error("Cannot mutate this dataset");
    },
    get size() {
      return vcStore.size;
    }
  };
}
