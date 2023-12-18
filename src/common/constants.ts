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
import { DataFactory } from "n3";
import { rdf as _rdf } from "rdf-namespaces";

const { namedNode } = DataFactory;

const SEC = "https://w3id.org/security#";
const CRED = "https://www.w3.org/2018/credentials#";
const XSD = "http://www.w3.org/2001/XMLSchema#";
const DC = "http://purl.org/dc/terms/";

export const rdf = {
  type: namedNode(_rdf.type),
};

export const xsd = {
  boolean: namedNode(`${XSD}boolean`),
  dateTime: namedNode(`${XSD}dateTime`),
};

export const cred = {
  issuanceDate: namedNode(`${CRED}issuanceDate`),
  expirationDate: namedNode(`${CRED}expirationDate`),
  issuer: namedNode(`${CRED}issuer`),
  credentialSubject: namedNode(`${CRED}credentialSubject`),
  verifiableCredential: namedNode(`${CRED}verifiableCredential`),
  holder: namedNode(`${CRED}holder`),
  VerifiableCredential: namedNode(`${CRED}VerifiableCredential`),
  VerifiablePresentation: namedNode(`${CRED}VerifiablePresentation`),
};
export const sec = {
  proof: namedNode(`${SEC}proof`),
  proofPurpose: namedNode(`${SEC}proofPurpose`),
  proofValue: namedNode(`${SEC}proofValue`),
  verificationMethod: namedNode(`${SEC}verificationMethod`),
};

export const dc = {
  created: namedNode(`${DC}created`),
};
