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
