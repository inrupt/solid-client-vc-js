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
import type { DatasetCore, Term } from "@rdfjs/types";
import { DataFactory } from "n3";

const { defaultGraph } = DataFactory;

/**
 * @internal
 */
export function getSingleObject<T extends Term>(
  vc: DatasetCore,
  subject: Term,
  predicate: Term,
  type: Term["termType"],
): T;
export function getSingleObject<T extends Term>(
  vc: DatasetCore,
  subject: Term,
  predicate: Term,
  type?: T["termType"],
): T {
  const results = [...vc.match(subject, predicate, null, defaultGraph())];

  if (results.length !== 1) {
    throw new Error(`Expected exactly one result. Found ${results.length}.`);
  }

  const [{ object }] = results;
  const expectedTypes = [type];
  if (!expectedTypes.includes(object.termType)) {
    throw new Error(
      `Expected [${object.value}] to be a ${expectedTypes.join(
        " or ",
      )}. Found [${object.termType}]`,
    );
  }

  return object as T;
}

/**
 * @internal
 */
export function lenientSingle<T extends Term>(
  dataset: DatasetCore,
  termTypes: T["termType"][] = ["NamedNode", "BlankNode"],
): T | undefined {
  const array = [...dataset];
  return array.length === 1 && termTypes.includes(array[0].object.termType)
    ? (array[0].object as T)
    : undefined;
}
