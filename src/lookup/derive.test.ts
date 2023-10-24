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
import { mockDefaultPresentation } from "../common/common.mock";
import defaultGetVerifilableCredentialAllFromShape, {
  getVerifiableCredentialAllFromShape,
} from "./derive";
import type * as QueryModule from "./query";
import type { VerifiableCredential } from "../common/common";

jest.mock("@inrupt/universal-fetch", () => {
  const fetchModule = jest.requireActual(
    "@inrupt/universal-fetch",
  ) as typeof UniversalFetch;
  return {
    ...fetchModule,
    fetch: jest.fn<(typeof UniversalFetch)["fetch"]>(),
  };
});

const mockDeriveEndpointDefaultResponse = () =>
  new Response(JSON.stringify(mockDefaultPresentation()), {
    status: 200,
    statusText: "OK",
  });

describe("getVerifiableCredentialAllFromShape", () => {
  describe("legacy derive endpoint", () => {
    it("exposes a default export", async () => {
      expect(defaultGetVerifilableCredentialAllFromShape).toBe(
        getVerifiableCredentialAllFromShape,
      );
    });
    it("uses the provided fetch if any", async () => {
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
          },
        );
        // eslint-disable-next-line no-empty
      } catch (_e) {}
      expect(mockedFetch).toHaveBeenCalled();
    });

    it("defaults to an unauthenticated fetch if no fetch is provided", async () => {
      const mockedFetch = jest.requireMock(
        "@inrupt/universal-fetch",
      ) as jest.Mocked<typeof UniversalFetch>;
      mockedFetch.fetch.mockResolvedValue(mockDeriveEndpointDefaultResponse());
      await getVerifiableCredentialAllFromShape("https://some.endpoint", {
        "@context": ["https://some.context"],
        credentialSubject: { id: "https://some.subject/" },
      });
      expect(mockedFetch.fetch).toHaveBeenCalled();
    });

    it("includes the expired VC options if requested", async () => {
      const mockedFetch = jest
        .fn<(typeof UniversalFetch)["fetch"]>()
        .mockResolvedValue(mockDeriveEndpointDefaultResponse());
      await getVerifiableCredentialAllFromShape(
        "https://some.endpoint",
        {
          "@context": ["https://some.context"],
          credentialSubject: { id: "https://some.subject/" },
        },
        {
          includeExpiredVc: true,
          fetch: mockedFetch,
        },
      );
      expect(mockedFetch).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          body: expect.stringContaining("ExpiredVerifiableCredential"),
        }),
      );
    });

    it("builds a legacy VP request from the provided VC shape", async () => {
      const mockedFetch = jest
        .fn<(typeof UniversalFetch)["fetch"]>()
        .mockResolvedValue(mockDeriveEndpointDefaultResponse());
      const queryModule = jest.requireActual("./query") as typeof QueryModule;
      const spiedQuery = jest.spyOn(queryModule, "query");
      await getVerifiableCredentialAllFromShape(
        "https://some.endpoint",
        {
          "@context": ["https://some.context"],
          credentialSubject: { id: "https://some.subject/" },
        },
        { fetch: mockedFetch },
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
    });

    it("returns the VCs from the obtained VP on a successful response", async () => {
      const mockedFetch = jest
        .fn<(typeof UniversalFetch)["fetch"]>()
        .mockResolvedValue(mockDeriveEndpointDefaultResponse());

      const vc = await getVerifiableCredentialAllFromShape(
        "https://some.endpoint",
        {
          "@context": ["https://some.context"],
          credentialSubject: { id: "https://some.subject/" },
        },
        { fetch: mockedFetch },
      );

      expect(vc).toMatchObject(
        mockDefaultPresentation()
          .verifiableCredential as VerifiableCredential[],
      );

      expect(JSON.parse(JSON.stringify(vc))).toEqual(
        mockDefaultPresentation().verifiableCredential,
      );
    });

    it("returns an empty array if the VP contains no VCs", async () => {
      const mockedFetch = jest
        .fn<(typeof UniversalFetch)["fetch"]>()
        .mockResolvedValue(
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
          { fetch: mockedFetch },
        ),
      ).resolves.toEqual([]);
    });
  });

  describe("standard query endpoint", () => {
    it("builds a standard VP request by example from the provided VC shape", async () => {
      const mockedFetch = jest
        .fn<(typeof UniversalFetch)["fetch"]>()
        .mockResolvedValue(mockDeriveEndpointDefaultResponse());
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
          fetch: mockedFetch,
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
    });
  });
});
