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
import { mocked } from "jest-mock";
import {
  getVerifiableCredentialApiConfiguration,
  isVerifiableCredential,
} from "../common/common";
import isValidVc from "./verify";
import fallbackFetch from "../fetcher";

jest.mock("../common/common");
jest.mock("../fetcher");

describe("isValidVc", () => {
  const MOCK_VC = {
    "@context": [
      "https://www.w3.org/2018/credentials/v1",
      "https://consent.pod.inrupt.com/credentials/v1",
    ],
    id: "https://example.com/id",
    issuer: "https://example.com/issuer",
    type: ["VerifiableCredential", "SolidCredential", "SolidAccessGrant"],
    issuanceDate: "2021-05-26T16:40:03",
    expirationDate: "2021-06-09T16:40:03",
    credentialSubject: {
      id: "https://pod.inrupt.com/alice/profile/card#me",
      providedConsent: {
        mode: ["http://www.w3.org/ns/auth/acl#Read"],
        hasStatus: "ConsentStatusExplicitlyGiven",
        forPersonalData: "https://pod.inrupt.com/alice/private/data",
        forPurpose: "https://example.com/SomeSpecificPurpose",
        isProvidedToPerson: "https://pod.inrupt.com/bob/profile/card#me",
      },
    },
    proof: {
      created: "2021-05-26T16:40:03.009Z",
      proofPurpose: "assertionMethod",
      proofValue: "eqp8h_kL1DwJCpn65z-d1Arnysx6b11...jb8j0MxUCc1uDQ",
      type: "Ed25519Signature2020",
      verificationMethod: "https://consent.pod.inrupt.com/key/396f686b",
    },
  };
  const MOCK_VERIFY_ENDPOINT = "https://consent.example.com";
  const MOCK_VERIFY_RESPONSE = { checks: [], warning: [], errors: [] };

  it("falls back to the embedded fetch if none is provided", async () => {
    const mockedFetch = jest.requireMock("../fetcher") as jest.Mocked<{
      default: typeof fetch;
    }>;
    mocked(isVerifiableCredential).mockReturnValueOnce(true);
    mockedFetch.default.mockResolvedValueOnce(
      new Response(JSON.stringify(MOCK_VERIFY_RESPONSE), {
        status: 200,
      })
    );
    await isValidVc(MOCK_VC, {
      verificationEndpoint: MOCK_VERIFY_ENDPOINT,
    });

    expect(fallbackFetch).toHaveBeenCalled();
  });

  it("uses the provided fetch if any", async () => {
    const mockedFetch = jest.fn(global.fetch).mockResolvedValueOnce(
      new Response(JSON.stringify(MOCK_VERIFY_RESPONSE), {
        status: 200,
      })
    );
    mocked(isVerifiableCredential).mockReturnValueOnce(true);
    await isValidVc(MOCK_VC, {
      fetch: mockedFetch,
      verificationEndpoint: MOCK_VERIFY_ENDPOINT,
    });

    expect(mockedFetch).toHaveBeenCalled();
  });

  it("sends the given vc to the verify endpoint", async () => {
    mocked(getVerifiableCredentialApiConfiguration).mockResolvedValueOnce({
      verifierService: "https://some.vc.verifier",
    });
    mocked(isVerifiableCredential).mockReturnValueOnce(true);
    const mockedFetch = jest.fn(global.fetch).mockResolvedValueOnce(
      new Response(JSON.stringify(MOCK_VERIFY_RESPONSE), {
        status: 200,
      })
    );

    await isValidVc(MOCK_VC, {
      fetch: mockedFetch,
    });

    expect(mockedFetch).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        body: JSON.stringify({ verifiableCredential: MOCK_VC }),
      })
    );
  });

  it("retrieves the vc if a url was passed", async () => {
    const mockedFetch = jest
      .fn(global.fetch)
      // First, the VC is fetched
      .mockResolvedValueOnce(
        new Response(JSON.stringify(MOCK_VC), { status: 200 })
      )
      // Then, the verification endpoint is called
      .mockResolvedValueOnce(
        new Response(JSON.stringify(MOCK_VERIFY_RESPONSE), {
          status: 200,
        })
      );
    mocked(isVerifiableCredential).mockReturnValueOnce(true);
    await isValidVc("https://example.com/someVc", {
      fetch: mockedFetch as typeof fetch,
      verificationEndpoint: MOCK_VERIFY_ENDPOINT,
    });

    expect(mockedFetch).toHaveBeenCalledWith("https://example.com/someVc");
  });

  it("throws if looking up the passed url fails", async () => {
    const mockedFetch = jest
      .fn(global.fetch)
      .mockResolvedValueOnce(
        new Response(undefined, { status: 400, statusText: "Failed" })
      );
    await expect(
      isValidVc("https://example.com/someVc", {
        fetch: mockedFetch as typeof fetch,
        verificationEndpoint: MOCK_VERIFY_ENDPOINT,
      })
    ).rejects.toThrow(/example.com\/someVc.*400 Failed/);
  });

  it("throws if looking up the passed url doesn't resolve to JSON", async () => {
    const mockedFetch = jest
      .fn(global.fetch)
      .mockResolvedValueOnce(new Response("Not a valid JSON."));
    await expect(
      isValidVc("https://example.com/someVc", {
        fetch: mockedFetch as typeof fetch,
        verificationEndpoint: MOCK_VERIFY_ENDPOINT,
      })
    ).rejects.toThrow(/Parsing.*example.com\/someVc/);
  });

  it("throws if the passed url returns a non-vc", async () => {
    const mockedFetch = jest
      .fn(global.fetch)
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ someField: "Not a credential" }))
      );
    mocked(isVerifiableCredential).mockReturnValueOnce(false);

    await expect(
      isValidVc("https://example.com/someVc", {
        fetch: mockedFetch as typeof fetch,
        verificationEndpoint: MOCK_VERIFY_ENDPOINT,
      })
    ).rejects.toThrow(
      "The request to [https://example.com/someVc] returned an unexpected response:"
    );
  });

  it("uses the provided verification endpoint if any", async () => {
    const mockedFetch = jest.fn(global.fetch).mockResolvedValueOnce(
      new Response(JSON.stringify(MOCK_VERIFY_RESPONSE), {
        status: 200,
      })
    );
    mocked(isVerifiableCredential).mockReturnValueOnce(true);

    await isValidVc(MOCK_VC, {
      fetch: mockedFetch,
      verificationEndpoint: "https://some.verification.api",
    });
    expect(mockedFetch).toHaveBeenCalledWith(
      "https://some.verification.api",
      expect.anything()
    );
    expect(getVerifiableCredentialApiConfiguration).not.toHaveBeenCalled();
  });

  it("discovers the verification endpoint if none is provided", async () => {
    const mockedDiscovery = mocked(
      getVerifiableCredentialApiConfiguration
    ).mockResolvedValueOnce({
      verifierService: "https://some.vc.verifier",
    });
    mocked(isVerifiableCredential).mockReturnValueOnce(true);

    const mockedFetch = jest.requireMock("../fetcher") as jest.Mocked<{
      default: typeof fetch;
    }>;
    // First, the VC is fetched
    mockedFetch.default
      .mockResolvedValueOnce(
        new Response(JSON.stringify(MOCK_VC), { status: 200 })
      )
      // Then, the verification endpoint is called
      .mockResolvedValueOnce(
        new Response(JSON.stringify(MOCK_VERIFY_RESPONSE), {
          status: 200,
        })
      );

    await isValidVc(MOCK_VC);
    expect(mockedDiscovery).toHaveBeenCalledWith(MOCK_VC.issuer);
  });

  it("throws if no verification endpoint is discovered", async () => {
    mocked(getVerifiableCredentialApiConfiguration).mockResolvedValueOnce({});
    mocked(isVerifiableCredential).mockReturnValueOnce(true);
    const mockedFetch = jest
      .fn(global.fetch)
      // First, the VC is fetched
      .mockResolvedValueOnce(
        new Response(JSON.stringify(MOCK_VC), { status: 200 })
      )
      // Then, the verification endpoint is called
      .mockResolvedValueOnce(
        new Response(JSON.stringify(MOCK_VERIFY_RESPONSE), {
          status: 200,
        })
      );

    await expect(
      isValidVc(MOCK_VC, {
        fetch: mockedFetch,
      })
    ).rejects.toThrow(
      `The VC service provider ${MOCK_VC.issuer} does not advertize for a verifier service in its .well-known/vc-configuration document`
    );
  });

  it("throws if the verification endpoint returns an error", async () => {
    const mockedFetch = jest.fn(global.fetch).mockResolvedValueOnce(
      new Response(undefined, {
        status: 400,
        statusText: "Bad request",
      })
    );
    mocked(isVerifiableCredential).mockReturnValueOnce(true);

    await expect(
      isValidVc(MOCK_VC, {
        fetch: mockedFetch as typeof fetch,
        verificationEndpoint: MOCK_VERIFY_ENDPOINT,
      })
    ).rejects.toThrow(/consent\.example\.com.*400 Bad request/);
  });

  it("throws if the verification endpoint does not return a valid JSON", async () => {
    const mockedFetch = jest
      .fn(global.fetch)
      .mockResolvedValueOnce(new Response("Not a valid JSON"));
    mocked(isVerifiableCredential).mockReturnValueOnce(true);

    await expect(
      isValidVc(MOCK_VC, {
        fetch: mockedFetch as typeof fetch,
        verificationEndpoint: MOCK_VERIFY_ENDPOINT,
      })
    ).rejects.toThrow(/Parsing.*consent\.example\.com/);
  });

  it("returns the validation result from the access endpoint", async () => {
    const mockedFetch = jest.fn(global.fetch).mockResolvedValueOnce(
      new Response(JSON.stringify(MOCK_VERIFY_RESPONSE), {
        status: 200,
      })
    );
    mocked(isVerifiableCredential).mockReturnValueOnce(true);

    await expect(
      isValidVc(MOCK_VC, {
        fetch: mockedFetch,
        verificationEndpoint: "https://some.verification.api",
      })
    ).resolves.toEqual({ checks: [], errors: [], warning: [] });
  });
});
