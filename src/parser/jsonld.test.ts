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

import { jest, it, describe, expect, beforeAll } from "@jest/globals";
import { Response } from "@inrupt/universal-fetch";
import type * as UniversalFetch from "@inrupt/universal-fetch";
import { DataFactory as DF } from "n3";
import { isomorphic } from "rdf-isomorphic";
import type { JsonLdContextNormalized } from "jsonld-context-parser";
import { jsonLdResponseToStore, jsonLdToStore, getVcContext } from "./jsonld";

const fetcher: (typeof UniversalFetch)["fetch"] = async (url) => {
  if (url !== "https://example.com/myContext") {
    throw new Error("Unexpected URL");
  }

  return new Response(
    JSON.stringify({
      "@context": {
        Person: "http://xmlns.com/foaf/0.1/Person",
        xsd: "http://www.w3.org/2001/XMLSchema#",
        name: "http://xmlns.com/foaf/0.1/name",
        nickname: "http://xmlns.com/foaf/0.1/nick",
        affiliation: "http://schema.org/affiliation",
      },
    }),
    {
      headers: new Headers([["content-type", "application/ld+json"]]),
    }
  );
};

jest.mock("@inrupt/universal-fetch", () => {
  const fetchModule = jest.requireActual(
    "@inrupt/universal-fetch"
  ) as typeof UniversalFetch;
  return {
    ...fetchModule,
    fetch: jest.fn<(typeof UniversalFetch)["fetch"]>(),
  };
});

const data = {
  "@context": "https://www.w3.org/2018/credentials/v1",
  id: "https://some.example#credential",
  type: ["VerifiableCredential"],
  issuer: "https://some.example",
};

const dataExampleContext = {
  "@context": [
    "https://www.w3.org/2018/credentials/v1",
    "https://example.com/myContext",
  ],
  id: "https://some.example#credential",
  name: "Inrupt",
};

const result = [
  DF.quad(
    DF.namedNode("https://some.example#credential"),
    DF.namedNode("http://www.w3.org/1999/02/22-rdf-syntax-ns#type"),
    DF.namedNode("https://www.w3.org/2018/credentials#VerifiableCredential")
  ),
  DF.quad(
    DF.namedNode("https://some.example#credential"),
    DF.namedNode("https://www.w3.org/2018/credentials#issuer"),
    DF.namedNode("https://some.example")
  ),
];

describe("jsonLdResponseToStore", () => {
  it("converting fetch response to a store", async () => {
    const response = new Response(JSON.stringify(data));
    expect(
      isomorphic([...(await jsonLdResponseToStore(response))], result)
    ).toBe(true);
  });

  it("rejects on empty fetch response", async () => {
    await expect(jsonLdResponseToStore(new Response())).rejects.toThrow(
      "Empty response body. Expected JSON-LD."
    );
  });

  it("rejects on invalid JSON-LD", async () => {
    await expect(jsonLdResponseToStore(new Response("{"))).rejects.toThrow(
      "Error parsing JSON-LD: [Error: Unclosed document]."
    );
  });

  it("converting fetch response with custom context to a store", async () => {
    const response = new Response(JSON.stringify(dataExampleContext));
    expect(
      isomorphic(
        [...(await jsonLdResponseToStore(response, { fetch: fetcher }))],
        [
          DF.quad(
            DF.namedNode("https://some.example#credential"),
            DF.namedNode("http://xmlns.com/foaf/0.1/name"),
            DF.literal("Inrupt")
          ),
        ]
      )
    ).toBe(true);
  });
});

describe("jsonLdToStore", () => {
  it("converting valid POJO to store", async () => {
    expect(isomorphic([...(await jsonLdToStore(data))], result)).toBe(true);
  });
});

describe("getVcContext", () => {
  let context: JsonLdContextNormalized;

  beforeAll(async () => {
    context = await getVcContext();
  });

  it("should be able to compact and expand IRIs from the VC context", () => {
    expect(
      context.compactIri(
        "https://www.w3.org/2018/credentials#VerifiableCredential",
        true
      )
    ).toBe("VerifiableCredential");
    expect(context.expandTerm("VerifiableCredential", true)).toBe(
      "https://www.w3.org/2018/credentials#VerifiableCredential"
    );
  });

  it("should be able to compact and expand IRIs from the Inrupt context", () => {
    expect(context.compactIri("https://w3id.org/GConsent#Consent", true)).toBe(
      "Consent"
    );
    expect(context.expandTerm("Consent", true)).toBe(
      "https://w3id.org/GConsent#Consent"
    );
  });

  it("should not compact and expand IRIs not in the VC or Inrupt context", () => {
    expect(
      context.compactIri(
        "https://example.org/credentials#VerifiableCredential",
        true
      )
    ).toBe("https://example.org/credentials#VerifiableCredential");
    expect(context.expandTerm("VC", true)).toBe("VC");
  });
});
