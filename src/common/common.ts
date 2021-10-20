/**
 * Copyright 2021 Inrupt Inc.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal in
 * the Software without restriction, including without limitation the rights to use,
 * copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the
 * Software, and to permit persons to whom the Software is furnished to do so,
 * subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED,
 * INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A
 * PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
 * HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
 * OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
 * SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

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
  type: string[];
  verifiableCredential?: VerifiableCredential[];
  holder?: string;
  proof?: Proof;
};

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
  let result: unknown[] = [];
  contexts.forEach((additionalContext) => {
    // Case when the context is an array of IRIs and/or inline contexts
    if (Array.isArray(additionalContext)) {
      result = result.concat(additionalContext);
    } else {
      // Case when the context is a single remote URI or a single inline context
      result.push(additionalContext);
    }
  });
  return result;
}

/**
 * This context contains the required elements to build a valid VC issuance request.
 */
export const defaultContext = ["https://www.w3.org/2018/credentials/v1"];

export const defaultCredentialTypes = [
  "VerifiableCredential",
  "SolidCredential",
];
