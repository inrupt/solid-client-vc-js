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
import type { BlankNode, DatasetCore, Literal, NamedNode } from "@rdfjs/types";
import { DataFactory } from "n3";
import { type DatasetWithId } from "./common";
import { cred, dc, rdf, sec, xsd } from "./constants";
import { getSingleObject, lenientSingle } from "./rdfjs";

const { namedNode, defaultGraph } = DataFactory;

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
 * Get the subject of a Verifiable Credential.
 *
 * @example
 *
 * ```
 * const subject = getCredentialSubject(vc);
 * ```
 *
 * @param vc The Verifiable Credential
 * @returns The VC subject
 */
export function getCredentialSubject(vc: DatasetWithId): NamedNode {
  return getSingleObject<NamedNode>(
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
 * const issuer = getIssuer(vc);
 * ```
 *
 * @param vc The Verifiable Credential
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
 * const date = getIssuanceDate(vc);
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
 * Get the expiration date of a Verifiable Credential.
 *
 * @example
 *
 * ```
 * const date = getExpirationDate(vc);
 * ```
 *
 * @param vc The Verifiable Credential
 * @returns The expiration date, or undefined if none is found.
 */
export function getExpirationDate(vc: DatasetWithId): Date | undefined {
  const res = [
    ...vc.match(
      namedNode(getId(vc)),
      cred.expirationDate,
      undefined,
      defaultGraph(),
    ),
  ];

  if (res.length === 0) return undefined;

  if (res.length !== 1)
    throw new Error(`Expected 0 or 1 expiration date. Found ${res.length}.`);

  if (res[0].object.termType !== "Literal")
    throw new Error(
      `Expected expiration date to be a Literal. Found [${res[0].object.value}] of type [${res[0].object.termType}].`,
    );

  return wrapDate(res[0].object);
}

/**
 * @internal
 */
export function isDate(literal?: Literal): boolean {
  return (
    !!literal &&
    literal.datatype.equals(xsd.dateTime) &&
    !Number.isNaN(Date.parse(literal.value))
  );
}

export function isValidProof(
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
