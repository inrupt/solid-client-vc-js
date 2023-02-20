//
// Copyright 2022 Inrupt Inc.
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
import { mockDefaultPresentation } from "../common/common.mock";
import defaultGetVerifilableCredentialAllFromShape, {
  getVerifiableCredentialAllFromShape,
} from "./derive";
import type * as QueryModule from "./query";

jest.mock("../fetcher");

const mockFetch = (response: Response) => {
  const mockedFetch = jest.requireMock("../fetcher") as {
    default: typeof fetch;
  };
  mockedFetch.default = jest.fn(fetch).mockResolvedValue(response);
  return mockedFetch;
};

const mockDeriveEndpointDefaultResponse = () =>
  new Response(JSON.stringify(mockDefaultPresentation()), {
    status: 200,
    statusText: "OK",
  });

describe("getVerifiableCredentialAllFromShape", () => {
  describe("legacy derive endpoint", () => {
    it("exposes a default export", async () => {
      expect(defaultGetVerifilableCredentialAllFromShape).toBe(
        getVerifiableCredentialAllFromShape
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
          }
        );
        // eslint-disable-next-line no-empty
      } catch (_e) {}
      expect(mockedFetch).toHaveBeenCalled();
    });

    it("defaults to the embedded fetcher if no fetch is provided", async () => {
      const mockedFetch = mockFetch(mockDeriveEndpointDefaultResponse());
      await getVerifiableCredentialAllFromShape("https://some.endpoint", {
        "@context": ["https://some.context"],
        credentialSubject: { id: "https://some.subject/" },
      });
      expect(mockedFetch.default).toHaveBeenCalled();
    });

    it("includes the expired VC options if requested", async () => {
      const mockedFetch = mockFetch(mockDeriveEndpointDefaultResponse());
      await getVerifiableCredentialAllFromShape(
        "https://some.endpoint",
        {
          "@context": ["https://some.context"],
          credentialSubject: { id: "https://some.subject/" },
        },
        {
          includeExpiredVc: true,
        }
      );
      expect(mockedFetch.default).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          body: expect.stringContaining("ExpiredVerifiableCredential"),
        })
      );
    });

    it("builds a legacy VP request from the provided VC shape", async () => {
      mockFetch(mockDeriveEndpointDefaultResponse());
      const queryModule = jest.requireActual("./query") as typeof QueryModule;
      const spiedQuery = jest.spyOn(queryModule, "query");
      await getVerifiableCredentialAllFromShape("https://some.endpoint", {
        "@context": ["https://some.context"],
        credentialSubject: { id: "https://some.subject/" },
      });
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
        expect.anything()
      );
    });

    it("returns the VCs from the obtained VP on a successful response", async () => {
      mockFetch(mockDeriveEndpointDefaultResponse());
      await expect(
        getVerifiableCredentialAllFromShape("https://some.endpoint", {
          "@context": ["https://some.context"],
          credentialSubject: { id: "https://some.subject/" },
        })
      ).resolves.toEqual(mockDefaultPresentation().verifiableCredential);
    });

    it("returns an empty array if the VP contains no VCs", async () => {
      mockFetch(
        new Response(
          JSON.stringify({
            ...mockDefaultPresentation(),
            verifiableCredential: undefined,
          }),
          {
            status: 200,
            statusText: "OK",
          }
        )
      );
      await expect(
        getVerifiableCredentialAllFromShape("https://some.endpoint", {
          "@context": ["https://some.context"],
          credentialSubject: { id: "https://some.subject/" },
        })
      ).resolves.toEqual([]);
    });
  });

  describe("standard query endpoint", () => {
    it("builds a standard VP request by example from the provided VC shape", async () => {
      mockFetch(mockDeriveEndpointDefaultResponse());
      const queryModule = jest.requireActual("./query") as typeof QueryModule;
      const spiedQuery = jest.spyOn(queryModule, "query");
      const VC_SHAPE = {
        "@context": ["https://some.context"],
        credentialSubject: { id: "https://some.subject/" },
      };
      await getVerifiableCredentialAllFromShape(
        "https://some.endpoint/query",
        VC_SHAPE
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
        expect.anything()
      );
    });
  });
});
