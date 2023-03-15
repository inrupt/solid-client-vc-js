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

import { jest, it, describe, expect } from "@jest/globals";
import { Response } from "@inrupt/universal-fetch";
import { query, QueryByExample } from "./query";
import type * as Fetcher from "../fetcher";
import {
  mockDefaultCredential,
  mockDefaultPresentation,
} from "../common/common.mock";

jest.mock("../fetcher");

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
  describe("by example", () => {
    it("uses the provided fetch if any", async () => {
      const mockedFetch = jest.fn<typeof fetch>().mockResolvedValueOnce(
        new Response(JSON.stringify(mockDefaultPresentation()), {
          status: 200,
        })
      );
      await query(
        "https://some.endpoint/query",
        { query: [mockRequest] },
        { fetch: mockedFetch }
      );
      expect(mockedFetch).toHaveBeenCalled();
    });

    it("defaults to the embedded fetcher if no fetch is provided", async () => {
      const mockedFetch = jest.requireMock("../fetcher") as jest.Mocked<
        typeof Fetcher
      >;
      mockedFetch.default.mockResolvedValueOnce(
        new Response(JSON.stringify(mockDefaultPresentation()), {
          status: 200,
        })
      );
      await query("https://some.endpoint/query", { query: [mockRequest] });
      expect(mockedFetch.default).toHaveBeenCalled();
    });

    it("throws if the given endpoint returns an error", async () => {
      const mockedFetch = jest.fn<typeof fetch>().mockResolvedValueOnce(
        new Response(undefined, {
          status: 404,
        })
      );
      await expect(() =>
        query(
          "https://example.org/query",
          { query: [mockRequest] },
          { fetch: mockedFetch }
        )
      ).rejects.toThrow();
    });

    it("throws if the endpoint responds with a non-JSON payload", async () => {
      const mockedFetch = jest.fn<typeof fetch>().mockResolvedValueOnce(
        new Response("Not JSON", {
          status: 200,
        })
      );
      await expect(() =>
        query(
          "https://example.org/query",
          { query: [mockRequest] },
          { fetch: mockedFetch }
        )
      ).rejects.toThrow();
    });

    it("throws if the endpoint responds with a non-VP payload", async () => {
      const mockedFetch = jest.fn<typeof fetch>().mockResolvedValueOnce(
        new Response(JSON.stringify({ json: "but not a VP" }), {
          status: 200,
        })
      );
      await expect(() =>
        query(
          "https://example.org/query",
          { query: [mockRequest] },
          { fetch: mockedFetch }
        )
      ).rejects.toThrow();
    });

    it("posts a request with the appropriate media type", async () => {
      const mockedFetch = jest.fn<typeof fetch>().mockResolvedValueOnce(
        new Response(JSON.stringify(mockDefaultPresentation()), {
          status: 200,
        })
      );
      await query(
        "https://some.endpoint/query",
        { query: [mockRequest] },
        { fetch: mockedFetch }
      );
      expect(mockedFetch).toHaveBeenCalledWith(
        "https://some.endpoint/query",
        expect.objectContaining({
          headers: {
            "Content-Type": "application/json",
          },
          method: "POST",
        })
      );
    });

    it("returns the VP sent by the endpoint", async () => {
      const mockedFetch = jest.fn<typeof fetch>().mockResolvedValueOnce(
        new Response(JSON.stringify(mockDefaultPresentation()), {
          status: 200,
        })
      );
      await expect(
        query(
          "https://example.org/query",
          { query: [mockRequest] },
          { fetch: mockedFetch }
        )
      ).resolves.toStrictEqual(mockDefaultPresentation());
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
        })
      );
      const resultVp = await query(
        "https://example.org/query",
        { query: [mockRequest] },
        { fetch: mockedFetch }
      );
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      expect(resultVp.verifiableCredential![0].proof.proofValue).toBe(
        mockDefaultCredential().proof.proofValue
      );
      expect(
        /* eslint-disable @typescript-eslint/no-non-null-assertion */
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        resultVp.verifiableCredential![0].proof[
          "https://w3id.org/security#proofValue"
        ]
      ).toBeUndefined();
    });
  });
});
