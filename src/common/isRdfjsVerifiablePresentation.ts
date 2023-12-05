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
import type { BlankNode, DatasetCore, NamedNode } from "@rdfjs/types";
import { DataFactory } from "n3";
import { isUrl } from "./common";
import { cred, rdf } from "./constants";
import isRdfjsVerifiableCredential from "./isRdfjsVerifiableCredential";

const { defaultGraph } = DataFactory;

export function getHolder(
  dataset: DatasetCore,
  id: NamedNode | BlankNode,
): string {
  const holder = [...dataset.match(id, cred.holder, null, defaultGraph())];
  if (
    holder.length === 1 &&
    holder[0].object.termType === "NamedNode" &&
    isUrl(holder[0].object.value)
  ) {
    return holder[0].object.value;
  }

  throw new Error("Could not find a valid holder");
}

export function getVpSubject(data: DatasetCore) {
  const presentations = [
    ...data.match(null, rdf.type, cred.VerifiablePresentation, defaultGraph()),
  ];
  if (presentations.length !== 1) {
    throw new Error(
      `Expected exactly one Verifiable Presentation. Found ${presentations.length}.`,
    );
  }

  const { subject } = presentations[0];
  if (subject.termType !== "BlankNode" && subject.termType !== "NamedNode") {
    throw new Error(
      `Expected VP subject to be NamedNode or BlankNode. Instead found [${subject.value}] with termType [${subject.termType}]`,
    );
  }

  return subject;
}

export default function isRdfjsVerifiablePresentation(
  dataset: DatasetCore,
  id: NamedNode | BlankNode,
): boolean {
  for (const { object } of dataset.match(
    id,
    cred.verifiableCredential,
    null,
    defaultGraph(),
  )) {
    if (
      object.termType !== "NamedNode" ||
      !isRdfjsVerifiableCredential(dataset, object)
    ) {
      return false;
    }
  }

  const holder = [...dataset.match(id, cred.holder, null, defaultGraph())];
  return (
    (holder.length === 0 ||
      (holder.length === 1 &&
        holder[0].object.termType === "NamedNode" &&
        isUrl(holder[0].object.value))) &&
    // dataset.has(quad(id, rdf.type, cred.VerifiablePresentation, defaultGraph()))
    // FIXME: Replace with the above condition
    dataset.match(id, rdf.type, null, defaultGraph()).size >= 1
  );
}
