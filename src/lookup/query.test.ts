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

import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { DataFactory } from "n3";
import {
  defaultVerifiableClaims,
  mockAccessGrant,
  mockDefaultCredential,
  mockDefaultPresentation,
  mockPartialPresentation,
} from "../common/common.mock";
import { cred, rdf } from "../common/constants";
import type { QueryByExample } from "./query";
import { query } from "./query";

const { namedNode } = DataFactory;
const mockRequest: QueryByExample = {
  type: "QueryByExample",
  credentialQuery: [
    {
      reason: "Some reason",
      example: {
        type: ["Some credential type"],
      },
    },
  ],
};

describe("query", () => {
  let spiedFetch: jest.Spied<typeof fetch>;

  beforeEach(() => {
    spiedFetch = jest.spyOn(globalThis, "fetch");

    spiedFetch.mockImplementation(() => {
      throw new Error("Unexpected fetch call");
    });
  });

  describe("by example", () => {
    describe("uses the provided fetch if any", () => {
      let mockedFetch: jest.MockedFunction<typeof fetch>;

      beforeEach(() => {
        mockedFetch = jest.fn<typeof fetch>(
          async () =>
            new Response(JSON.stringify(mockDefaultPresentation()), {
              status: 200,
            }),
        ) as jest.MockedFunction<typeof fetch>;
      });

      it("returnLegacyJsonld: true", async () => {
        await query(
          "https://some.endpoint/query",
          { query: [mockRequest] },
          { fetch: mockedFetch },
        );
        expect(mockedFetch).toHaveBeenCalled();
      });
      it("returnLegacyJsonld: false", async () => {
        await query(
          "https://some.endpoint/query",
          { query: [mockRequest] },
          {
            fetch: mockedFetch,
            returnLegacyJsonld: false,
          },
        );
        expect(mockedFetch).toHaveBeenCalled();
      });
    });

    describe("resolves when the VP contains no VCs", () => {
      let mockedFetch: jest.MockedFunction<typeof fetch>;

      beforeEach(() => {
        mockedFetch = jest.fn<typeof fetch>(
          async () =>
            new Response(
              JSON.stringify(
                mockPartialPresentation(undefined, defaultVerifiableClaims),
              ),
              {
                status: 200,
              },
            ),
        ) as jest.MockedFunction<typeof fetch>;
      });

      it("returnLegacyJsonld: true", async () => {
        await expect(
          query(
            "https://some.endpoint/query",
            { query: [mockRequest] },
            { fetch: mockedFetch },
          ),
        ).resolves.toMatchObject({
          id: "https://example.org/ns/someCredentialInstance",
        });
        expect(mockedFetch).toHaveBeenCalled();
      });
      it("returnLegacyJsonld: false", async () => {
        await expect(
          query(
            "https://some.endpoint/query",
            { query: [mockRequest] },
            {
              fetch: mockedFetch,
              returnLegacyJsonld: false,
            },
          ),
        ).resolves.toMatchObject({
          id: "https://example.org/ns/someCredentialInstance",
        });
        expect(mockedFetch).toHaveBeenCalled();
      });
    });

    describe.each([
      ["null", [null]],
      ["string", ["not a VC"]],
      ["empty object", [{}]],
      [
        "non empty object missing required VC properties",
        [
          {
            ...mockDefaultCredential(),
            proof: undefined,
          },
        ],
      ],
    ])(
      "errors if the presentation contains invalid verifiable credentials [%s]",
      (_, elems) => {
        const mockedFetch = jest.fn<typeof fetch>(
          async () =>
            // @ts-expect-error we are intentionall passing invalid VC types here to test for errors
            new Response(JSON.stringify(mockDefaultPresentation(elems)), {
              status: 200,
            }),
        ) as jest.MockedFunction<typeof fetch>;

        it.each([[true], [false]])(
          "[returnLegacyJsonld: %s]",
          async (returnLegacyJsonld) => {
            await expect(
              query(
                "https://some.endpoint/query",
                { query: [mockRequest] },
                {
                  fetch: mockedFetch,
                  returnLegacyJsonld,
                },
              ),
            ).rejects.toThrow();
          },
        );
      },
    );

    it.each([
      [{ returnLegacyJsonld: true }],
      [{ returnLegacyJsonld: false }],
      [undefined],
    ])(
      "defaults to an unauthenticated fetch if no fetch is provided [args: %s]",
      async (arg?: { returnLegacyJsonld?: boolean }) => {
        spiedFetch.mockResolvedValueOnce(
          new Response(JSON.stringify(mockDefaultPresentation()), {
            status: 200,
          }),
        );
        await query(
          "https://some.endpoint/query",
          { query: [mockRequest] },
          arg,
        );
        expect(spiedFetch).toHaveBeenCalled();
      },
    );

    it.each([[true], [false]])(
      "throws if the given endpoint returns an error [returnLegacyJsonld: %s]",
      async (returnLegacyJsonld) => {
        const mockedFetch = jest.fn<typeof fetch>(
          async () =>
            new Response(undefined, {
              status: 404,
            }),
        );
        await expect(() =>
          query(
            "https://example.org/query",
            { query: [mockRequest] },
            {
              fetch: mockedFetch,
              returnLegacyJsonld,
            },
          ),
        ).rejects.toThrow();
      },
    );

    it.each([[true], [false]])(
      "throws if the endpoint responds with a non-JSON payload [returnLegacyJsonld: %s]",
      async (returnLegacyJsonld) => {
        const mockedFetch = jest.fn<typeof fetch>(
          async () =>
            new Response("Not JSON", {
              status: 200,
            }),
        );
        await expect(() =>
          query(
            "https://example.org/query",
            { query: [mockRequest] },
            {
              fetch: mockedFetch,
              returnLegacyJsonld,
            },
          ),
        ).rejects.toThrow();
      },
    );

    it.each([[true], [false]])(
      "throws if the endpoint responds with a non-VP payload [returnLegacyJsonld: %s]",
      async (returnLegacyJsonld) => {
        await expect(() =>
          query(
            "https://example.org/query",
            { query: [mockRequest] },
            {
              fetch: async () =>
                new Response(JSON.stringify({ json: "but not a VP" }), {
                  status: 200,
                }),
              returnLegacyJsonld,
            },
          ),
        ).rejects.toThrow();
      },
    );

    it.each([[true], [false]])(
      "posts a request with the appropriate media type [returnLegacyJsonld: %s]",
      async (returnLegacyJsonld) => {
        const mockedFetch = jest.fn<typeof fetch>().mockResolvedValueOnce(
          new Response(JSON.stringify(mockDefaultPresentation()), {
            status: 200,
          }),
        );
        await query(
          "https://some.endpoint/query",
          { query: [mockRequest] },
          {
            fetch: mockedFetch,
            returnLegacyJsonld,
          },
        );
        expect(mockedFetch).toHaveBeenCalledWith(
          "https://some.endpoint/query",
          expect.objectContaining({
            headers: {
              "Content-Type": "application/json",
            },
            method: "POST",
          }),
        );
      },
    );

    it.each([[true], [false]])(
      "errors if no presentations exist [returnLegacyJsonld: %s]",
      async (returnLegacyJsonld) => {
        const mockedFetch = jest.fn<typeof fetch>().mockResolvedValueOnce(
          new Response(JSON.stringify([]), {
            status: 200,
          }),
        );
        await expect(
          query(
            "https://some.endpoint/query",
            { query: [mockRequest] },
            {
              fetch: mockedFetch,
              returnLegacyJsonld,
            },
          ),
        ).rejects.toThrow();
        expect(mockedFetch).toHaveBeenCalledWith(
          "https://some.endpoint/query",
          expect.objectContaining({
            headers: {
              "Content-Type": "application/json",
            },
            method: "POST",
          }),
        );
      },
    );

    it("returns the VP sent by the endpoint", async () => {
      const mockedFetch = jest.fn<typeof fetch>(
        async () =>
          new Response(JSON.stringify(mockDefaultPresentation()), {
            status: 200,
          }),
      );

      const vp = await query(
        "https://example.org/query",
        { query: [mockRequest] },
        { fetch: mockedFetch },
      );
      const vpNoLegacy = await query(
        "https://example.org/query",
        { query: [mockRequest] },
        {
          fetch: mockedFetch,
          returnLegacyJsonld: false,
        },
      );
      expect(vp).toMatchObject(mockDefaultPresentation());
      expect(JSON.parse(JSON.stringify(vp))).toEqual(mockDefaultPresentation());
      expect(JSON.parse(JSON.stringify(vpNoLegacy))).toEqual(
        mockDefaultPresentation(),
      );
    });

    it("returns the VP sent by the endpoint [using mock access grant]", async () => {
      const mockedFetch = jest.fn<typeof fetch>(
        async () =>
          new Response(JSON.stringify(mockAccessGrant()), {
            status: 200,
          }),
      );

      const vp = await query(
        "https://example.org/query",
        { query: [mockRequest] },
        { fetch: mockedFetch },
      );
      const vpNoLegacy = await query(
        "https://example.org/query",
        { query: [mockRequest] },
        {
          fetch: mockedFetch,
          returnLegacyJsonld: false,
        },
      );
      expect(vp).toMatchObject(mockAccessGrant());
      expect(JSON.parse(JSON.stringify(vp))).toEqual(mockAccessGrant());
      expect(JSON.parse(JSON.stringify(vpNoLegacy))).toEqual(mockAccessGrant());

      expect(vp.holder).toBe("https://vc.inrupt.com");
      expect(vp.type).toBe("VerifiablePresentation");
      // @ts-expect-error the `holder` property does not exist in the newer version of the API
      expect(vpNoLegacy.holder).toBeUndefined();
      // @ts-expect-error the `type` property does not exist in the newer version of the API
      expect(vpNoLegacy.type).toBeUndefined();

      expect(
        vp.match(
          null,
          rdf.type,
          namedNode(
            "https://www.w3.org/2018/credentials#VerifiablePresentation",
          ),
        ).size,
      ).toBe(1);
      expect(
        vp.match(null, cred.holder, namedNode("https://vc.inrupt.com")).size,
      ).toBe(1);
    });

    it("normalizes the VP sent by the endpoint", async () => {
      const mockedVc = mockDefaultCredential();
      // Force unexpected VC shapes to check normalization.
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      mockedVc.proof["https://w3id.org/security#proofValue"] =
        mockedVc.proof.proofValue;
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      delete mockedVc.proof.proofValue;
      const mockedFetch = jest.fn<typeof fetch>().mockResolvedValueOnce(
        new Response(JSON.stringify(mockDefaultPresentation([mockedVc])), {
          status: 200,
        }),
      );
      const resultVp = await query(
        "https://example.org/query",
        { query: [mockRequest] },
        { fetch: mockedFetch },
      );
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      expect(resultVp.verifiableCredential![0].proof.proofValue).toBe(
        mockDefaultCredential().proof.proofValue,
      );
      expect(
        /* eslint-disable @typescript-eslint/no-non-null-assertion */
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        resultVp.verifiableCredential![0].proof[
          "https://w3id.org/security#proofValue"
        ],
      ).toBeUndefined();
    });

    it("applies additional normalisation to the vc's according to the normalize function", async () => {
      const mockedVc = mockDefaultCredential();
      // Force unexpected VC shapes to check normalization.
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      mockedVc.proof["https://w3id.org/security#proofValue"] =
        mockedVc.proof.proofValue;
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      delete mockedVc.proof.proofValue;
      const mockedFetch = jest.fn<typeof fetch>().mockResolvedValueOnce(
        new Response(JSON.stringify(mockDefaultPresentation([mockedVc])), {
          status: 200,
        }),
      );
      const resultVp = await query(
        "https://example.org/query",
        { query: [mockRequest] },
        {
          fetch: mockedFetch,
          normalize(vc) {
            return {
              ...vc,
              type: [...vc.type, "http://example.org/my/extra/type"],
            };
          },
        },
      );
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      expect(resultVp.verifiableCredential![0].type).toContain(
        "http://example.org/my/extra/type",
      );
    });
  });
});
