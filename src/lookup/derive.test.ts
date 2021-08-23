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

import { jest, describe, it, expect } from "@jest/globals";
import { Response } from "cross-fetch";
import { mockDefaultCredential } from "../common/common.mock";
import getVerifiableCredentialAllFromShape from "./derive";

jest.mock("../fetcher");

describe("getVerifiableCredentialAllFromShape", () => {
  it("uses the provided mock if any", async () => {
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
    const mockedFetch = jest.requireMock("../fetcher") as {
      default: typeof fetch;
    };
    mockedFetch.default = jest.fn();
    try {
      await getVerifiableCredentialAllFromShape("https://some.endpoint", {
        "@context": ["https://some.context"],
        credentialSubject: { id: "https://some.subject/" },
      });
      // eslint-disable-next-line no-empty
    } catch (_e) {}
    expect(mockedFetch.default).toHaveBeenCalled();
  });

  it("posts a request with the appropriate media type", async () => {
    const mockedFetch = jest.requireMock("../fetcher") as {
      default: typeof fetch;
    };
    mockedFetch.default = jest.fn();
    try {
      await getVerifiableCredentialAllFromShape("https://some.endpoint", {
        "@context": ["https://some.context"],
        credentialSubject: { id: "https://some.subject/" },
      });
      // eslint-disable-next-line no-empty
    } catch (_e) {}
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
      getVerifiableCredentialAllFromShape("https://some.endpoint", {
        "@context": ["https://some.context"],
        credentialSubject: { id: "https://some.subject/" },
      })
    ).rejects.toThrow(/some.endpoint.*400.*Bad request/);
  });

  it("throws if the holder returns non-JSON response", async () => {
    const mockedFetch = jest.requireMock("../fetcher") as {
      default: typeof fetch;
    };
    mockedFetch.default = jest.fn().mockResolvedValue(
      new Response("Not a JSON", {
        status: 200,
        statusText: "OK",
      }) as never
    ) as typeof fetch;
    await expect(
      getVerifiableCredentialAllFromShape("https://some.endpoint", {
        "@context": ["https://some.context"],
        credentialSubject: { id: "https://some.subject/" },
      })
    ).rejects.toThrow(/some.endpoint.*Not a JSON/);
  });

  it("throws if the holder returns JSON response which isn't a Verifiable Credential", async () => {
    const mockedFetch = jest.requireMock("../fetcher") as {
      default: typeof fetch;
    };
    mockedFetch.default = jest.fn().mockResolvedValue(
      new Response(
        `${JSON.stringify({
          "@context": "https://some.context",
          someKey: "some value",
        })}`,
        {
          status: 200,
          statusText: "OK",
        }
      ) as never
    ) as typeof fetch;
    await expect(
      getVerifiableCredentialAllFromShape("https://some.endpoint", {
        "@context": ["https://some.context"],
        credentialSubject: { id: "https://some.subject/" },
      })
    ).rejects.toThrow(/some.endpoint.*unexpected.*someKey/);
  });

  it("throws if the holder returns a response with more than one pagination links", async () => {
    const mockedFetch = jest.requireMock("../fetcher") as {
      default: typeof fetch;
    };
    mockedFetch.default = jest.fn().mockResolvedValueOnce(
      new Response(JSON.stringify(mockDefaultCredential()), {
        status: 200,
        statusText: "OK",
        headers: {
          Link:
            '<https://some.endpoint/some-other-vc>; rel="next", <https://some.endpoint/yet-another-vc>; rel="next"',
        },
      }) as never
    ) as typeof fetch;
    await expect(
      getVerifiableCredentialAllFromShape("https://some.endpoint", {
        "@context": ["https://some.context"],
        credentialSubject: { id: "https://some.subject/" },
      })
    ).rejects.toThrow(/some.endpoint.*more than one/);
  });

  it("returns a VC on a successful response", async () => {
    const mockedFetch = jest.requireMock("../fetcher") as {
      default: typeof fetch;
    };
    mockedFetch.default = jest.fn().mockResolvedValue(
      new Response(JSON.stringify(mockDefaultCredential()), {
        status: 200,
        statusText: "OK",
      }) as never
    ) as typeof fetch;
    await expect(
      getVerifiableCredentialAllFromShape("https://some.endpoint", {
        "@context": ["https://some.context"],
        credentialSubject: { id: "https://some.subject/" },
      })
    ).resolves.toEqual([mockDefaultCredential()]);
  });

  it("crawls the rel=next Link headers to collect paginated VCs", async () => {
    const mockedFetch = jest.requireMock("../fetcher") as {
      default: typeof fetch;
    };
    mockedFetch.default = jest
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify(mockDefaultCredential()), {
          status: 200,
          statusText: "OK",
          headers: {
            Link: '<https://some.endpoint/some-other-vc>; rel="next"',
          },
        }) as never
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify(mockDefaultCredential()), {
          status: 200,
          statusText: "OK",
        }) as never
      ) as typeof fetch;
    await expect(
      getVerifiableCredentialAllFromShape("https://some.endpoint", {
        "@context": ["https://some.context"],
        credentialSubject: { id: "https://some.subject/" },
      })
    ).resolves.toEqual([mockDefaultCredential(), mockDefaultCredential()]);
    expect(mockedFetch.default).toHaveBeenCalledTimes(2);
    expect(mockedFetch.default).toHaveBeenLastCalledWith(
      "https://some.endpoint/some-other-vc"
    );
  });

  it("does not follow unrelated Link headers", async () => {
    const mockedFetch = jest.requireMock("../fetcher") as {
      default: typeof fetch;
    };
    mockedFetch.default = jest
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify(mockDefaultCredential()), {
          status: 200,
          statusText: "OK",
          headers: {
            Link: '<https://unrelated.url>; rel="some-relation"',
          },
        }) as never
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify(mockDefaultCredential()), {
          status: 200,
          statusText: "OK",
        }) as never
      ) as typeof fetch;
    await expect(
      getVerifiableCredentialAllFromShape("https://some.endpoint", {
        "@context": ["https://some.context"],
        credentialSubject: { id: "https://some.subject/" },
      })
    ).resolves.toEqual([mockDefaultCredential()]);
    expect(mockedFetch.default).toHaveBeenCalledTimes(1);
  });
});
