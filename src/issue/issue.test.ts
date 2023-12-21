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
import { defaultContext, defaultCredentialTypes } from "../common/common";
import { mockDefaultCredential } from "../common/common.mock";
import { issueVerifiableCredential } from "./issue";

describe("issueVerifiableCredential", () => {
  it("uses the provided fetch if any", async () => {
    const mockedFetch = jest.fn() as typeof fetch;
    try {
      await issueVerifiableCredential(
        "https://some.endpoint",
        { "@context": ["https://some.context"] },
        { "@context": ["https://some.context"] },
        {
          fetch: mockedFetch,
        },
      );
      // eslint-disable-next-line no-empty
    } catch (_e) {}
    expect(mockedFetch).toHaveBeenCalled();
  });

  it("defaults to an unauthenticated fetch if no fetch is provided", async () => {
    const spiedFetch = jest
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response());
    try {
      await issueVerifiableCredential(
        "https://some.endpoint",
        { "@context": ["https://some.context"] },
        { "@context": ["https://some.context"] },
      );
      // eslint-disable-next-line no-empty
    } catch (_e) {}
    expect(spiedFetch).toHaveBeenCalled();
  });

  it("throws if the issuer returns an error", async () => {
    const mockedFetch = jest.fn<typeof fetch>().mockResolvedValueOnce(
      new Response(undefined, {
        status: 400,
        statusText: "Bad request",
      }),
    );
    await expect(
      issueVerifiableCredential(
        "https://some.endpoint",
        { "@context": ["https://some.context"] },
        { "@context": ["https://some.context"] },
        { fetch: mockedFetch },
      ),
    ).rejects.toThrow(
      /https:\/\/some\.endpoint.*could not successfully issue a VC.*400.*Bad request/,
    );
  });

  it("throws if the returned value does not conform to the shape we expect", async () => {
    const mockedFetch = jest.fn<typeof fetch>().mockResolvedValueOnce(
      new Response(JSON.stringify({ someField: "Not a credential" }), {
        status: 201,
      }),
    );
    await expect(
      issueVerifiableCredential(
        "https://some.endpoint",
        { "@context": ["https://some.context"] },
        { "@context": ["https://some.context"] },
        { fetch: mockedFetch },
      ),
    ).rejects.toThrow(
      "Parsing the Verifiable Credential [undefined] as JSON failed: Error: Cannot establish id of verifiable credential",
    );
  });

  it("returns the VC issued by the target issuer", async () => {
    const mockedFetch = jest.fn<typeof fetch>().mockResolvedValueOnce(
      new Response(JSON.stringify(mockDefaultCredential()), {
        status: 201,
        headers: new Headers([["content-type", "application/ld+json"]]),
      }),
    );

    const vc = await issueVerifiableCredential(
      "https://some.endpoint",
      { "@context": ["https://some.context"] },
      { "@context": ["https://some.context"] },
      { fetch: mockedFetch },
    );

    expect(vc).toMatchObject({ ...mockDefaultCredential(), size: 13 });

    expect(JSON.parse(JSON.stringify(vc))).toEqual(mockDefaultCredential());
  });

  it("sends a request to the specified issuer", async () => {
    const mockedFetch = jest.fn<typeof fetch>();
    try {
      await issueVerifiableCredential(
        "https://some.endpoint",
        { "@context": ["https://some.context"] },
        { "@context": ["https://some.context"] },
        { fetch: mockedFetch },
      );
      // eslint-disable-next-line no-empty
    } catch (_e) {}
    expect(mockedFetch).toHaveBeenCalledWith(
      "https://some.endpoint",
      expect.anything(),
    );
  });

  it("sends a POST request with the appropriate headers", async () => {
    const mockedFetch = jest.fn<typeof fetch>();
    try {
      await issueVerifiableCredential(
        "https://some.endpoint",
        { "@context": ["https://some.context"] },
        { "@context": ["https://some.context"] },
        { fetch: mockedFetch },
      );
      // eslint-disable-next-line no-empty
    } catch (_e) {}
    expect(mockedFetch).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      }),
    );
  });

  it("includes the subject and subject claims in the request body", async () => {
    const mockedFetch = jest.fn<typeof fetch>();
    try {
      await issueVerifiableCredential(
        "https://some.endpoint",
        { "@context": ["https://some-subject.context"], aClaim: "a value" },
        undefined,
        { fetch: mockedFetch },
      );
      // eslint-disable-next-line no-empty
    } catch (_e) {}
    expect(mockedFetch).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        body: JSON.stringify({
          credential: {
            "@context": [...defaultContext, "https://some-subject.context"],
            type: defaultCredentialTypes,
            credentialSubject: {
              aClaim: "a value",
            },
          },
        }),
      }),
    );
  });

  it("includes the credential claims in the request body", async () => {
    const mockedFetch = jest.fn<typeof fetch>();
    try {
      await issueVerifiableCredential(
        "https://some.endpoint",
        { "@context": ["https://some-subject.context"] },
        { "@context": ["https://some-credential.context"], aClaim: "a value" },
        { fetch: mockedFetch },
      );
      // eslint-disable-next-line no-empty
    } catch (_e) {}
    expect(mockedFetch).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        body: JSON.stringify({
          credential: {
            "@context": [
              ...defaultContext,
              "https://some-subject.context",
              "https://some-credential.context",
            ],
            type: defaultCredentialTypes,
            aClaim: "a value",
            credentialSubject: {},
          },
        }),
      }),
    );
  });

  it("includes the credential type in the request body", async () => {
    const mockedFetch = jest.fn<typeof fetch>();
    try {
      await issueVerifiableCredential(
        "https://some.endpoint",
        { "@context": ["https://some-subject.context"] },
        { "@context": ["https://some-credential.context"], type: "some-type" },
        { fetch: mockedFetch },
      );
      // eslint-disable-next-line no-empty
    } catch (_e) {}
    expect(mockedFetch).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        body: JSON.stringify({
          credential: {
            "@context": [
              ...defaultContext,
              "https://some-subject.context",
              "https://some-credential.context",
            ],
            type: [...defaultCredentialTypes, "some-type"],
            credentialSubject: {},
          },
        }),
      }),
    );
  });

  it("supports credentials with multiple types", async () => {
    const mockedFetch = jest.fn<typeof fetch>();
    try {
      await issueVerifiableCredential(
        "https://some.endpoint",
        { "@context": ["https://some-subject.context"] },
        {
          "@context": ["https://some-credential.context"],
          type: ["some-type", "some-other-type"],
        },
        {
          fetch: mockedFetch,
        },
      );
      // eslint-disable-next-line no-empty
    } catch (_e) {}
    expect(mockedFetch).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        body: JSON.stringify({
          credential: {
            "@context": [
              ...defaultContext,
              "https://some-subject.context",
              "https://some-credential.context",
            ],
            type: [...defaultCredentialTypes, "some-type", "some-other-type"],
            credentialSubject: {},
          },
        }),
      }),
    );
  });

  it("handles inline contexts for the claims", async () => {
    const mockedFetch = jest.fn<typeof fetch>();
    try {
      await issueVerifiableCredential(
        "https://some.endpoint",
        {
          "@context": {
            con: "https://some-subject.context",
            aClaim: "con:aClaim",
          },
          aClaim: "a value",
        },
        { "@context": ["https://some-credential.context"] },
        {
          fetch: mockedFetch,
        },
      );
      // eslint-disable-next-line no-empty
    } catch (_e) {}
    expect(mockedFetch).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        body: JSON.stringify({
          credential: {
            "@context": [
              ...defaultContext,
              { con: "https://some-subject.context", aClaim: "con:aClaim" },
              "https://some-credential.context",
            ],
            type: defaultCredentialTypes,
            credentialSubject: {
              aClaim: "a value",
            },
          },
        }),
      }),
    );
  });

  it("normalizes the issued VC", async () => {
    const mockedVc = mockDefaultCredential("http://example.org/my/sample/id");
    // Force unexpected VC shapes to check normalization.
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    mockedVc.proof["https://w3id.org/security#proofValue"] =
      mockedVc.proof.proofValue;
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    delete mockedVc.proof.proofValue;
    const mockedFetch = jest.fn<typeof fetch>().mockResolvedValueOnce(
      new Response(JSON.stringify(mockedVc), {
        status: 201,
        headers: new Headers([["content-type", "application/json"]]),
      }),
    );
    const resultVc = await issueVerifiableCredential(
      "https://some.endpoint",
      { "@context": ["https://some-subject.context"] },
      {
        "@context": ["https://some-credential.context"],
        type: ["some-type", "some-other-type"],
      },
      {
        fetch: mockedFetch,
      },
    );
    expect(resultVc.proof.proofValue).toBe(
      mockDefaultCredential().proof.proofValue,
    );
    expect(
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      resultVc.proof["https://w3id.org/security#proofValue"],
    ).toBeUndefined();
  });
});
