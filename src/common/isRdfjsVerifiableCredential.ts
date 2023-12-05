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
import { cred, rdf, sec } from "./constants";
import { lenientSingle } from "./rdfjs";
import { isValidProof, isDate } from "./getters";

const { defaultGraph, quad } = DataFactory;

/**
 * Verifies that a given JSON-LD payload conforms to the Verifiable Credential
 * schema we expect.
 * @param data The JSON-LD payload as an RDFJS dataset
 * @param id The id of the VerifiableCredential as a Named Node
 * @returns true is the payload matches our expectation.
 * @deprecated Use isRdfjsVerifiableCredential instead
 */
export default function isRdfjsVerifiableCredential(
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
