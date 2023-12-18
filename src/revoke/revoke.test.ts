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

import { jest, it, describe, expect } from "@jest/globals";
import defaultRevokeVerifiableCredential, {
  revokeVerifiableCredential,
} from "./revoke";

const spiedFetch = jest.spyOn(globalThis, "fetch").mockImplementation(() => {
  throw new Error("Unexpected fetch call");
});

describe("revokeVerifiableCredential", () => {
  it("exposes a default export", async () => {
    expect(defaultRevokeVerifiableCredential).toBe(revokeVerifiableCredential);
  });
  it("uses the provided fetch if any", async () => {
    const mockedFetch = jest.fn() as typeof fetch;
    try {
      await revokeVerifiableCredential(
        "https://some.endpoint",
        "https://some.example#credential",
        {
          fetch: mockedFetch,
        },
      );
      // eslint-disable-next-line no-empty
    } catch (_e) {}
    expect(mockedFetch).toHaveBeenCalled();
  });

  it("defaults to an unauthenticated fetch if no fetch is provided", async () => {
    try {
      await revokeVerifiableCredential(
        "https://some.endpoint",
        "https://some.example#credential",
      );
      // eslint-disable-next-line no-empty
    } catch (_e) {}
    expect(spiedFetch).toHaveBeenCalled();
  });

  it("throws if the issuer returns an error", async () => {
    const mockedFetch = jest.fn<typeof fetch>().mockResolvedValue(
      new Response(undefined, {
        status: 400,
        statusText: "Bad request",
      }),
    );
    await expect(
      revokeVerifiableCredential(
        "https://some.endpoint",
        "https://some.example#credential",
        { fetch: mockedFetch },
      ),
    ).rejects.toThrow(/some.endpoint.*400.*Bad request/);
  });

  it("sends an appropriate revocation request to the issuer", async () => {
    const mockedFetch = jest.fn<typeof fetch>().mockResolvedValue(
      new Response(undefined, {
        status: 200,
        statusText: "OK",
      }),
    );
    await revokeVerifiableCredential(
      "https://some.endpoint",
      "https://some.example#credential",
      {
        fetch: mockedFetch,
      },
    );
    expect(mockedFetch).toHaveBeenCalledWith(
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
              status: "1",
            },
          ],
        }),
      }),
    );
  });
});
