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
import { Response } from "@inrupt/universal-fetch";
import { describe, expect, it, jest } from "@jest/globals";
import {
  mockAccessGrant,
  mockDefaultPresentation,
} from "../common/common.mock";
import { getCredentialSubject } from "../common/getters";
import defaultGetVerifilableCredentialAllFromShape, {
  getVerifiableCredentialAllFromShape,
} from "./derive";
import type * as QueryModule from "./query";

jest.mock("@inrupt/universal-fetch", () => {
  const fetchModule = jest.requireActual(
    "@inrupt/universal-fetch",
  ) as typeof UniversalFetch;
  return {
    ...fetchModule,
    fetch: jest.fn<(typeof UniversalFetch)["fetch"]>(),
  };
});

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
              fetch: mockedFetch as (typeof UniversalFetch)["fetch"],
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
        const mockedFetch = jest.requireMock(
          "@inrupt/universal-fetch",
        ) as jest.Mocked<typeof UniversalFetch>;
        mockedFetch.fetch.mockResolvedValue(mockResponse());
        await getVerifiableCredentialAllFromShape("https://some.endpoint", {
          "@context": ["https://some.context"],
          credentialSubject: { id: "https://some.subject/" },
          returnLegacyJsonld,
        });
        expect(mockedFetch.fetch).toHaveBeenCalled();
      },
    );

    it.each([[true], [false]])(
      "includes the expired VC options if requested [returnLegacyJsonld: %s]",
      async (returnLegacyJsonld) => {
        const mockedFetch = jest
          .fn<(typeof UniversalFetch)["fetch"]>()
          .mockResolvedValue(mockResponse());
        await getVerifiableCredentialAllFromShape(
          "https://some.endpoint",
          {
            "@context": ["https://some.context"],
            credentialSubject: { id: "https://some.subject/" },
          },
          {
            includeExpiredVc: true,
            fetch: mockedFetch as (typeof UniversalFetch)["fetch"],
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
          .fn<(typeof UniversalFetch)["fetch"]>()
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
            fetch: mockedFetch as (typeof UniversalFetch)["fetch"],
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
      const mockedFetch = jest
        .fn<(typeof UniversalFetch)["fetch"]>()
        .mockResolvedValue(mockResponse());

      const vc = await getVerifiableCredentialAllFromShape(
        "https://some.endpoint",
        {
          "@context": ["https://some.context"],
          credentialSubject: { id: "https://some.subject/" },
        },
        { fetch: mockedFetch as (typeof UniversalFetch)["fetch"] },
      );

      expect(vc).toMatchObject(
        (await mockResponse().json()).verifiableCredential,
      );

      expect(JSON.parse(JSON.stringify(vc))).toEqual(
        (await mockResponse().json()).verifiableCredential,
      );
    });

    it("returns the VCs from the obtained VP on a successful response [returnLegacyJsonld: false]", async () => {
      const mockedFetch = jest
        .fn<(typeof UniversalFetch)["fetch"]>()
        .mockResolvedValue(mockResponse());

      const vc = await getVerifiableCredentialAllFromShape(
        "https://some.endpoint",
        {
          "@context": ["https://some.context"],
          credentialSubject: { id: "https://some.webid.provider/strelka" },
        },
        {
          fetch: mockedFetch as (typeof UniversalFetch)["fetch"],
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
        const mockedFetch = jest.fn<(typeof UniversalFetch)["fetch"]>(
          async () =>
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
        );
        await expect(
          getVerifiableCredentialAllFromShape(
            "https://some.endpoint",
            {
              "@context": ["https://some.context"],
              credentialSubject: { id: "https://some.subject/" },
            },
            {
              fetch: mockedFetch as (typeof UniversalFetch)["fetch"],
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
        const mockedFetch = jest
          .fn<(typeof UniversalFetch)["fetch"]>()
          .mockResolvedValue(mockResponse());
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
            fetch: mockedFetch as (typeof UniversalFetch)["fetch"],
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
