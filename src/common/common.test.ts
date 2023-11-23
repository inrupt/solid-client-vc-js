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
import type * as UniversalFetch from "@inrupt/universal-fetch";
import { Response, fetch as uniFetch } from "@inrupt/universal-fetch";
import { describe, expect, it, jest, beforeEach } from "@jest/globals";
import { DataFactory, Store } from "n3";
import { isomorphic } from "rdf-isomorphic";
import type { IJsonLdContext } from "jsonld-context-parser";
import { jsonLdStringToStore } from "../parser/jsonld";
import type { VerifiableCredential } from "./common";
import {
  concatenateContexts,
  getVerifiableCredential,
  isVerifiableCredential,
  isVerifiablePresentation,
  normalizeVc,
  verifiableCredentialToDataset,
} from "./common";
import * as getters from "./getters";
import {
  defaultCredentialClaims,
  defaultVerifiableClaims,
  mockDefaultCredential,
  mockDefaultCredential2Proofs,
  mockDefaultPresentation,
  mockPartialCredential,
  mockPartialPresentation,
} from "./common.mock";
import { cred } from "./constants";

const { namedNode, quad, blankNode } = DataFactory;

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
  it("returns true if all the expected fields are present in the credential", async () => {
    expect(isVerifiableCredential(mockDefaultCredential())).toBe(true);
    expect(
      getters.isVerifiableCredential(
        await verifiableCredentialToDataset(mockDefaultCredential()),
        namedNode(mockDefaultCredential().id),
      ),
    ).toBe(true);
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
    ])("is missing field %s", async (entry) => {
      expect(
        getters.isVerifiableCredential(
          await verifiableCredentialToDataset(
            mockPartialCredential({
              ...defaultCredentialClaims,
              [`${entry}`]: undefined,
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
            }) as any,
          ),
          namedNode(mockDefaultCredential().id),
        ),
      ).toBe(false);

      expect(
        isVerifiableCredential(
          mockPartialCredential({
            ...defaultCredentialClaims,
            [`${entry}`]: undefined,
          }),
        ),
      ).toBe(false);
    });

    it("misses a credential subject", async () => {
      const mockedCredential = mockDefaultCredential();
      delete (
        mockedCredential as {
          credentialSubject: undefined | Record<string, unknown>;
        }
      ).credentialSubject;
      expect(
        getters.isVerifiableCredential(
          await verifiableCredentialToDataset(mockedCredential),
          namedNode(mockDefaultCredential().id),
        ),
      ).toBe(false);
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

    it("has an unexpected date format for the issuance", async () => {
      expect(
        getters.isVerifiableCredential(
          await verifiableCredentialToDataset(
            mockPartialCredential({
              ...defaultCredentialClaims,
              issuanceDate: "Not a date",
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
            }) as any,
          ),
          namedNode(mockDefaultCredential().id),
        ),
      ).toBe(false);
      expect(
        isVerifiableCredential(
          mockPartialCredential({
            ...defaultCredentialClaims,
            issuanceDate: "Not a date",
          }),
        ),
      ).toBe(false);
    });

    it("has an unexpected date format for the proof creation", async () => {
      expect(
        getters.isVerifiableCredential(
          await verifiableCredentialToDataset(
            mockPartialCredential({
              ...defaultCredentialClaims,
              proofCreated: "Not a date",
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
            }) as any,
          ),
          namedNode(mockDefaultCredential().id),
        ),
      ).toBe(false);
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
    it("has all the expected fields are present in the credential", async () => {
      expect(isVerifiablePresentation(mockDefaultPresentation())).toBe(true);
      expect(
        getters.isVerifiablePresentation(
          await verifiableCredentialToDataset(mockDefaultPresentation()),
          namedNode(mockDefaultPresentation().id!),
        ),
      ).toBe(true);
    });

    it("has no associated credentials", async () => {
      expect(isVerifiablePresentation(mockDefaultPresentation([]))).toBe(true);
      expect(
        getters.isVerifiablePresentation(
          await verifiableCredentialToDataset(mockDefaultPresentation([])),
          namedNode(mockDefaultPresentation([]).id!),
        ),
      ).toBe(true);
    });

    it("has an URL shaped holder", async () => {
      const mockedPresentation = mockDefaultPresentation();
      mockedPresentation.holder = "https://some.holder";
      expect(isVerifiablePresentation(mockedPresentation)).toBe(true);
      expect(
        getters.isVerifiablePresentation(
          await verifiableCredentialToDataset(mockedPresentation),
          namedNode(mockedPresentation.id!),
        ),
      ).toBe(true);
    });

    it("is passed a correct VP with a single type", async () => {
      const vp = {
        "@context": ["https://www.w3.org/2018/credentials/v1"],
        id: "https://example.org/ns/someCredentialInstance",
        holder: "https://vc.dev-next.inrupt.com",
        type: "VerifiablePresentation",
        verifiableCredential: [
          {
            "@context": [
              "https://www.w3.org/2018/credentials/v1",
              "https://w3id.org/security/suites/ed25519-2020/v1",
              "https://w3id.org/vc-revocation-list-2020/v1",
              "https://consent.pod.inrupt.com/credentials/v1",
            ],
            credentialStatus: {
              id: "https://vc.dev-next.inrupt.com/status/niiL#0",
              revocationListCredential:
                "https://vc.dev-next.inrupt.com/status/niiL",
              revocationListIndex: "0",
              type: "RevocationList2020Status",
            },
            credentialSubject: {
              providedConsent: {
                mode: ["http://www.w3.org/ns/auth/acl#Read"],
                hasStatus:
                  "https://w3id.org/GConsent#ConsentStatusExplicitlyGiven",
                forPersonalData: [
                  "https://storage.dev-next.inrupt.com/8c6a313e-98ae-4eb2-9ab3-2df201d81a02/bookmarks/",
                ],
                forPurpose: "https://example.org/someSpecificPurpose",
                isProvidedTo:
                  "https://pod.inrupt.com/womenofsolid/profile/card#me",
              },
              id: "https://id.dev-next.inrupt.com/virginia",
              inbox: "https://pod.inrupt.com/womenofsolid/inbox/",
            },
            id: "https://vc.dev-next.inrupt.com/vc/9f0855b1-7494-4770-8c49-c3fe91d82f93",
            issuanceDate: "2021-10-20T07:29:20.062Z",
            issuer: "https://vc.dev-next.inrupt.com",
            proof: {
              created: "2021-10-20T07:31:08.898Z",
              domain: "solid",
              proofPurpose: "assertionMethod",
              proofValue:
                "Q4-x1J0RqnIYBsW-O4IPskIeN_SOyUqtO8nZQdHlvz-PTwAe-L5lv2QhQHdUZpel1pEfdnll1rRD0vBdJ_svBg",
              type: "Ed25519Signature2020",
              verificationMethod:
                "https://vc.dev-next.inrupt.com/key/3eb16a3d-d31e-4f6e-b1ca-581257c69412",
            },
            type: ["VerifiableCredential", "SolidAccessGrant"],
          },
        ],
      };
      expect(isVerifiablePresentation(vp)).toBe(true);
      expect(
        getters.isVerifiablePresentation(
          await verifiableCredentialToDataset(vp),
          namedNode(vp.id),
        ),
      ).toBe(true);
    });
  });

  describe("returns false if", () => {
    it.each([["type"]])("is missing field %s", async (entry) => {
      const vp = mockPartialPresentation([], {
        ...defaultVerifiableClaims,
        [`${entry}`]: undefined,
      });

      expect(
        isVerifiablePresentation(
          mockPartialPresentation([], {
            ...defaultVerifiableClaims,
            [`${entry}`]: undefined,
          }),
        ),
      ).toBe(false);
      expect(
        getters.isVerifiablePresentation(
          // @ts-expect-error we expect that this is not a valid Verifiable Presentation
          await verifiableCredentialToDataset(vp),
          // @ts-expect-error we expect that this is not a valid Verifiable Presentation
          namedNode(vp.id),
        ),
      ).toBe(false);
    });

    it("has a malformed credential that is not parsed into json-ld", async () => {
      const mockedPresentation = mockDefaultPresentation([
        {} as VerifiableCredential,
      ]);

      const mockedPresentationAsDataset =
        await verifiableCredentialToDataset(mockedPresentation);
      expect(
        mockedPresentationAsDataset.match(null, cred.verifiableCredential, null)
          .size,
      ).toBe(0);
      expect(isVerifiablePresentation(mockedPresentation)).toBe(false);
      expect(
        getters.isVerifiablePresentation(
          mockedPresentationAsDataset,
          namedNode(mockedPresentation.id!),
        ),
      ).toBe(true);

      // Should return false when we artifically add a blank node to the dataset
      expect(
        getters.isVerifiablePresentation(
          new Store([
            ...mockedPresentationAsDataset,
            quad(
              namedNode(mockedPresentation.id!),
              cred.verifiableCredential,
              blankNode(),
            ),
          ]),
          namedNode(mockedPresentation.id!),
        ),
      ).toBe(false);
      // Should return false when we artifically add a named node with invalid url to the dataset
      expect(
        getters.isVerifiablePresentation(
          new Store([
            ...mockedPresentationAsDataset,
            quad(
              namedNode(mockedPresentation.id!),
              cred.verifiableCredential,
              namedNode("http://example.org/incomplete/vc"),
            ),
          ]),
          namedNode(mockedPresentation.id!),
        ),
      ).toBe(false);
    });

    it("has a non-URL shaped holder", async () => {
      const mockedPresentation = mockDefaultPresentation();
      mockedPresentation.holder = "some non-URL holder";
      expect(isVerifiablePresentation(mockedPresentation)).toBe(false);

      const presentationAsDataset =
        await verifiableCredentialToDataset(mockedPresentation);
      expect(presentationAsDataset.match(null, cred.holder, null).size).toBe(0);
      expect(
        getters.isVerifiablePresentation(
          presentationAsDataset,
          namedNode(mockedPresentation.id!),
        ),
      ).toBe(true);

      // Should return false when we artifically add a blank node to the dataset
      expect(
        getters.isVerifiablePresentation(
          new Store([
            ...presentationAsDataset,
            quad(namedNode(mockedPresentation.id!), cred.holder, blankNode()),
          ]),
          namedNode(mockedPresentation.id!),
        ),
      ).toBe(false);
      // Should return false when we artifically add a named node with invalid url to the dataset
      expect(
        getters.isVerifiablePresentation(
          new Store([
            ...presentationAsDataset,
            quad(
              namedNode(mockedPresentation.id!),
              cred.holder,
              namedNode("not a valid url"),
            ),
          ]),
          namedNode(mockedPresentation.id!),
        ),
      ).toBe(false);
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
      fetch: mockedFetch as (typeof UniversalFetch)["fetch"],
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
        fetch: mockedFetch as (typeof UniversalFetch)["fetch"],
      }),
    ).rejects.toThrow(/https:\/\/some.vc.*401.*Unauthenticated/);
  });

  it("throws if the dereferenced data is invalid JSON", async () => {
    const mockedFetch = jest
      .fn<(typeof UniversalFetch)["fetch"]>()
      .mockResolvedValueOnce(new Response("Not JSON."));

    await expect(
      getVerifiableCredential("https://some.vc", {
        fetch: mockedFetch as (typeof UniversalFetch)["fetch"],
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
        fetch: mockedFetch as (typeof UniversalFetch)["fetch"],
      }),
    ).rejects.toThrow(/https:\/\/some.vc.*Verifiable Credential/);
  });

  it.skip("throws if the dereferenced data has an unsupported content type", async () => {
    const mockedFetch = jest
      .fn<(typeof UniversalFetch)["fetch"]>()
      .mockResolvedValueOnce(
        new Response(JSON.stringify(mockDefaultCredential())),
      );

    await expect(
      getVerifiableCredential("https://some.vc", {
        fetch: mockedFetch as (typeof UniversalFetch)["fetch"],
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
        fetch: mockedFetch as (typeof UniversalFetch)["fetch"],
      }),
    ).rejects.toThrow(
      "The value received from [https://some.vc] is not a Verifiable Credential",
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
        fetch: mockedFetch as (typeof UniversalFetch)["fetch"],
      }),
    ).rejects.toThrow(
      "The value received from [https://some.vc] is not a Verifiable Credential",
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
        fetch: mockedFetch as (typeof UniversalFetch)["fetch"],
      }),
    ).rejects.toThrow(
      "The value received from [https://some.vc] is not a Verifiable Credential",
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
        fetch: mockedFetch as (typeof UniversalFetch)["fetch"],
      }),
    ).rejects.toThrow(
      "The value received from [https://some.vc] is not a Verifiable Credential",
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
        fetch: mockedFetch as (typeof UniversalFetch)["fetch"],
      }),
    ).rejects.toThrow(
      "The value received from [https://some.vc] is not a Verifiable Credential",
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
        fetch: mockedFetch as (typeof UniversalFetch)["fetch"],
      }),
    ).rejects.toThrow(
      "The value received from [https://some.vc] is not a Verifiable Credential",
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
        fetch: mockedFetch as (typeof UniversalFetch)["fetch"],
      }),
    ).rejects.toThrow(
      "The value received from [https://some.vc] is not a Verifiable Credential",
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
        fetch: mockedFetch as (typeof UniversalFetch)["fetch"],
      }),
    ).rejects.toThrow(
      "The value received from [https://some.vc] is not a Verifiable Credential",
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
        fetch: mockedFetch as (typeof UniversalFetch)["fetch"],
      }),
    ).rejects.toThrow(
      "The value received from [https://some.vc] is not a Verifiable Credential",
    );
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
      fetch: mockedFetch as (typeof UniversalFetch)["fetch"],
    });

    // Since we have dataset properties in vc it should match the result
    // but won't equal
    expect(vc).toMatchObject(mocked);
    // However we DO NOT want these properties showing up when we stringify
    // the VC
    expect(JSON.parse(JSON.stringify(vc))).toEqual(mocked);
  });

  it("should handle credential subjects with multiple objects and a custom context", async () => {
    const mocked = mockDefaultCredential();
    mocked["@context"] = [
      ...(mocked["@context"] as (IJsonLdContext | string)[]),
      {
        ex: "http://example.org/",
      },
    ];
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
      fetch: mockedFetch as (typeof UniversalFetch)["fetch"],
    });

    // Since we have dataset properties in vc it should match the result
    // but won't equal
    expect(vc).toMatchObject(mocked);
    // However we DO NOT want these properties showing up when we stringify
    // the VC
    expect(JSON.parse(JSON.stringify(vc))).toEqual(mocked);
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
        fetch: mockedFetch as (typeof UniversalFetch)["fetch"],
      }),
    ).rejects.toThrow(
      "The value received from [https://some.vc] is not a Verifiable Credential",
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
      fetch: mockedFetch as (typeof UniversalFetch)["fetch"],
    });

    const res = await jsonLdStringToStore(
      JSON.stringify(mockDefaultCredential()),
    );
    expect(vc).toMatchObject(
      Object.assign(mockDefaultCredential(), {
        size: 13,
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

  describe("with non cached contexts", () => {
    const mockCredential = {
      ...mockDefaultCredential(),
      "@context": [
        ...(mockDefaultCredential()["@context"] as string[]),
        "http://example.org/my/sample/context",
      ],
    };
    let mockedFetch: jest.Mock<(typeof UniversalFetch)["fetch"]>;

    beforeEach(() => {
      mockedFetch = jest
        .fn<(typeof UniversalFetch)["fetch"]>()
        .mockResolvedValueOnce(
          new Response(JSON.stringify(mockCredential), {
            headers: new Headers([["content-type", "application/json"]]),
          }),
        );
    });

    it("errors if the context contains an IRI that is not cached", async () => {
      await expect(
        getVerifiableCredential("https://some.vc", {
          fetch: mockedFetch as (typeof UniversalFetch)["fetch"],
        }),
      ).rejects.toThrow(
        "Unexpected context requested [http://example.org/my/sample/context]",
      );
    });

    it("resolves if allowContextFetching is enabled and the context can be fetched", async () => {
      (uniFetch as jest.Mock<typeof uniFetch>).mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            "@context": {},
          }),
          {
            headers: new Headers([["content-type", "application/ld+json"]]),
          },
        ),
      );

      await expect(
        getVerifiableCredential("https://some.vc", {
          fetch: mockedFetch as (typeof UniversalFetch)["fetch"],
          allowContextFetching: true,
        }),
      ).resolves.toMatchObject(mockCredential);
    });

    it("resolves if the context is cached", async () => {
      await expect(
        getVerifiableCredential("https://some.vc", {
          fetch: mockedFetch as (typeof UniversalFetch)["fetch"],
          allowContextFetching: true,
          contexts: {
            "http://example.org/my/sample/context": {
              "@context": {},
            },
          },
        }),
      ).resolves.toMatchObject(mockCredential);
    });
  });
});
