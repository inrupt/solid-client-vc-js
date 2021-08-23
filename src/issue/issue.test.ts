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
import { mockDefaultCredential } from "../common/common.mock";
import issueVerifiableCredential, { defaultContext } from "./issue";

jest.mock("../fetcher");

describe("issueVerifiableCredential", () => {
  it("uses the provided mock if any", async () => {
    const mockedFetch = jest.fn() as typeof fetch;
    try {
      await issueVerifiableCredential(
        "https://some.endpoint",
        "htps://some.subject",
        { "@context": ["https://some.context"] },
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
      await issueVerifiableCredential(
        "https://some.endpoint",
        "htps://some.subject",
        { "@context": ["https://some.context"] }
      );
      // eslint-disable-next-line no-empty
    } catch (_e) {}
    expect(mockedFetch.default).toHaveBeenCalled();
  });

  it("throws if the issuer returns an error", async () => {
    const mockedFetch = jest.requireMock("../fetcher") as {
      default: typeof fetch;
    };
    mockedFetch.default = jest.fn().mockReturnValueOnce({
      status: 400,
      statusText: "Bad request",
    }) as typeof fetch;
    await expect(
      issueVerifiableCredential(
        "https://some.endpoint",
        "https://some.subject",
        { "@context": ["https://some.context"] }
      )
    ).rejects.toThrow(
      /https:\/\/some\.endpoint.*could not successfully issue a VC.*https:\/\/some.subject.*400.*Bad request/
    );
  });

  it("throws if thee returned value does not conform to the shape we expect", async () => {
    const mockedFetch = jest.requireMock("../fetcher") as {
      default: typeof fetch;
    };
    mockedFetch.default = jest.fn().mockReturnValueOnce({
      ok: true,
      status: 201,
      json: jest.fn().mockReturnValueOnce({ someField: "Not a credential" }),
    }) as typeof fetch;
    await expect(
      issueVerifiableCredential(
        "https://some.endpoint",
        "htps://some.subject",
        { "@context": ["https://some.context"] }
      )
    ).rejects.toThrow("unexpected object: ");
  });

  it("returns the VC issued by the target issuer", async () => {
    const mockedFetch = jest.requireMock("../fetcher") as {
      default: typeof fetch;
    };
    mockedFetch.default = jest.fn().mockReturnValueOnce({
      ok: true,
      status: 201,
      json: jest.fn().mockReturnValueOnce(mockDefaultCredential()),
    }) as typeof fetch;
    await expect(
      issueVerifiableCredential(
        "https://some.endpoint",
        "htps://some.subject",
        { "@context": ["https://some.context"] }
      )
    ).resolves.toEqual(mockDefaultCredential());
  });

  it("sends a request to the specified issuer", async () => {
    const mockedFetch = jest.requireMock("../fetcher") as {
      default: typeof fetch;
    };
    mockedFetch.default = jest.fn();
    try {
      await issueVerifiableCredential(
        "https://some.endpoint",
        "htps://some.subject",
        { "@context": ["https://some.context"] }
      );
      // eslint-disable-next-line no-empty
    } catch (_e) {}
    expect(mockedFetch.default).toHaveBeenCalledWith(
      "https://some.endpoint",
      expect.anything()
    );
  });

  it("sends a POST request with the appropriate headers", async () => {
    const mockedFetch = jest.requireMock("../fetcher") as {
      default: typeof fetch;
    };
    mockedFetch.default = jest.fn();
    try {
      await issueVerifiableCredential(
        "https://some.endpoint",
        "htps://some.subject",
        { "@context": ["https://some.context"] }
      );
      // eslint-disable-next-line no-empty
    } catch (_e) {}
    expect(mockedFetch.default).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      })
    );
  });

  it("includes the subject and claims in the request body", async () => {
    const mockedFetch = jest.requireMock("../fetcher") as {
      default: typeof fetch;
    };
    mockedFetch.default = jest.fn();
    try {
      await issueVerifiableCredential(
        "https://some.endpoint",
        "htps://some.subject",
        { "@context": ["https://some.context"], aClaim: "a value" }
      );
      // eslint-disable-next-line no-empty
    } catch (_e) {}
    expect(mockedFetch.default).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        body: JSON.stringify({
          credential: {
            "@context": [...defaultContext, "https://some.context"],
            credentialSubject: {
              id: "htps://some.subject",
              aClaim: "a value",
            },
          },
        }),
      })
    );
  });

  it("handles inline contexts for the claims", async () => {
    const mockedFetch = jest.requireMock("../fetcher") as {
      default: typeof fetch;
    };
    mockedFetch.default = jest.fn();
    try {
      await issueVerifiableCredential(
        "https://some.endpoint",
        "htps://some.subject",
        {
          "@context": { con: "https://some.context", aClaim: "con:aClaim" },
          aClaim: "a value",
        }
      );
      // eslint-disable-next-line no-empty
    } catch (_e) {}
    expect(mockedFetch.default).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        body: JSON.stringify({
          credential: {
            "@context": [
              ...defaultContext,
              { con: "https://some.context", aClaim: "con:aClaim" },
            ],
            credentialSubject: {
              id: "htps://some.subject",
              aClaim: "a value",
            },
          },
        }),
      })
    );
  });
});
