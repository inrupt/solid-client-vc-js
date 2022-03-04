/**
 * Copyright 2022 Inrupt Inc.
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

import { jest, describe, it, expect } from "@jest/globals";
import { Response } from "cross-fetch";
import { mockDefaultPresentation } from "../common/common.mock";
import getVerifiableCredentialAllFromShape from "./derive";

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

  it("posts a request with the appropriate media type", async () => {
    const mockedFetch = mockFetch(mockDeriveEndpointDefaultResponse());
    await getVerifiableCredentialAllFromShape("https://some.endpoint", {
      "@context": ["https://some.context"],
      credentialSubject: { id: "https://some.subject/" },
    });
    expect(mockedFetch.default).toHaveBeenCalledWith(
      "https://some.endpoint",
      expect.objectContaining({
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
      })
    );
  });

  it("throws if the holder returns an error", async () => {
    mockFetch(
      new Response(undefined, {
        status: 400,
        statusText: "Bad request",
      })
    );
    await expect(
      getVerifiableCredentialAllFromShape("https://some.endpoint", {
        "@context": ["https://some.context"],
        credentialSubject: { id: "https://some.subject/" },
      })
    ).rejects.toThrow(/some.endpoint.*400.*Bad request/);
  });

  it("throws if the holder returns non-JSON response", async () => {
    mockFetch(
      new Response("Not a JSON", {
        status: 200,
        statusText: "OK",
      })
    );
    await expect(
      getVerifiableCredentialAllFromShape("https://some.endpoint", {
        "@context": ["https://some.context"],
        credentialSubject: { id: "https://some.subject/" },
      })
    ).rejects.toThrow(/some.endpoint.*parsing failed.*Unexpected token/);
  });

  it("throws if the holder returns JSON response which isn't a Verifiable Presentation", async () => {
    mockFetch(
      new Response(
        `${JSON.stringify({
          "@context": "https://some.context",
          someKey: "some value",
        })}`,
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
    ).rejects.toThrow(/some.endpoint.*Verifiable Presentation/);
  });

  it("returns the VCs from the obtained VP on a successful response", async () => {
    const mockedFetch = mockFetch(mockDeriveEndpointDefaultResponse());
    await expect(
      getVerifiableCredentialAllFromShape("https://some.endpoint", {
        "@context": ["https://some.context"],
        credentialSubject: { id: "https://some.subject/" },
      })
    ).resolves.toEqual(mockDefaultPresentation().verifiableCredential);
    expect(mockedFetch.default).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        body: JSON.stringify({
          verifiableCredential: {
            "@context": [
              "https://www.w3.org/2018/credentials/v1",
              "https://some.context",
            ],
            credentialSubject: { id: "https://some.subject/" },
          },
        }),
      })
    );
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
