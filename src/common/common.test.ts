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

import { describe, it, expect } from "@jest/globals";
import { isVerifiableCredential } from "./common";
import {
  defaultCredentialClaims,
  mockPartialCredential,
  mockDefaultCredential,
} from "./common.mock";

describe("isVerifiableCredential", () => {
  it("returns true if all the expected fields are present in the credential", () => {
    expect(isVerifiableCredential(mockDefaultCredential())).toBe(true);
  });

  describe("returns false if", () => {
    it.each([
      ["id"],
      ["type"],
      ["issuer"],
      ["issuanceDate"],
      ["subjectId"],
      ["proofType"],
      ["proofCreated"],
      ["proofVerificationMethod"],
      ["proofPurpose"],
      ["proofValue"],
    ])("is missing field %s", (entry) => {
      expect(
        isVerifiableCredential(
          mockPartialCredential({
            ...defaultCredentialClaims,
            [`${entry}`]: undefined,
          })
        )
      ).toBe(false);
    });

    it("misses a credential subject", () => {
      const mockedCredential = mockDefaultCredential();
      delete (mockedCredential as {
        credentialSubject: undefined | Record<string, unknown>;
      }).credentialSubject;
      expect(isVerifiableCredential(mockedCredential)).toBe(false);
    });

    it("misses a proof", () => {
      const mockedCredential = mockDefaultCredential();
      delete (mockedCredential as {
        proof: undefined | Record<string, unknown>;
      }).proof;
      expect(isVerifiableCredential(mockedCredential)).toBe(false);
    });

    it("has an unexpected date format for the issuance", () => {
      expect(
        isVerifiableCredential(
          mockPartialCredential({
            ...defaultCredentialClaims,
            issuanceDate: "Not a date",
          })
        )
      ).toBe(false);
    });

    it("has an unexpected date format for the proof creation", () => {
      expect(
        isVerifiableCredential(
          mockPartialCredential({
            ...defaultCredentialClaims,
            proofCreated: "Not a date",
          })
        )
      ).toBe(false);
    });
  });
});
