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
import { describe, it, expect } from "@jest/globals";
import * as packageExports from "./index";
import issueVerifiableCredential from "./issue/issue";
import {
  isVerifiableCredential,
  isVerifiablePresentation,
  getVerifiableCredential,
  getVerifiableCredentialApiConfiguration,
  verifiableCredentialToDataset,
} from "./common/common";
import {
  getId,
  getCredentialSubject,
  getExpirationDate,
  getIssuanceDate,
  getIssuer,
} from "./common/getters";
import getVerifiableCredentialAllFromShape from "./lookup/derive";
import revokeVerifiableCredential from "./revoke/revoke";
import { isValidVc, isValidVerifiablePresentation } from "./verify/verify";
import { query } from "./lookup/query";
import isRdfjsVerifiableCredential from "./common/isRdfjsVerifiableCredential";
import isRdfjsVerifiablePresentation from "./common/isRdfjsVerifiablePresentation";

describe("exports", () => {
  it("includes all of the expected functions", () => {
    expect(Object.keys(packageExports)).toEqual([
      "issueVerifiableCredential",
      "isVerifiableCredential",
      "isVerifiablePresentation",
      "getVerifiableCredential",
      "getVerifiableCredentialApiConfiguration",
      "verifiableCredentialToDataset",
      "getVerifiableCredentialAllFromShape",
      "query",
      "revokeVerifiableCredential",
      "isValidVc",
      "isValidVerifiablePresentation",
      "getId",
      "getIssuanceDate",
      "getIssuer",
      "getCredentialSubject",
      "getExpirationDate",
      "isRdfjsVerifiableCredential",
      "isRdfjsVerifiablePresentation",
    ]);
    expect(packageExports.issueVerifiableCredential).toBe(
      issueVerifiableCredential,
    );
    expect(packageExports.isVerifiableCredential).toBe(isVerifiableCredential);
    expect(packageExports.isVerifiablePresentation).toBe(
      isVerifiablePresentation,
    );
    expect(packageExports.getVerifiableCredential).toBe(
      getVerifiableCredential,
    );
    expect(packageExports.getVerifiableCredentialApiConfiguration).toBe(
      getVerifiableCredentialApiConfiguration,
    );
    expect(packageExports.getVerifiableCredentialAllFromShape).toBe(
      getVerifiableCredentialAllFromShape,
    );
    expect(packageExports.verifiableCredentialToDataset).toBe(
      verifiableCredentialToDataset,
    );
    expect(packageExports.revokeVerifiableCredential).toBe(
      revokeVerifiableCredential,
    );
    expect(packageExports.isValidVc).toBe(isValidVc);
    expect(packageExports.isValidVerifiablePresentation).toBe(
      isValidVerifiablePresentation,
    );
    expect(packageExports.query).toBe(query);
    expect(packageExports.getId).toBe(getId);
    expect(packageExports.getIssuanceDate).toBe(getIssuanceDate);
    expect(packageExports.getIssuer).toBe(getIssuer);
    expect(packageExports.getExpirationDate).toBe(getExpirationDate);
    expect(packageExports.getCredentialSubject).toBe(getCredentialSubject);
    expect(packageExports.isRdfjsVerifiableCredential).toBe(
      isRdfjsVerifiableCredential,
    );
    expect(packageExports.isRdfjsVerifiablePresentation).toBe(
      isRdfjsVerifiablePresentation,
    );
  });
});
