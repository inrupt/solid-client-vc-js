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

import { beforeAll, describe, expect, it, jest } from "@jest/globals";
import {
  mockAccessGrant,
  mockDefaultPresentation,
} from "../common/common.mock";
import { getCredentialSubject } from "../common/getters";
import defaultGetVerifilableCredentialAllFromShape, {
  getVerifiableCredentialAllFromShape,
} from "./derive";
import type * as QueryModule from "./query";

const mockDeriveEndpointDefaultResponse = (anoymous = false) =>
  new Response(
    JSON.stringify(anoymous ? mockAccessGrant() : mockDefaultPresentation()),
    {
      status: 200,
      statusText: "OK",
    },
  );

describe.each([
  ["named response", mockDeriveEndpointDefaultResponse],
  ["anonymous response", () => mockDeriveEndpointDefaultResponse(true)],
])("getVerifiableCredentialAllFromShape [%s]", (_, mockResponse) => {
  let spiedFetch: jest.Spied<typeof fetch>;

  beforeAll(() => {
    spiedFetch = jest.spyOn(globalThis, "fetch");

    spiedFetch.mockImplementation(() => {
      throw new Error("Unexpected fetch call");
    });
  });

  describe("legacy derive endpoint", () => {
    it("exposes a default export", async () => {
      expect(defaultGetVerifilableCredentialAllFromShape).toBe(
        getVerifiableCredentialAllFromShape,
      );
    });

    it.each([[true], [false]])(
      "uses the provided fetch if any [returnLegacyJsonld: %s]",
      async (returnLegacyJsonld) => {
        const mockedFetch = jest.fn() as typeof fetch;
        try {
          await getVerifiableCredentialAllFromShape(
            "https://some.endpoint",
            {
              "@context": ["https://some.context"],
              credentialSubject: { id: "https://some.subject/" },
            },
            {
              fetch: mockedFetch,
              returnLegacyJsonld,
            },
          );
          // eslint-disable-next-line no-empty
        } catch (_e) {}
        expect(mockedFetch).toHaveBeenCalled();
      },
    );

    it.each([[true], [false]])(
      "defaults to an unauthenticated fetch if no fetch is provided [returnLegacyJsonld: %s]",
      async (returnLegacyJsonld) => {
        spiedFetch.mockResolvedValue(mockResponse());
        await getVerifiableCredentialAllFromShape("https://some.endpoint", {
          "@context": ["https://some.context"],
          credentialSubject: { id: "https://some.subject/" },
          returnLegacyJsonld,
        });
        expect(spiedFetch).toHaveBeenCalled();
      },
    );

    it.each([[true], [false]])(
      "includes the expired VC options if requested [returnLegacyJsonld: %s]",
      async (returnLegacyJsonld) => {
        const mockedFetch = jest.fn<typeof fetch>(async () => mockResponse());
        await getVerifiableCredentialAllFromShape(
          "https://some.endpoint",
          {
            "@context": ["https://some.context"],
            credentialSubject: { id: "https://some.subject/" },
          },
          {
            includeExpiredVc: true,
            fetch: mockedFetch,
            returnLegacyJsonld,
          },
        );
        expect(mockedFetch).toHaveBeenCalledWith(
          expect.anything(),
          expect.objectContaining({
            body: expect.stringContaining("ExpiredVerifiableCredential"),
          }),
        );
      },
    );

    it.each([[true], [false]])(
      "builds a legacy VP request from the provided VC shape",
      async (returnLegacyJsonld) => {
        const mockedFetch = jest
          .fn<typeof fetch>()
          .mockResolvedValue(mockResponse());
        const queryModule = jest.requireActual("./query") as typeof QueryModule;
        const spiedQuery = jest.spyOn(queryModule, "query");
        await getVerifiableCredentialAllFromShape(
          "https://some.endpoint",
          {
            "@context": ["https://some.context"],
            credentialSubject: { id: "https://some.subject/" },
          },
          {
            fetch: mockedFetch,
            returnLegacyJsonld,
          },
        );
        expect(spiedQuery).toHaveBeenCalledWith(
          "https://some.endpoint",
          expect.objectContaining({
            verifiableCredential: {
              "@context": [
                "https://www.w3.org/2018/credentials/v1",
                "https://some.context",
              ],
              credentialSubject: { id: "https://some.subject/" },
            },
          }),
          expect.anything(),
        );
      },
    );

    it("returns the VCs from the obtained VP on a successful response", async () => {
      const vc = await getVerifiableCredentialAllFromShape(
        "https://some.endpoint",
        {
          "@context": ["https://some.context"],
          credentialSubject: { id: "https://some.subject/" },
        },
        { fetch: async () => mockResponse() },
      );

      expect(vc).toMatchObject(
        (await mockResponse().json()).verifiableCredential,
      );

      expect(JSON.parse(JSON.stringify(vc))).toEqual(
        (await mockResponse().json()).verifiableCredential,
      );
    });

    it("returns the VCs from the obtained VP on a successful response [returnLegacyJsonld: false]", async () => {
      const vc = await getVerifiableCredentialAllFromShape(
        "https://some.endpoint",
        {
          "@context": ["https://some.context"],
          credentialSubject: { id: "https://some.webid.provider/strelka" },
        },
        {
          fetch: async () => mockResponse(),
          returnLegacyJsonld: false,
        },
      );

      expect(vc).toMatchObject(
        mockDefaultPresentation().verifiableCredential!.map(() => ({
          id: "https://example.org/ns/someCredentialInstance",
        })),
      );

      expect<string[]>(vc.map((v) => getCredentialSubject(v).value)).toEqual(
        mockDefaultPresentation().verifiableCredential?.map(
          () => "https://some.webid.provider/strelka",
        ),
      );

      expect(JSON.parse(JSON.stringify(vc))).toEqual(
        (await mockResponse().json()).verifiableCredential,
      );
    });

    it.each([[true], [false]])(
      "returns an empty array if the VP contains no VCs [returnLegacyJsonld: %s]",
      async (returnLegacyJsonld) => {
        await expect(
          getVerifiableCredentialAllFromShape(
            "https://some.endpoint",
            {
              "@context": ["https://some.context"],
              credentialSubject: { id: "https://some.subject/" },
            },
            {
              fetch: async () =>
                new Response(
                  JSON.stringify({
                    ...mockDefaultPresentation(),
                    verifiableCredential: undefined,
                  }),
                  {
                    status: 200,
                    statusText: "OK",
                  },
                ),
              returnLegacyJsonld,
            },
          ),
        ).resolves.toEqual([]);
      },
    );
  });

  describe("standard query endpoint", () => {
    it.each([[true], [false]])(
      "builds a standard VP request by example from the provided VC shape [returnLegacyJsonld: %s]",
      async (returnLegacyJsonld) => {
        const queryModule = jest.requireActual("./query") as typeof QueryModule;
        const spiedQuery = jest.spyOn(queryModule, "query");
        const VC_SHAPE = {
          "@context": ["https://some.context"],
          credentialSubject: { id: "https://some.subject/" },
        };
        await getVerifiableCredentialAllFromShape(
          "https://some.endpoint/query",
          VC_SHAPE,
          {
            fetch: async () => mockResponse(),
            returnLegacyJsonld,
          },
        );

        expect(spiedQuery).toHaveBeenCalledWith(
          "https://some.endpoint/query",
          expect.objectContaining({
            query: [
              {
                type: "QueryByExample",
                credentialQuery: [
                  {
                    example: VC_SHAPE,
                  },
                ],
              },
            ],
          }),
          expect.anything(),
        );
      },
    );
  });
});
