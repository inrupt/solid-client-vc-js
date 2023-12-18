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

import { beforeAll, describe, expect, it } from "@jest/globals";
import { Store, DataFactory } from "n3";
import type { VerifiableCredential, DatasetWithId } from "./common";
import { verifiableCredentialToDataset } from "./common";
import { cred, xsd } from "./constants";
import { mockDefaultCredential } from "./common.mock";
import {
  getCredentialSubject,
  getExpirationDate,
  getId,
  getIssuanceDate,
  getIssuer,
} from "./getters";

const { quad, namedNode, blankNode, literal } = DataFactory;

describe("getters", () => {
  let defaultCredential: VerifiableCredential;
  let defaultCredentialNoProperties: DatasetWithId;

  beforeAll(async () => {
    defaultCredential = await verifiableCredentialToDataset(
      mockDefaultCredential(),
      {
        includeVcProperties: true,
      },
    );
    defaultCredentialNoProperties = await verifiableCredentialToDataset(
      mockDefaultCredential(),
    );
  });

  it("getId", () => {
    expect(getId(defaultCredential)).toBe(defaultCredential.id);
    expect(getId(defaultCredentialNoProperties)).toBe(defaultCredential.id);
  });

  it("getIssuanceDate", () => {
    expect(getIssuanceDate(defaultCredential)).toStrictEqual(
      new Date(defaultCredential.issuanceDate),
    );
    expect(getIssuanceDate(defaultCredentialNoProperties)).toStrictEqual(
      new Date(defaultCredential.issuanceDate),
    );
  });

  it("getIssuanceDate errors if issuance date is not a literal", () => {
    const results = Object.assign(
      new Store([
        ...[...defaultCredential].filter(
          (quadTerm) => !quadTerm.predicate.equals(cred.issuanceDate),
        ),
        quad(
          namedNode(defaultCredential.id),
          cred.issuanceDate,
          namedNode("http://example.org/not/a/date"),
        ),
      ]),
      { id: defaultCredential.id },
    );

    expect(() => getIssuanceDate(results)).toThrow(
      "Expected [http://example.org/not/a/date] to be a Literal. Found [NamedNode]",
    );
  });

  it("getIssuanceDate errors if issuance date is not of type dateTime", () => {
    const results = Object.assign(
      new Store([
        ...[...defaultCredential].filter(
          (quadTerm) => !quadTerm.predicate.equals(cred.issuanceDate),
        ),
        quad(
          namedNode(defaultCredential.id),
          cred.issuanceDate,
          literal("not a dateTime"),
        ),
      ]),
      { id: defaultCredential.id },
    );

    expect(() => getIssuanceDate(results)).toThrow(
      "Expected date to be a dateTime; recieved [http://www.w3.org/2001/XMLSchema#string]",
    );
  });

  it("getIssuanceDate errors if issuance date is a dateTime but has an invalid value for date", () => {
    const results = Object.assign(
      new Store([
        ...[...defaultCredential].filter(
          (quadTerm) => !quadTerm.predicate.equals(cred.issuanceDate),
        ),
        quad(
          namedNode(defaultCredential.id),
          cred.issuanceDate,
          literal("not a dateTime", xsd.dateTime),
        ),
      ]),
      { id: defaultCredential.id },
    );

    expect(() =>
      getIssuanceDate(results as unknown as VerifiableCredential),
    ).toThrow("Found invalid value for date: [not a dateTime]");
  });

  describe("getExpirationDate", () => {
    it("returns undefined if there is no expiration date", () => {
      expect(getExpirationDate(defaultCredential)).toBeUndefined();
      expect(getExpirationDate(defaultCredentialNoProperties)).toBeUndefined();
    });

    it("gets the access expiration date", async () => {
      const expirationDate = new Date(Date.now()).toString();
      const credential = await verifiableCredentialToDataset({
        ...mockDefaultCredential(),
        expirationDate,
      });
      expect(getExpirationDate(credential)).toStrictEqual(
        new Date(expirationDate),
      );
    });

    it("errors if the expiration date is a NamedNode", () => {
      const store = Object.assign(new Store([...defaultCredential]), {
        id: defaultCredential.id,
      });

      store.addQuad(
        namedNode(getId(defaultCredential)),
        cred.expirationDate,
        namedNode("http://example.org/this/is/a/date"),
      );

      expect(() => getExpirationDate(store)).toThrow(
        "Expected expiration date to be a Literal. Found [http://example.org/this/is/a/date] of type [NamedNode].",
      );
    });

    it("errors if there are multiple expiration dates", () => {
      const store = Object.assign(new Store([...defaultCredential]), {
        id: defaultCredential.id,
      });

      store.addQuad(
        namedNode(getId(defaultCredential)),
        cred.expirationDate,
        literal(new Date(1700820377111).toString(), xsd.dateTime),
      );

      store.addQuad(
        namedNode(getId(defaultCredential)),
        cred.expirationDate,
        literal(new Date(1700820300000).toString(), xsd.dateTime),
      );

      expect(() => getExpirationDate(store)).toThrow(
        "Expected 0 or 1 expiration date. Found 2.",
      );
    });

    it("errors if the expiration date is a literal without xsd:type", async () => {
      const store = Object.assign(new Store([...defaultCredential]), {
        id: defaultCredential.id,
      });

      store.addQuad(
        namedNode(getId(defaultCredential)),
        cred.expirationDate,
        literal("boo"),
      );

      expect(() => getExpirationDate(store)).toThrow(
        "Expected date to be a dateTime; recieved [http://www.w3.org/2001/XMLSchema#string]",
      );
    });
  });

  it("getIssuer", () => {
    expect(getIssuer(defaultCredential)).toStrictEqual(
      defaultCredential.issuer,
    );
    expect(getIssuer(defaultCredentialNoProperties)).toStrictEqual(
      defaultCredential.issuer,
    );
  });

  it("getCredentialSubject", () => {
    expect(getCredentialSubject(defaultCredential).value).toStrictEqual(
      defaultCredential.credentialSubject.id,
    );
    expect(getCredentialSubject(defaultCredential).termType).toBe("NamedNode");

    expect(
      getCredentialSubject(defaultCredentialNoProperties).value,
    ).toStrictEqual(defaultCredential.credentialSubject.id);
    expect(getCredentialSubject(defaultCredentialNoProperties).termType).toBe(
      "NamedNode",
    );
  });

  it("getCredentialSubject errors if there are multiple credential subjects", () => {
    const results = Object.assign(
      new Store([
        ...defaultCredential,
        quad(
          namedNode(defaultCredential.id),
          cred.credentialSubject,
          namedNode("http://example.org/my/second/subject"),
        ),
      ]),
      { id: defaultCredential.id },
    );

    expect(() =>
      getCredentialSubject(results as unknown as VerifiableCredential),
    ).toThrow("Expected exactly one result. Found 2.");
  });

  it("getCredentialSubject errors if object is a Blank Node", () => {
    const results = Object.assign(
      new Store([
        ...[...defaultCredential].filter(
          (quadTerm) => !quadTerm.predicate.equals(cred.credentialSubject),
        ),
        quad(
          namedNode(defaultCredential.id),
          cred.credentialSubject,
          blankNode(),
        ),
      ]),
      { id: defaultCredential.id },
    );

    expect(() =>
      getCredentialSubject(results as unknown as VerifiableCredential),
    ).toThrow("Expected [n3-0] to be a NamedNode. Found [BlankNode]");
  });
});
