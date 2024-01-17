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

export { default as issueVerifiableCredential } from "./issue/issue";
export type {
  DatasetWithId,
  Iri,
  JsonLd,
  VerifiableCredential,
  VerifiableCredentialBase,
  VerifiableCredentialApiConfiguration,
} from "./common/common";
export {
  isVerifiableCredential,
  isVerifiablePresentation,
  getVerifiableCredential,
  getVerifiableCredentialApiConfiguration,
  /**
   * @hidden @deprecated
   */
  verifiableCredentialToDataset,
} from "./common/common";
export { default as getVerifiableCredentialAllFromShape } from "./lookup/derive";
export { query } from "./lookup/query";
export type {
  QueryByExample,
  VerifiablePresentationRequest,
} from "./lookup/query";
export { revokeVerifiableCredential } from "./revoke/revoke";
export { isValidVc, isValidVerifiablePresentation } from "./verify/verify";
export {
  getId,
  getIssuanceDate,
  getIssuer,
  getCredentialSubject,
  getExpirationDate,
} from "./common/getters";
export { default as isRdfjsVerifiableCredential } from "./common/isRdfjsVerifiableCredential";
export { default as isRdfjsVerifiablePresentation } from "./common/isRdfjsVerifiablePresentation";
