/**
 * Copyright 2021 Inrupt Inc.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal in
 * the Software without restriction, including without limitation the rights to use,
 * copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the
 * Software, and to permit persons to whom the Software is furnished to do so,
 * subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED,
 * INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A
 * PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
 * HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
 * OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
 * SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

import { jest, it, describe, expect } from "@jest/globals";
import { Response } from "cross-fetch";
import revokeVerifiableCredential from "./revoke";

jest.mock("../fetcher");

describe("revokeVerifiableCredential", () => {
  it("uses the provided mock if any", async () => {
    const mockedFetch = jest.fn() as typeof fetch;
    try {
      await revokeVerifiableCredential(
        "https://some.endpoint",
        "https://some.example#credential",
        {
          fetch: mockedFetch,
        }
      );
      // eslint-disable-next-line no-empty
    } catch (_e) {}
    expect(mockedFetch).toHaveBeenCalled();
  });

  it("defaults to the embedded fetcher if no fetch is provided", async () => {
    const mockedFetch = jest.requireMock("../fetcher") as {
      default: typeof fetch;
    };
    mockedFetch.default = jest.fn();
    try {
      await revokeVerifiableCredential(
        "https://some.endpoint",
        "https://some.example#credential"
      );
      // eslint-disable-next-line no-empty
    } catch (_e) {}
    expect(mockedFetch.default).toHaveBeenCalled();
  });

  it("throws if the issuer returns an error", async () => {
    const mockedFetch = jest.requireMock("../fetcher") as {
      default: typeof fetch;
    };
    mockedFetch.default = jest.fn().mockResolvedValue(
      new Response("", {
        status: 400,
        statusText: "Bad request",
      }) as never
    ) as typeof fetch;
    await expect(
      revokeVerifiableCredential(
        "https://some.endpoint",
        "https://some.example#credential"
      )
    ).rejects.toThrow(/some.endpoint.*400.*Bad request/);
  });

  it("sends an appropriate revocation request to the issuer", async () => {
    const mockedFetch = jest.requireMock("../fetcher") as {
      default: typeof fetch;
    };
    mockedFetch.default = jest.fn().mockResolvedValue(
      new Response("", {
        status: 200,
        statusText: "OK",
      }) as never
    ) as typeof fetch;
    await revokeVerifiableCredential(
      "https://some.endpoint",
      "https://some.example#credential"
    );
    expect(mockedFetch.default).toHaveBeenCalledWith(
      "https://some.endpoint",
      expect.objectContaining({
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          credentialId: "https://some.example#credential",
          credentialStatus: [
            {
              type: "RevocationList2020Status",
              status: "0",
            },
          ],
        }),
      })
    );
  });
});
