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
import { jest, describe, it, expect } from "@jest/globals";
import { Response } from "@inrupt/universal-fetch";
import type * as UniversalFetch from "@inrupt/universal-fetch";
import { isomorphic } from "rdf-isomorphic";
import { DataFactory, Store } from "n3";
import type { VerifiableCredential } from "./common";
import {
  concatenateContexts,
  getVerifiableCredential,
  getVerifiableCredentialFromResponse,
  getVerifiableCredentialFromStore,
  isVerifiableCredential,
  isVerifiablePresentation,
  normalizeVc,
} from "./common";
import {
  defaultCredentialClaims,
  mockPartialCredential,
  mockDefaultCredential,
  mockDefaultPresentation,
  mockPartialPresentation,
  defaultVerifiableClaims,
  mockDefaultCredential2Proofs,
} from "./common.mock";
import { jsonLdStringToStore, jsonLdToStore } from "../parser/jsonld";

jest.mock("@inrupt/universal-fetch", () => {
  const fetchModule = jest.requireActual(
    "@inrupt/universal-fetch",
  ) as typeof UniversalFetch;
  return {
    ...fetchModule,
    fetch: jest.fn<(typeof UniversalFetch)["fetch"]>(() => {
      throw new Error("Fetch should not be called");
    }),
  };
});

describe("normalizeVc", () => {
  it("returns the same object", () => {
    const obj = {};
    expect(normalizeVc(obj)).toEqual(obj);
  });
});

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
          }),
        ),
      ).toBe(false);
    });

    it("misses a credential subject", () => {
      const mockedCredential = mockDefaultCredential();
      delete (
        mockedCredential as {
          credentialSubject: undefined | Record<string, unknown>;
        }
      ).credentialSubject;
      expect(isVerifiableCredential(mockedCredential)).toBe(false);
    });

    it("misses a proof", () => {
      const mockedCredential = mockDefaultCredential();
      delete (
        mockedCredential as {
          proof: undefined | Record<string, unknown>;
        }
      ).proof;
      expect(isVerifiableCredential(mockedCredential)).toBe(false);
    });

    it("has an unexpected date format for the issuance", () => {
      expect(
        isVerifiableCredential(
          mockPartialCredential({
            ...defaultCredentialClaims,
            issuanceDate: "Not a date",
          }),
        ),
      ).toBe(false);
    });

    it("has an unexpected date format for the proof creation", () => {
      expect(
        isVerifiableCredential(
          mockPartialCredential({
            ...defaultCredentialClaims,
            proofCreated: "Not a date",
          }),
        ),
      ).toBe(false);
    });
  });
});

describe("isVerifiablePresentation", () => {
  describe("returns true", () => {
    it("has all the expected fields are present in the credential", () => {
      expect(isVerifiablePresentation(mockDefaultPresentation())).toBe(true);
    });

    it("has no associated credentials", () => {
      expect(isVerifiablePresentation(mockDefaultPresentation([]))).toBe(true);
    });

    it("has an URL shaped holder", () => {
      const mockedPresentation = mockDefaultPresentation();
      mockedPresentation.holder = "https://some.holder";
      expect(isVerifiablePresentation(mockedPresentation)).toBe(true);
    });

    it("is passed a correct VP with a single type", () => {
      const vp = JSON.parse(`{
        "@context": [
            "https://www.w3.org/2018/credentials/v1"
        ],
        "holder": "https://vc.dev-next.inrupt.com",
        "type": "VerifiablePresentation",
        "verifiableCredential": [
            {
                "@context": [
                    "https://www.w3.org/2018/credentials/v1",
                    "https://w3id.org/security/suites/ed25519-2020/v1",
                    "https://w3id.org/vc-revocation-list-2020/v1",
                    "https://consent.pod.inrupt.com/credentials/v1"
                ],
                "credentialStatus": {
                    "id": "https://vc.dev-next.inrupt.com/status/niiL#0",
                    "revocationListCredential": "https://vc.dev-next.inrupt.com/status/niiL",
                    "revocationListIndex": "0",
                    "type": "RevocationList2020Status"
                },
                "credentialSubject": {
                    "providedConsent": {
                        "mode": [
                            "http://www.w3.org/ns/auth/acl#Read"
                        ],
                        "hasStatus": "https://w3id.org/GConsent#ConsentStatusExplicitlyGiven",
                        "forPersonalData": [
                            "https://storage.dev-next.inrupt.com/8c6a313e-98ae-4eb2-9ab3-2df201d81a02/bookmarks/"
                        ],
                        "forPurpose": "https://example.org/someSpecificPurpose",
                        "isProvidedTo": "https://pod.inrupt.com/womenofsolid/profile/card#me"
                    },
                    "id": "https://id.dev-next.inrupt.com/virginia",
                    "inbox": "https://pod.inrupt.com/womenofsolid/inbox/"
                },
                "id": "https://vc.dev-next.inrupt.com/vc/9f0855b1-7494-4770-8c49-c3fe91d82f93",
                "issuanceDate": "2021-10-20T07:29:20.062Z",
                "issuer": "https://vc.dev-next.inrupt.com",
                "proof": {
                    "created": "2021-10-20T07:31:08.898Z",
                    "domain": "solid",
                    "proofPurpose": "assertionMethod",
                    "proofValue": "Q4-x1J0RqnIYBsW-O4IPskIeN_SOyUqtO8nZQdHlvz-PTwAe-L5lv2QhQHdUZpel1pEfdnll1rRD0vBdJ_svBg",
                    "type": "Ed25519Signature2020",
                    "verificationMethod": "https://vc.dev-next.inrupt.com/key/3eb16a3d-d31e-4f6e-b1ca-581257c69412"
                },
                "type": [
                    "VerifiableCredential",
                    "SolidAccessGrant"
                ]
            }
        ]
    }`);
      expect(isVerifiablePresentation(vp)).toBe(true);
    });
  });

  describe("returns false if", () => {
    it.each([["type"]])("is missing field %s", (entry) => {
      expect(
        isVerifiablePresentation(
          mockPartialPresentation([], {
            ...defaultVerifiableClaims,
            [`${entry}`]: undefined,
          }),
        ),
      ).toBe(false);
    });

    it("has a malformed credential", () => {
      const mockedPresentation = mockDefaultPresentation([
        {} as VerifiableCredential,
      ]);
      expect(isVerifiablePresentation(mockedPresentation)).toBe(false);
    });

    it("has a non-URL shaped holder", () => {
      const mockedPresentation = mockDefaultPresentation();
      mockedPresentation.holder = "some non-URL holder";
      expect(isVerifiablePresentation(mockedPresentation)).toBe(false);
    });
  });
});

describe("concatenateContexts", () => {
  it("concatenates string-like contexts", () => {
    expect(
      concatenateContexts("https://some.context", "https://some.other.context"),
    ).toEqual(["https://some.context", "https://some.other.context"]);
  });

  it("concatenates array-like contexts", () => {
    expect(
      concatenateContexts(
        ["https://some.context"],
        ["https://some.other.context"],
      ),
    ).toEqual(["https://some.context", "https://some.other.context"]);
  });

  it("concatenates mixed contexts", () => {
    expect(
      concatenateContexts(
        ["https://some.context"],
        "https://some.other.context",
      ),
    ).toEqual(["https://some.context", "https://some.other.context"]);
  });

  it("prevents a value to be added twice", () => {
    expect(
      concatenateContexts("https://some.context", "https://some.context"),
    ).toEqual(["https://some.context"]);
  });

  it("prevents undefined values to be added", () => {
    expect(concatenateContexts("https://some.context", undefined)).toEqual([
      "https://some.context",
    ]);
  });
});

describe("getVerifiableCredential", () => {
  it("defaults to an unauthenticated fetch", async () => {
    const mockedFetchModule = jest.requireMock(
      "@inrupt/universal-fetch",
    ) as jest.Mocked<typeof UniversalFetch>;
    mockedFetchModule.fetch.mockResolvedValueOnce(
      new Response(JSON.stringify(mockDefaultCredential()), {
        headers: new Headers([["content-type", "application/json"]]),
      }),
    );

    const redirectUrl = new URL("https://redirect.url");
    redirectUrl.searchParams.append(
      "requestVcUrl",
      encodeURI("https://some.vc"),
    );
    redirectUrl.searchParams.append(
      "redirectUrl",
      encodeURI("https://requestor.redirect.url"),
    );

    await getVerifiableCredential("https://some.vc");
    expect(mockedFetchModule.fetch).toHaveBeenCalledWith("https://some.vc");
  });

  it("uses the provided fetch if any", async () => {
    const mockedFetch = jest
      .fn<(typeof UniversalFetch)["fetch"]>()
      .mockResolvedValueOnce(
        new Response(JSON.stringify(mockDefaultCredential()), {
          headers: new Headers([["content-type", "application/json"]]),
        }),
      );

    await getVerifiableCredential("https://some.vc", {
      fetch: mockedFetch,
    });
    expect(mockedFetch).toHaveBeenCalledWith("https://some.vc");
  });

  it("throws if the VC ID cannot be dereferenced", async () => {
    const mockedFetch = jest
      .fn<(typeof UniversalFetch)["fetch"]>()
      .mockResolvedValueOnce(
        new Response(undefined, { status: 401, statusText: "Unauthenticated" }),
      );

    await expect(
      getVerifiableCredential("https://some.vc", {
        fetch: mockedFetch,
      }),
    ).rejects.toThrow(/https:\/\/some.vc.*401.*Unauthenticated/);
  });

  it("throws if the dereferenced data is invalid JSON", async () => {
    const mockedFetch = jest
      .fn<(typeof UniversalFetch)["fetch"]>()
      .mockResolvedValueOnce(new Response("Not JSON."));

    await expect(
      getVerifiableCredential("https://some.vc", {
        fetch: mockedFetch,
      }),
    ).rejects.toThrow(/https:\/\/some.vc.*JSON/);
  });

  it("throws if the dereferenced data is not a VC", async () => {
    const mockedFetch = jest
      .fn<(typeof UniversalFetch)["fetch"]>()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ something: "but not a VC" })),
      );

    await expect(
      getVerifiableCredential("https://some.vc", {
        fetch: mockedFetch,
      }),
    ).rejects.toThrow(/https:\/\/some.vc.*Verifiable Credential/);
  });

  it("throws if the dereferenced data has an unsupported content type", async () => {
    const mockedFetch = jest
      .fn<(typeof UniversalFetch)["fetch"]>()
      .mockResolvedValueOnce(
        new Response(JSON.stringify(mockDefaultCredential())),
      );

    await expect(
      getVerifiableCredential("https://some.vc", {
        fetch: mockedFetch,
      }),
    ).rejects.toThrow(/unsupported Content-Type/);
  });

  it("throws if the dereferenced data is empty", async () => {
    const mockedFetch = jest
      .fn<(typeof UniversalFetch)["fetch"]>()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({}), {
          headers: new Headers([["content-type", "application/json"]]),
        }),
      );

    await expect(
      getVerifiableCredential("https://some.vc", {
        fetch: mockedFetch,
      }),
    ).rejects.toThrow(
      /Expected exactly one Verifiable Credential.* received: 0/,
    );
  });

  it("throws if the vc is a blank node", async () => {
    const mockedFetch = jest
      .fn<(typeof UniversalFetch)["fetch"]>()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            "@type": "https://www.w3.org/2018/credentials#VerifiableCredential",
          }),
          {
            headers: new Headers([["content-type", "application/json"]]),
          },
        ),
      );

    await expect(
      getVerifiableCredential("https://some.vc", {
        fetch: mockedFetch,
      }),
    ).rejects.toThrow(
      "Expected the Verifiable Credential in [https://some.vc] to be a Named Node, received: BlankNode",
    );
  });

  it("throws if the vc has a type that is a literal", async () => {
    const mockedFetch = jest
      .fn<(typeof UniversalFetch)["fetch"]>()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            "@context": "https://www.w3.org/2018/credentials/v1",
            "@id": "http://example.org/my/vc",
            "http://www.w3.org/1999/02/22-rdf-syntax-ns#type": [
              {
                "@id":
                  "https://www.w3.org/2018/credentials#VerifiableCredential",
              },
              "str",
            ],
          }),
          {
            headers: new Headers([["content-type", "application/json"]]),
          },
        ),
      );

    await expect(
      getVerifiableCredential("https://some.vc", {
        fetch: mockedFetch,
      }),
    ).rejects.toThrow(
      "Expected all VC types to be Named Nodes but received [str] of termType [Literal]",
    );
  });

  it("throws if the dereferenced data has 2 vcs", async () => {
    const mockedFetch = jest
      .fn<(typeof UniversalFetch)["fetch"]>()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify([
            mockDefaultCredential(),
            mockDefaultCredential("http://example.org/mockVC2"),
          ]),
          {
            headers: new Headers([["content-type", "application/json"]]),
          },
        ),
      );

    await expect(
      getVerifiableCredential("https://some.vc", {
        fetch: mockedFetch,
      }),
    ).rejects.toThrow(
      /Expected exactly one Verifiable Credential.* received: 2/,
    );
  });

  it("throws if the dereferenced data has 2 proofs", async () => {
    const mockedFetch = jest
      .fn<(typeof UniversalFetch)["fetch"]>()
      .mockResolvedValueOnce(
        new Response(JSON.stringify(mockDefaultCredential2Proofs()), {
          headers: new Headers([["content-type", "application/json"]]),
        }),
      );

    await expect(
      getVerifiableCredential("https://some.vc", {
        fetch: mockedFetch,
      }),
    ).rejects.toThrow(
      /Expected exactly one \[https:\/\/w3id.org\/security#proof\].* received: 2/,
    );
  });

  it("throws if the date field is not a valid xsd:dateTime", async () => {
    const mocked = mockDefaultCredential();
    mocked.issuanceDate = "http://example.org/not/a/date";

    const mockedFetch = jest
      .fn<(typeof UniversalFetch)["fetch"]>()
      .mockResolvedValueOnce(
        new Response(JSON.stringify(mocked), {
          headers: new Headers([["content-type", "application/json"]]),
        }),
      );

    await expect(
      getVerifiableCredential("https://some.vc", {
        fetch: mockedFetch,
      }),
    ).rejects.toThrow(
      /Invalid dateTime in VC \[http:\/\/example.org\/not\/a\/date\]/,
    );
  });

  it("throws if the date field is a string", async () => {
    const mocked = mockDefaultCredential();
    // @ts-expect-error issuanceDate is required on the VC type
    delete mocked.issuanceDate;
    mocked["https://www.w3.org/2018/credentials#issuanceDate"] =
      "http://example.org/not/a/date";

    const mockedFetch = jest
      .fn<(typeof UniversalFetch)["fetch"]>()
      .mockResolvedValueOnce(
        new Response(JSON.stringify(mocked), {
          headers: new Headers([["content-type", "application/json"]]),
        }),
      );

    await expect(
      getVerifiableCredential("https://some.vc", {
        fetch: mockedFetch,
      }),
    ).rejects.toThrow(
      /Expected issuanceDate to have dataType \[http:\/\/www.w3.org\/2001\/XMLSchema#dateTime\], received: \[http:\/\/www.w3.org\/2001\/XMLSchema#string\]/,
    );
  });

  it("throws if the date field is an IRI", async () => {
    const mocked = mockDefaultCredential();
    // @ts-expect-error issuanceDate is required on the VC type
    delete mocked.issuanceDate;
    mocked["https://www.w3.org/2018/credentials#issuanceDate"] = {
      "@id": "http://example.org/not/a/date",
    };

    const mockedFetch = jest
      .fn<(typeof UniversalFetch)["fetch"]>()
      .mockResolvedValueOnce(
        new Response(JSON.stringify(mocked), {
          headers: new Headers([["content-type", "application/json"]]),
        }),
      );

    await expect(
      getVerifiableCredential("https://some.vc", {
        fetch: mockedFetch,
      }),
    ).rejects.toThrow(
      /Expected issuanceDate to be a Literal, received: NamedNode/,
    );
  });

  it("throws if the issuer is a string", async () => {
    const mocked = mockDefaultCredential();
    // @ts-expect-error issuer is of type string on the VC type
    mocked.issuer = { "@value": "my string" };

    const mockedFetch = jest
      .fn<(typeof UniversalFetch)["fetch"]>()
      .mockResolvedValueOnce(
        new Response(JSON.stringify(mocked), {
          headers: new Headers([["content-type", "application/json"]]),
        }),
      );

    await expect(
      getVerifiableCredential("https://some.vc", {
        fetch: mockedFetch,
      }),
    ).rejects.toThrow(
      "Expected property [https://www.w3.org/2018/credentials#issuer] of the Verifiable Credential [https://example.org/ns/someCredentialInstance] to be a NamedNode, received: Literal",
    );
  });

  it("should error when there is a graph in the credential subject", async () => {
    const mocked = mockDefaultCredential();
    mocked.credentialSubject = {
      ...mocked.credentialSubject,
      "https://example.org/ns/passengerOf": [
        { "@id": "http://example.org/v1" },
        { "@id": "http://example.org/v2" },
        {
          "https://example.org/ns/predicate": "str",
        },
      ],
    };

    const store = await jsonLdToStore(mocked);
    store.add(
      DataFactory.quad(
        DataFactory.namedNode("https://some.webid.provider/strelka"),
        DataFactory.namedNode("https://example.org/predicate"),
        // @ts-expect-error DefaultGraph is not allowed as an object
        DataFactory.defaultGraph(),
      ),
    );

    await expect(
      getVerifiableCredentialFromStore(store, "https://some.vc"),
    ).rejects.toThrow("Unexpected term type: DefaultGraph");
  });

  it("should error when there is a non-NamedNode predicate in the credential subject", async () => {
    const mocked = mockDefaultCredential();
    mocked.credentialSubject = {
      ...mocked.credentialSubject,
      "https://example.org/ns/passengerOf": [
        { "@id": "http://example.org/v1" },
        { "@id": "http://example.org/v2" },
        {
          "https://example.org/ns/predicate": "str",
        },
      ],
    };

    const store = await jsonLdToStore(mocked);
    store.add(
      DataFactory.quad(
        DataFactory.namedNode("https://some.webid.provider/strelka"),
        // @ts-expect-error Literal is not allowed as a subject
        DataFactory.literal("https://example.org/predicate"),
        DataFactory.namedNode("https://example.org/ns/object"),
      ),
    );

    await expect(
      getVerifiableCredentialFromStore(store, "https://some.vc"),
    ).rejects.toThrow("Predicate must be a namedNode");
  });

  it("should handle credential subjects with multiple objects", async () => {
    const mocked = mockDefaultCredential();
    mocked.credentialSubject = {
      ...mocked.credentialSubject,
      "https://example.org/ns/passengerOf": [
        { "@id": "http://example.org/v1" },
        { "@id": "http://example.org/v2" },
      ],
      "https://example.org/my/predicate/i": {
        "https://example.org/my/predicate": "object",
      },
    };

    const mockedFetch = jest
      .fn<(typeof UniversalFetch)["fetch"]>()
      .mockResolvedValueOnce(
        new Response(JSON.stringify(mocked), {
          headers: new Headers([["content-type", "application/json"]]),
        }),
      );

    const vc = await getVerifiableCredential("https://some.vc", {
      fetch: mockedFetch,
    });

    const result = {
      ...mocked,
      credentialSubject: {
        ...mocked.credentialSubject,
        // All objects are fully expanded to use @value
        "https://example.org/ns/status": {
          "@value": "https://example.org/ns/GoodDog",
        },
        // This is how blank nodes are represented
        "https://example.org/my/predicate/i": {
          "@id": "_:b1",
          "https://example.org/my/predicate": {
            "@value": "object",
          },
        },
      },
      type: [
        // Unknown types like http://example.org/spaceDog are excluded
        "VerifiableCredential",
      ],
    };

    // Since we have dataset properties in vc it should match the result
    // but won't equal
    expect(vc).toMatchObject(result);
    // However we DO NOT want these properties showing up when we stringify
    // the VC
    expect(JSON.parse(JSON.stringify(vc))).toEqual(result);
  });

  it("should error if more than 2 subjects in proof graph", async () => {
    const store = new Store([
      DataFactory.quad(
        DataFactory.namedNode("http://example.org/vc"),
        DataFactory.namedNode("https://w3id.org/security#proof"),
        DataFactory.namedNode("http://example.org/proofGraph"),
      ),
      DataFactory.quad(
        DataFactory.namedNode("http://example.org/s"),
        DataFactory.namedNode("http://example.org/p"),
        DataFactory.namedNode("http://example.org/o"),
        DataFactory.namedNode("http://example.org/proofGraph"),
      ),
      DataFactory.quad(
        DataFactory.namedNode("http://example.org/s2"),
        DataFactory.namedNode("http://example.org/p2"),
        DataFactory.namedNode("http://example.org/o2"),
        DataFactory.namedNode("http://example.org/proofGraph"),
      ),
      DataFactory.quad(
        DataFactory.namedNode("http://example.org/vc"),
        DataFactory.namedNode(
          "http://www.w3.org/1999/02/22-rdf-syntax-ns#type",
        ),
        DataFactory.namedNode(
          "https://www.w3.org/2018/credentials#VerifiableCredential",
        ),
      ),
    ]);

    await expect(
      getVerifiableCredentialFromStore(store, "http://example.org/vc"),
    ).rejects.toThrow(
      "Expected exactly one proof to live in the proofs graph, received 2",
    );
  });

  it("should error if proof graph made about different subject", async () => {
    const store = new Store([
      DataFactory.quad(
        DataFactory.namedNode("http://example.org/vc2"),
        DataFactory.namedNode("https://w3id.org/security#proof"),
        DataFactory.namedNode("http://example.org/proofGraph"),
      ),
      DataFactory.quad(
        DataFactory.namedNode("http://example.org/s"),
        DataFactory.namedNode("http://example.org/p"),
        DataFactory.namedNode("http://example.org/o"),
        DataFactory.namedNode("http://example.org/proofGraph"),
      ),
      DataFactory.quad(
        DataFactory.namedNode("http://example.org/s2"),
        DataFactory.namedNode("http://example.org/p2"),
        DataFactory.namedNode("http://example.org/o2"),
        DataFactory.namedNode("http://example.org/proofGraph"),
      ),
      DataFactory.quad(
        DataFactory.namedNode("http://example.org/vc"),
        DataFactory.namedNode(
          "http://www.w3.org/1999/02/22-rdf-syntax-ns#type",
        ),
        DataFactory.namedNode(
          "https://www.w3.org/2018/credentials#VerifiableCredential",
        ),
      ),
    ]);

    await expect(
      getVerifiableCredentialFromStore(store, "http://example.org/vc"),
    ).rejects.toThrow(
      "Expected exactly one [https://w3id.org/security#proof] for the Verifiable Credential http://example.org/vc, received: 0",
    );
  });

  it("throws if there are 2 proof values", async () => {
    const mocked = mockDefaultCredential();
    // @ts-expect-error proofValue is a string not string[] in VC type
    mocked.proof.proofValue = [mocked.proof.proofValue, "abc"];

    const mockedFetch = jest
      .fn<(typeof UniversalFetch)["fetch"]>()
      .mockResolvedValueOnce(
        new Response(JSON.stringify(mocked), {
          headers: new Headers([["content-type", "application/json"]]),
        }),
      );

    await expect(
      getVerifiableCredential("https://some.vc", {
        fetch: mockedFetch,
      }),
    ).rejects.toThrow(
      /Expected exactly one \[https:\/\/w3id.org\/security#proofValue\] for the Verifiable Credential https:\/\/example.org\/ns\/someCredentialInstance, received: 2/,
    );
  });

  it("returns the fetched VC and the redirect URL", async () => {
    const mockedFetch = jest
      .fn<(typeof UniversalFetch)["fetch"]>()
      .mockResolvedValueOnce(
        new Response(JSON.stringify(mockDefaultCredential()), {
          headers: new Headers([["content-type", "application/json"]]),
        }),
      );

    const vc = await getVerifiableCredential("https://some.vc", {
      fetch: mockedFetch,
    });

    const res = await jsonLdStringToStore(
      JSON.stringify(mockDefaultCredential()),
    );
    expect(vc).toMatchObject(
      Object.assign(mockDefaultCredential(), {
        size: 13,
        // We always re-frame w.r.t to this context
        "@context": [
          "https://www.w3.org/2018/credentials/v1",
          "https://schema.inrupt.com/credentials/v1.jsonld",
        ],
        // The credentials subject is re-framed to make the fact that the
        // objects are literals explicit
        credentialSubject: {
          "https://example.org/ns/passengerOf": {
            "@value": "https://example.org/ns/Korabl-Sputnik2",
          },
          "https://example.org/ns/status": {
            "@value": "https://example.org/ns/GoodDog",
          },
          id: "https://some.webid.provider/strelka",
        },
        // Any types outside of those in our VC and Inrupt context are removed
        type: ["VerifiableCredential"],
      }),
    );

    const meaninglessQuad = DataFactory.quad(
      DataFactory.namedNode("http://example.org/a"),
      DataFactory.namedNode("http://example.org/b"),
      DataFactory.namedNode("http://example.org/c"),
    );

    const issuerQuad = DataFactory.quad(
      DataFactory.namedNode("https://example.org/ns/someCredentialInstance"),
      DataFactory.namedNode("https://www.w3.org/2018/credentials#issuer"),
      DataFactory.namedNode("https://some.vc.issuer/in-ussr"),
    );

    expect(isomorphic([...vc], [...res])).toBe(true);
    expect(isomorphic([...vc.match()], [...res])).toBe(true);
    expect(() => vc.add(meaninglessQuad)).toThrow("Cannot mutate this dataset");
    expect(() => vc.delete(meaninglessQuad)).toThrow(
      "Cannot mutate this dataset",
    );
    expect(vc.has(meaninglessQuad)).toBe(false);
    expect(vc.has(issuerQuad)).toBe(true);
    expect(vc.size).toBe(13);
    expect(
      vc.match(
        DataFactory.namedNode("https://example.org/ns/someCredentialInstance"),
      ).size,
    ).toBe(6);
  });

  it("should handle non standard proof type", async () => {
    const store = await jsonLdToStore(mockDefaultCredential());

    for (const quad of store.match(
      null,
      DataFactory.namedNode("http://www.w3.org/1999/02/22-rdf-syntax-ns#type"),
      DataFactory.namedNode("https://w3id.org/security#Ed25519Signature2018"),
    )) {
      store.delete(quad);
      store.add(
        DataFactory.quad(
          quad.subject,
          quad.predicate,
          DataFactory.namedNode("https://w3id.org/security#notARealSignature"),
          quad.graph,
        ),
      );
    }

    expect(
      await getVerifiableCredentialFromStore(store, "https://some.vc"),
    ).toMatchObject(
      Object.assign(mockDefaultCredential(), {
        size: 13,
        // We always re-frame w.r.t to this context
        "@context": [
          "https://www.w3.org/2018/credentials/v1",
          "https://schema.inrupt.com/credentials/v1.jsonld",
        ],
        // The credentials subject is re-framed to make the fact that the
        // objects are literals explicit
        credentialSubject: {
          "https://example.org/ns/passengerOf": {
            "@value": "https://example.org/ns/Korabl-Sputnik2",
          },
          "https://example.org/ns/status": {
            "@value": "https://example.org/ns/GoodDog",
          },
          id: "https://some.webid.provider/strelka",
        },
        // Any types outside of those in our VC and Inrupt context are removed
        type: ["VerifiableCredential"],
        proof: {
          ...mockDefaultCredential().proof,
          // Proof purpose has full URI as compacting this relies on the
          // context of the "type"
          proofPurpose: "sec:assertionMethod",
          type: "sec:notARealSignature",
        },
      }),
    );
  });

  it("should apply the correct context for a given proof", async () => {
    const store = await jsonLdToStore(mockDefaultCredential());

    for (const quad of store.match(
      null,
      DataFactory.namedNode("http://www.w3.org/1999/02/22-rdf-syntax-ns#type"),
      DataFactory.namedNode("https://w3id.org/security#Ed25519Signature2018"),
    )) {
      store.removeQuad(quad);
      store.add(
        DataFactory.quad(
          quad.subject,
          quad.predicate,
          DataFactory.namedNode(
            "https://www.w3.org/2018/credentials#VerifiableCredential",
          ),
          quad.graph,
        ),
      );
    }

    expect(
      await getVerifiableCredentialFromStore(store, "https://some.vc"),
    ).toMatchObject(
      Object.assign(mockDefaultCredential(), {
        size: 13,
        // We always re-frame w.r.t to this context
        "@context": [
          "https://www.w3.org/2018/credentials/v1",
          "https://schema.inrupt.com/credentials/v1.jsonld",
        ],
        // The credentials subject is re-framed to make the fact that the
        // objects are literals explicit
        credentialSubject: {
          "https://example.org/ns/passengerOf": {
            "@value": "https://example.org/ns/Korabl-Sputnik2",
          },
          "https://example.org/ns/status": {
            "@value": "https://example.org/ns/GoodDog",
          },
          id: "https://some.webid.provider/strelka",
        },
        // Any types outside of those in our VC and Inrupt context are removed
        type: ["VerifiableCredential"],
        proof: {
          ...mockDefaultCredential().proof,
          // Proof purpose has a prefix because assertionMethod is not
          // defined as a term in the VerifiableCredential subContext
          proofPurpose: "sec:assertionMethod",
          type: "VerifiableCredential",
        },
      }),
    );
  });

  it("should handle multiple known types", async () => {
    const store = await jsonLdToStore(mockDefaultCredential());

    for (const quad of store.match(
      null,
      DataFactory.namedNode("http://www.w3.org/1999/02/22-rdf-syntax-ns#type"),
      DataFactory.namedNode(
        "https://www.w3.org/2018/credentials#VerifiableCredential",
      ),
    )) {
      store.add(
        DataFactory.quad(
          quad.subject,
          quad.predicate,
          DataFactory.namedNode(
            "https://www.w3.org/2018/credentials#VerifiablePresentation",
          ),
          quad.graph,
        ),
      );
    }

    expect(
      await getVerifiableCredentialFromStore(store, "https://some.vc"),
    ).toMatchObject(
      Object.assign(mockDefaultCredential(), {
        size: 14,
        // We always re-frame w.r.t to this context
        "@context": [
          "https://www.w3.org/2018/credentials/v1",
          "https://schema.inrupt.com/credentials/v1.jsonld",
        ],
        // The credentials subject is re-framed to make the fact that the
        // objects are literals explicit
        credentialSubject: {
          "https://example.org/ns/passengerOf": {
            "@value": "https://example.org/ns/Korabl-Sputnik2",
          },
          "https://example.org/ns/status": {
            "@value": "https://example.org/ns/GoodDog",
          },
          id: "https://some.webid.provider/strelka",
        },
        // Any types outside of those in our VC and Inrupt context are removed
        type: ["VerifiableCredential", "VerifiablePresentation"],
      }),
    );
  });

  it("should handle credential subject with a blank node and a boolean", async () => {
    const store = await jsonLdToStore(mockDefaultCredential());

    store.add(
      DataFactory.quad(
        DataFactory.namedNode("https://some.webid.provider/strelka"),
        DataFactory.namedNode("https://example.org/predicateBnode"),
        DataFactory.blankNode("b2"),
      ),
    );

    store.add(
      DataFactory.quad(
        DataFactory.namedNode("https://some.webid.provider/strelka"),
        DataFactory.namedNode("https://example.org/predicateTrue"),
        DataFactory.literal(
          "true",
          DataFactory.namedNode("http://www.w3.org/2001/XMLSchema#boolean"),
        ),
      ),
    );

    store.add(
      DataFactory.quad(
        DataFactory.namedNode("https://some.webid.provider/strelka"),
        DataFactory.namedNode("https://example.org/predicateFalse"),
        DataFactory.literal(
          "false",
          DataFactory.namedNode("http://www.w3.org/2001/XMLSchema#boolean"),
        ),
      ),
    );

    store.add(
      DataFactory.quad(
        DataFactory.namedNode("https://some.webid.provider/strelka"),
        DataFactory.namedNode("https://example.org/predicateFalse"),
        DataFactory.literal(
          "false",
          DataFactory.namedNode("http://www.w3.org/2001/XMLSchema#boolean"),
        ),
      ),
    );

    store.add(
      DataFactory.quad(
        DataFactory.namedNode("https://some.webid.provider/strelka"),
        DataFactory.namedNode("https://w3id.org/GConsent#forPurpose"),
        DataFactory.namedNode(
          "http://example.org/known/to/be/iri/from/predicate",
        ),
      ),
    );

    store.add(
      DataFactory.quad(
        DataFactory.namedNode("https://some.webid.provider/strelka"),
        DataFactory.namedNode("https://example.org/predicate"),
        DataFactory.namedNode("https://example.org/object"),
      ),
    );

    expect(
      await getVerifiableCredentialFromStore(store, "https://some.vc"),
    ).toMatchObject(
      Object.assign(mockDefaultCredential(), {
        size: 18,
        // We always re-frame w.r.t to this context
        "@context": [
          "https://www.w3.org/2018/credentials/v1",
          "https://schema.inrupt.com/credentials/v1.jsonld",
        ],
        // The credentials subject is re-framed to make the fact that the
        // objects are literals explicit
        credentialSubject: {
          "https://example.org/ns/passengerOf": {
            "@value": "https://example.org/ns/Korabl-Sputnik2",
          },
          "https://example.org/ns/status": {
            "@value": "https://example.org/ns/GoodDog",
          },
          id: "https://some.webid.provider/strelka",
          "https://example.org/predicate": {
            "@id": "https://example.org/object",
          },
          "https://example.org/predicateBnode": {},
          "https://example.org/predicateFalse": false,
          "https://example.org/predicateTrue": true,
          forPurpose: "http://example.org/known/to/be/iri/from/predicate",
        },
        // Any types outside of those in our VC and Inrupt context are removed
        type: ["VerifiableCredential"],
      }),
    );
  });

  it("should handle credential subject with a self-referential blank node", async () => {
    const store = await jsonLdToStore(mockDefaultCredential());

    store.add(
      DataFactory.quad(
        DataFactory.namedNode("https://some.webid.provider/strelka"),
        DataFactory.namedNode("https://example.org/predicateBnode"),
        DataFactory.blankNode("b2"),
      ),
    );

    store.add(
      DataFactory.quad(
        DataFactory.namedNode("https://some.webid.provider/strelka"),
        DataFactory.namedNode("https://example.org/predicate"),
        DataFactory.namedNode("https://example.org/object"),
      ),
    );

    store.add(
      DataFactory.quad(
        DataFactory.blankNode("b2"),
        DataFactory.namedNode("https://example.org/predicate"),
        DataFactory.blankNode("b2"),
      ),
    );

    expect(
      await getVerifiableCredentialFromStore(store, "https://some.vc"),
    ).toMatchObject(
      Object.assign(mockDefaultCredential(), {
        size: 16,
        // We always re-frame w.r.t to this context
        "@context": [
          "https://www.w3.org/2018/credentials/v1",
          "https://schema.inrupt.com/credentials/v1.jsonld",
        ],
        // The credentials subject is re-framed to make the fact that the
        // objects are literals explicit
        credentialSubject: {
          "https://example.org/ns/passengerOf": {
            "@value": "https://example.org/ns/Korabl-Sputnik2",
          },
          "https://example.org/ns/status": {
            "@value": "https://example.org/ns/GoodDog",
          },
          id: "https://some.webid.provider/strelka",
          "https://example.org/predicate": {
            "@id": "https://example.org/object",
          },
          "https://example.org/predicateBnode": {
            "@id": "_:b1",
            "https://example.org/predicate": {
              "@id": "_:b1",
            },
          },
        },
        // Any types outside of those in our VC and Inrupt context are removed
        type: ["VerifiableCredential"],
      }),
    );
  });

  it("should handle credential subject with a self-referential blank node and stand-alone blank node", async () => {
    const store = await jsonLdToStore(mockDefaultCredential());

    store.add(
      DataFactory.quad(
        DataFactory.namedNode("https://some.webid.provider/strelka"),
        DataFactory.namedNode("https://example.org/predicateBnode"),
        DataFactory.blankNode("b2"),
      ),
    );

    store.add(
      DataFactory.quad(
        DataFactory.namedNode("https://some.webid.provider/strelka"),
        DataFactory.namedNode("https://example.org/predicateBnode"),
        DataFactory.blankNode("b3"),
      ),
    );

    store.add(
      DataFactory.quad(
        DataFactory.namedNode("https://some.webid.provider/strelka"),
        DataFactory.namedNode("https://example.org/predicate"),
        DataFactory.namedNode("https://example.org/object"),
      ),
    );

    store.add(
      DataFactory.quad(
        DataFactory.blankNode("b2"),
        DataFactory.namedNode("https://example.org/predicate"),
        DataFactory.blankNode("b2"),
      ),
    );

    expect(
      await getVerifiableCredentialFromStore(store, "https://some.vc"),
    ).toMatchObject(
      Object.assign(mockDefaultCredential(), {
        size: 17,
        // We always re-frame w.r.t to this context
        "@context": [
          "https://www.w3.org/2018/credentials/v1",
          "https://schema.inrupt.com/credentials/v1.jsonld",
        ],
        // The credentials subject is re-framed to make the fact that the
        // objects are literals explicit
        credentialSubject: {
          "https://example.org/ns/passengerOf": {
            "@value": "https://example.org/ns/Korabl-Sputnik2",
          },
          "https://example.org/ns/status": {
            "@value": "https://example.org/ns/GoodDog",
          },
          id: "https://some.webid.provider/strelka",
          "https://example.org/predicate": {
            "@id": "https://example.org/object",
          },
          "https://example.org/predicateBnode": [
            {
              "@id": "_:b1",
              "https://example.org/predicate": {
                "@id": "_:b1",
              },
            },
            {
              "@id": "_:b2",
            },
          ],
        },
        // Any types outside of those in our VC and Inrupt context are removed
        type: ["VerifiableCredential"],
      }),
    );
  });
});

describe("getVerifiableCredentialFromResponse", () => {
  it("should error if the response has no content type", () => {
    return expect(
      getVerifiableCredentialFromResponse(
        new Response(),
        "https://example.org",
      ),
    ).rejects.toThrow("Response does not have a Content-Type");
  });
});
