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
  proof: {
    type: string;
    /**
     * ISO-8601 formatted date
     */
    created: string;
    verificationMethod: string;
    proofPurpose: string;
    proofValue: string;
  };
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
