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
import type {
  Literal,
  DatasetCore,
  NamedNode,
  Term,
  BlankNode,
} from "@rdfjs/types";
import { DataFactory } from "n3";
import { getSingleObject } from "./rdfjs";
import { cred, xsd, dc, sec, rdf } from "./constants";

const { namedNode, defaultGraph, quad } = DataFactory;

export type DatasetWithId = DatasetCore & { id: string };

/**
 * Get the ID (URL) of a Verifiable Credential.
 *
 * @example
 *
 * ```
 * const id = getId(vc);
 * ```
 *
 * @param vc The Verifiable Credential
 * @returns The VC ID URL
 */
export function getId(vc: DatasetWithId): string {
  return vc.id;
}

/**
 * @internal
 */
export function getCredentialSubject(vc: DatasetWithId) {
  return getSingleObject(
    vc,
    namedNode(getId(vc)),
    cred.credentialSubject,
    "NamedNode",
  );
}

/**
 * Get the issuer of a Verifiable Credential.
 *
 * @example
 *
 * ```
 * const date = getIssuer(accessGrant);
 * ```
 *
 * @param vc The Access Grant/Request
 * @returns The VC issuer
 */
export function getIssuer(vc: DatasetWithId): string {
  return getSingleObject(vc, namedNode(getId(vc)), cred.issuer, "NamedNode")
    .value;
}

/**
 * @internal
 */
function wrapDate(date: Literal) {
  if (
    !date.datatype.equals(
      namedNode("http://www.w3.org/2001/XMLSchema#dateTime"),
    )
  ) {
    throw new Error(
      `Expected date to be a dateTime; recieved [${date.datatype.value}]`,
    );
  }
  if (Number.isNaN(Date.parse(date.value))) {
    throw new Error(`Found invalid value for date: [${date.value}]`);
  }
  return new Date(date.value);
}

/**
 * Get the issuance date of a Verifiable Credential.
 *
 * @example
 *
 * ```
 * const date = getIssuanceDate(accessGrant);
 * ```
 *
 * @param vc The Verifiable Credential
 * @returns The issuance date
 */
export function getIssuanceDate(vc: DatasetWithId): Date {
  return wrapDate(
    getSingleObject(vc, namedNode(getId(vc)), cred.issuanceDate, "Literal"),
  );
}

/**
 * @internal
 */
function lenientSingle<T extends Term>(
  dataset: DatasetCore,
  termTypes: T["termType"][] = ["NamedNode", "BlankNode"],
): T | undefined {
  const array = [...dataset];
  return array.length === 1 && termTypes.includes(array[0].object.termType)
    ? (array[0].object as T)
    : undefined;
}

/**
 * @internal
 */
function isDate(literal?: Literal): boolean {
  return (
    !!literal &&
    literal.datatype.equals(xsd.dateTime) &&
    !Number.isNaN(Date.parse(literal.value))
  );
}

function isValidProof(
  dataset: DatasetCore,
  proof: NamedNode | BlankNode,
): boolean {
  return (
    isDate(
      lenientSingle<Literal>(dataset.match(null, dc.created, null, proof), [
        "Literal",
      ]),
    ) &&
    lenientSingle<Literal>(dataset.match(null, sec.proofValue, null, proof), [
      "Literal",
    ]) !== undefined &&
    lenientSingle<NamedNode>(
      dataset.match(null, sec.proofPurpose, null, proof),
      ["NamedNode"],
    ) !== undefined &&
    lenientSingle<NamedNode>(
      dataset.match(null, sec.verificationMethod, null, proof),
      ["NamedNode"],
    ) !== undefined &&
    lenientSingle<NamedNode>(dataset.match(null, rdf.type, null, proof), [
      "NamedNode",
    ]) !== undefined
  );
}

export function isVerifiableCredential(
  dataset: DatasetCore,
  id: NamedNode,
): boolean {
  const proof = lenientSingle<NamedNode | BlankNode>(
    dataset.match(id, sec.proof, null, defaultGraph()),
  );
  return (
    !!proof &&
    isValidProof(dataset, proof) &&
    !!lenientSingle<NamedNode>(
      dataset.match(id, cred.issuer, null, defaultGraph()),
      ["NamedNode"],
    ) &&
    isDate(
      lenientSingle<Literal>(
        dataset.match(id, cred.issuanceDate, null, defaultGraph()),
        ["Literal"],
      ),
    ) &&
    !!lenientSingle<NamedNode>(
      dataset.match(id, cred.credentialSubject, null, defaultGraph()),
      ["NamedNode"],
    ) &&
    dataset.has(quad(id, rdf.type, cred.VerifiableCredential, defaultGraph()))
  );
}

export function isVerifiablePresentation(
  dataset: DatasetCore,
  id: NamedNode,
): boolean {
  for (const { object } of dataset.match(
    id,
    cred.verifiableCredential,
    null,
    defaultGraph(),
  )) {
    if (
      object.termType !== "NamedNode" ||
      !isVerifiableCredential(dataset, object)
    ) {
      return false;
    }
  }

  return (
    lenientSingle<NamedNode>(
      dataset.match(id, cred.holder, null, defaultGraph()),
      ["NamedNode"],
    ) !== undefined &&
    dataset.has(quad(id, rdf.type, cred.VerifiablePresentation, defaultGraph()))
  );
}
