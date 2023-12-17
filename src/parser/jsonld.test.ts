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

import { describe, expect, it } from "@jest/globals";
import { DataFactory as DF } from "n3";
import { isomorphic } from "rdf-isomorphic";
import {
  CachedFetchDocumentLoader,
  CachingContextParser,
  jsonLdToStore,
} from "./jsonld";

const data = {
  "@context": "https://www.w3.org/2018/credentials/v1",
  id: "https://some.example#credential",
  type: ["VerifiableCredential"],
  issuer: "https://some.example",
};

const result = [
  DF.quad(
    DF.namedNode("https://some.example#credential"),
    DF.namedNode("http://www.w3.org/1999/02/22-rdf-syntax-ns#type"),
    DF.namedNode("https://www.w3.org/2018/credentials#VerifiableCredential"),
  ),
  DF.quad(
    DF.namedNode("https://some.example#credential"),
    DF.namedNode("https://www.w3.org/2018/credentials#issuer"),
    DF.namedNode("https://some.example"),
  ),
];

describe("jsonLdToStore", () => {
  it("converting valid POJO to store", async () => {
    expect(isomorphic([...(await jsonLdToStore(data))], result)).toBe(true);
  });
});

describe("CachingContextParser", () => {
  it("should return the same object parsing the same context multiple times", async () => {
    const contextParser = new CachingContextParser({
      documentLoader: new CachedFetchDocumentLoader(),
    });
    await expect(
      contextParser.parse("https://w3id.org/vc/status-list/2021/v1"),
    ).resolves.toEqual(
      await contextParser.parse("https://w3id.org/vc/status-list/2021/v1"),
    );

    await expect(
      contextParser.parse({ ex: "http://example.org" }),
    ).resolves.toEqual(await contextParser.parse({ ex: "http://example.org" }));

    await expect(
      contextParser.parse([
        "https://w3id.org/vc/status-list/2021/v1",
        { ex: "http://example.org" },
      ]),
    ).resolves.toEqual(
      await contextParser.parse([
        "https://w3id.org/vc/status-list/2021/v1",
        { ex: "http://example.org" },
      ]),
    );

    await expect(
      contextParser.parse(
        [
          "https://w3id.org/vc/status-list/2021/v1",
          { ex: "http://example.org" },
        ],
        {
          parentContext: undefined,
        },
      ),
    ).resolves.toEqual(
      await contextParser.parse([
        "https://w3id.org/vc/status-list/2021/v1",
        { ex: "http://example.org" },
      ]),
    );

    await expect(
      contextParser.parse(
        [
          "https://w3id.org/vc/status-list/2021/v1",
          { ex: "http://example.org" },
        ],
        {
          parentContext: {},
        },
      ),
    ).resolves.toEqual(
      await contextParser.parse([
        "https://w3id.org/vc/status-list/2021/v1",
        { ex: "http://example.org" },
      ]),
    );

    await expect(
      contextParser.parse([
        "https://w3id.org/vc/status-list/2021/v1",
        { ex: "http://example.org" },
      ]),
    ).resolves.toEqual(
      await contextParser.parse(
        [
          "https://w3id.org/vc/status-list/2021/v1",
          { ex: "http://example.org" },
        ],
        {
          parentContext: {},
        },
      ),
    );

    await expect(
      contextParser.parse([
        "https://w3id.org/vc/status-list/2021/v1",
        { ex: "http://example.org" },
      ]),
    ).resolves.not.toEqual(
      await contextParser.parse(
        [
          "https://w3id.org/vc/status-list/2021/v1",
          { ex: "http://example.org" },
        ],
        {
          parentContext: {
            "@base": "http://example.org/test",
          },
        },
      ),
    );
  });
});
