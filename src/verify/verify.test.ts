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

import { describe, expect, it, jest } from "@jest/globals";
import { mocked } from "jest-mock";
import { DataFactory, Store } from "n3";
import type * as Common from "../common/common";
import {
  getVerifiableCredential,
  getVerifiableCredentialApiConfiguration,
  isVerifiableCredential,
  isVerifiablePresentation,
} from "../common/common";
import { isValidVc, isValidVerifiablePresentation } from "./verify";
import { jsonLdStringToStore } from "../parser/jsonld";
import { cred, rdf } from "../common/constants";
import {
  getHolder,
  getVpSubject,
} from "../common/isRdfjsVerifiablePresentation";

const { quad, namedNode, literal } = DataFactory;

jest.mock("../common/common", () => {
  return {
    verifiableCredentialToDataset:
      jest.requireActual<typeof Common>("../common/common")
        .verifiableCredentialToDataset,
    isVerifiablePresentation: jest.fn(),
    isVerifiableCredential: jest.fn(),
    getVerifiableCredential: jest.fn(
      jest.requireActual<typeof Common>("../common/common")
        .getVerifiableCredential,
    ),
    isUrl: jest.requireActual<typeof Common>("../common/common").isUrl,
    hasId: jest.requireActual<typeof Common>("../common/common").hasId,
    getVerifiableCredentialApiConfiguration: jest.fn(),
  };
});

const spiedFetch = jest.spyOn(globalThis, "fetch").mockImplementation(() => {
  throw new Error("Unexpected fetch call");
});

const MOCK_VC = {
  "@context": [
    "https://www.w3.org/2018/credentials/v1",
    "https://schema.inrupt.com/credentials/v1.jsonld",
    // "https://consent.pod.inrupt.com/credentials/v1",
  ],
  id: "https://example.com/id",
  issuer: "https://example.com/issuer",
  type: ["VerifiableCredential", "SolidAccessGrant"],
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
    type: "Ed25519Signature2018",
    verificationMethod: "https://consent.pod.inrupt.com/key/396f686b",
  },
};

describe("isValidVc", () => {
  const MOCK_VERIFY_ENDPOINT = "https://consent.example.com";
  const MOCK_VERIFY_RESPONSE = { checks: [], warning: [], errors: [] };

  it("falls back to an unauthenticated fetch if none is provided", async () => {
    spiedFetch.mockResolvedValueOnce(
      new Response(JSON.stringify(MOCK_VERIFY_RESPONSE), {
        status: 200,
      }),
    );
    await isValidVc(MOCK_VC, {
      verificationEndpoint: MOCK_VERIFY_ENDPOINT,
    });

    expect(spiedFetch).toHaveBeenCalled();
  });

  it("discovers the verification endpoint if none is provided", async () => {
    // First, the VC is fetche
    spiedFetch
      .mockResolvedValueOnce(
        new Response(JSON.stringify(MOCK_VC), { status: 200 }),
      )
      // Then, the verification endpoint is called
      .mockResolvedValueOnce(
        new Response(JSON.stringify(MOCK_VERIFY_RESPONSE), {
          status: 200,
        }),
      );
    const mockedDiscovery = mocked(
      getVerifiableCredentialApiConfiguration,
    ).mockResolvedValueOnce({
      verifierService: "https://some.vc.verifier",
      legacy: {},
      specCompliant: {},
    });

    await isValidVc(MOCK_VC);
    expect(mockedDiscovery).toHaveBeenCalledWith(MOCK_VC.issuer);
  });

  it("uses the provided fetch if any", async () => {
    const mockedFetch = jest.fn<typeof fetch>().mockResolvedValueOnce(
      new Response(JSON.stringify(MOCK_VERIFY_RESPONSE), {
        status: 200,
      }),
    );

    await isValidVc(MOCK_VC, {
      fetch: mockedFetch,
      verificationEndpoint: MOCK_VERIFY_ENDPOINT,
    });

    expect(mockedFetch).toHaveBeenCalled();
  });

  it("uses the provided fetch if any on RDFJS input", async () => {
    const mockedFetch = jest.fn<typeof fetch>().mockResolvedValueOnce(
      new Response(JSON.stringify(MOCK_VERIFY_RESPONSE), {
        status: 200,
      }),
    );

    await isValidVc(
      Object.assign(await jsonLdStringToStore(JSON.stringify(MOCK_VC)), {
        id: MOCK_VC.id,
      }),
      {
        fetch: mockedFetch,
        verificationEndpoint: MOCK_VERIFY_ENDPOINT,
      },
    );

    expect(mockedFetch).toHaveBeenCalled();
  });

  it("sends the given vc to the verify endpoint", async () => {
    mocked(getVerifiableCredentialApiConfiguration).mockResolvedValueOnce({
      verifierService: "https://some.vc.verifier",
      legacy: {},
      specCompliant: {},
    });

    const mockedFetch = jest.fn<typeof fetch>().mockResolvedValueOnce(
      new Response(JSON.stringify(MOCK_VERIFY_RESPONSE), {
        status: 200,
      }),
    );

    await isValidVc(MOCK_VC, {
      fetch: mockedFetch,
    });

    expect(mockedFetch).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        body: JSON.stringify({ verifiableCredential: MOCK_VC }),
      }),
    );
  });

  it("retrieves the vc if a url was passed", async () => {
    const mockedFetch = jest
      .fn(global.fetch)
      // First, the VC is fetched
      .mockResolvedValueOnce(
        new Response(JSON.stringify(MOCK_VC), { status: 200 }),
      )
      // Then, the verification endpoint is called
      .mockResolvedValueOnce(
        new Response(JSON.stringify(MOCK_VERIFY_RESPONSE), {
          status: 200,
        }),
      );

    await isValidVc("https://example.com/someVc", {
      fetch: mockedFetch as typeof fetch,
      verificationEndpoint: MOCK_VERIFY_ENDPOINT,
    });

    expect(getVerifiableCredential).toHaveBeenCalledWith(
      "https://example.com/someVc",
      {
        fetch: mockedFetch,
        verificationEndpoint: "https://consent.example.com",
      },
    );
  });

  it("throws if looking up the passed url fails", async () => {
    const mockedFetch = jest
      .fn(global.fetch)
      .mockResolvedValueOnce(
        new Response(undefined, { status: 400, statusText: "Failed" }),
      );
    await expect(
      isValidVc("https://example.com/someVc", {
        fetch: mockedFetch as typeof fetch,
        verificationEndpoint: MOCK_VERIFY_ENDPOINT,
      }),
    ).rejects.toThrow(
      "Fetching the Verifiable Credential [https://example.com/someVc] failed: 400 Failed",
    );
  });

  it("throws if the VC does not have an ID", async () => {
    const mockedFetch = jest
      .fn(global.fetch)
      .mockResolvedValueOnce(
        new Response(undefined, { status: 400, statusText: "Failed" }),
      );
    await expect(
      isValidVc(
        { ...MOCK_VC, id: undefined as unknown as string },
        {
          fetch: mockedFetch as typeof fetch,
          verificationEndpoint: MOCK_VERIFY_ENDPOINT,
        },
      ),
    ).rejects.toThrow(
      "Expected vc.id to be a string, found [undefined] of type [undefined] on",
    );
  });

  it("throws if looking up the passed url doesn't resolve to JSON", async () => {
    const mockedFetch = jest
      .fn(global.fetch)
      .mockResolvedValueOnce(new Response("Not a valid JSON."));
    await expect(
      isValidVc("https://example.com/someVc", {
        fetch: mockedFetch as typeof fetch,
        verificationEndpoint: MOCK_VERIFY_ENDPOINT,
      }),
    ).rejects.toThrow(
      "Parsing the Verifiable Credential [https://example.com/someVc] as JSON failed:",
    );
  });

  it("throws if the passed url returns a non-vc", async () => {
    const mockedFetch = jest
      .fn(global.fetch)
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ someField: "Not a credential" })),
      );
    mocked(isVerifiableCredential).mockReturnValueOnce(false);

    await expect(
      isValidVc("https://example.com/someVc", {
        fetch: mockedFetch as typeof fetch,
        verificationEndpoint: MOCK_VERIFY_ENDPOINT,
      }),
    ).rejects.toThrow(
      "The value received from [https://example.com/someVc] is not a Verifiable Credential",
    );
  });

  it("uses the provided verification endpoint if any", async () => {
    const mockedFetch = jest.fn<typeof fetch>().mockResolvedValueOnce(
      new Response(JSON.stringify(MOCK_VERIFY_RESPONSE), {
        status: 200,
      }),
    );

    await isValidVc(MOCK_VC, {
      fetch: mockedFetch,
      verificationEndpoint: "https://some.verification.api",
    });
    expect(mockedFetch).toHaveBeenCalledWith(
      "https://some.verification.api",
      expect.anything(),
    );
    expect(getVerifiableCredentialApiConfiguration).not.toHaveBeenCalled();
  });

  it("throws if no verification endpoint is discovered", async () => {
    mocked(getVerifiableCredentialApiConfiguration).mockResolvedValueOnce({
      legacy: {},
      specCompliant: {},
    });

    const mockedFetch = jest
      .fn(global.fetch)
      // First, the VC is fetched
      .mockResolvedValueOnce(
        new Response(JSON.stringify(MOCK_VC), { status: 200 }),
      )
      // Then, the verification endpoint is called
      .mockResolvedValueOnce(
        new Response(JSON.stringify(MOCK_VERIFY_RESPONSE), {
          status: 200,
        }),
      );

    await expect(
      isValidVc(MOCK_VC, {
        fetch: mockedFetch,
      }),
    ).rejects.toThrow(
      `The VC service provider ${MOCK_VC.issuer} does not advertize for a verifier service in its .well-known/vc-configuration document`,
    );
  });

  it("throws if the verification endpoint returns an error", async () => {
    const mockedFetch = jest.fn<typeof fetch>().mockResolvedValueOnce(
      new Response(undefined, {
        status: 400,
        statusText: "Bad request",
      }),
    );

    await expect(
      isValidVc(MOCK_VC, {
        fetch: mockedFetch as typeof fetch,
        verificationEndpoint: MOCK_VERIFY_ENDPOINT,
      }),
    ).rejects.toThrow(/consent\.example\.com.*400 Bad request/);
  });

  it("throws if the verification endpoint does not return a valid JSON", async () => {
    const mockedFetch = jest
      .fn(global.fetch)
      .mockResolvedValueOnce(new Response("Not a valid JSON"));

    await expect(
      isValidVc(MOCK_VC, {
        fetch: mockedFetch as typeof fetch,
        verificationEndpoint: MOCK_VERIFY_ENDPOINT,
      }),
    ).rejects.toThrow(/Parsing.*consent\.example\.com/);
  });

  it("returns the validation result from the access endpoint", async () => {
    const mockedFetch = jest.fn<typeof fetch>().mockResolvedValueOnce(
      new Response(JSON.stringify(MOCK_VERIFY_RESPONSE), {
        status: 200,
      }),
    );

    await expect(
      isValidVc(MOCK_VC, {
        fetch: mockedFetch,
        verificationEndpoint: "https://some.verification.api",
      }),
    ).resolves.toEqual({ checks: [], errors: [], warning: [] });
  });
});
describe("isValidVerifiable Presentation", () => {
  const MOCK_VP = {
    "@context": ["https://www.w3.org/2018/credentials/v1"],
    type: "VerifiablePresentation",
    verifiableCredential: [MOCK_VC],
    holder: "https://vc.inrupt.com",
  };
  const MOCK_VERIFY_ENDPOINT = "https://consent.example.com";
  const MOCK_VERIFY_RESPONSE = { checks: [], warning: [], errors: [] };

  it("falls back to the embedded fetch if none is provided", async () => {
    spiedFetch.mockResolvedValueOnce(
      new Response(JSON.stringify(MOCK_VERIFY_RESPONSE), {
        status: 200,
      }),
    );
    await expect(
      isValidVerifiablePresentation(MOCK_VERIFY_ENDPOINT, MOCK_VP),
    ).resolves.toMatchObject({ errors: [] });

    expect(spiedFetch).toHaveBeenCalled();
  });

  it("uses the provided fetch if any", async () => {
    const mockedFetch = jest.fn<typeof fetch>().mockResolvedValueOnce(
      new Response(JSON.stringify(MOCK_VERIFY_RESPONSE), {
        status: 200,
      }),
    );
    mocked(isVerifiablePresentation).mockReturnValueOnce(true);
    await isValidVerifiablePresentation(MOCK_VERIFY_ENDPOINT, MOCK_VP, {
      fetch: mockedFetch,
      domain: "domain",
      challenge: "challenge",
    });

    expect(mockedFetch).toHaveBeenCalled();
  });

  it("sends the given vp to the verify endpoint", async () => {
    mocked(isVerifiablePresentation).mockReturnValueOnce(true);
    const mockedFetch = jest.fn<typeof fetch>().mockResolvedValueOnce(
      new Response(JSON.stringify(MOCK_VERIFY_RESPONSE), {
        status: 200,
      }),
    );

    await isValidVerifiablePresentation(MOCK_VERIFY_ENDPOINT, MOCK_VP, {
      fetch: mockedFetch,
      domain: "domain",
      challenge: "challenge",
    });

    expect(mockedFetch).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        body: JSON.stringify({
          verifiablePresentation: MOCK_VP,
          options: { domain: "domain", challenge: "challenge" },
        }),
      }),
    );
  });

  it("uses the provided verification endpoint if any", async () => {
    const mockedFetch = jest.fn<typeof fetch>().mockResolvedValueOnce(
      new Response(JSON.stringify(MOCK_VERIFY_RESPONSE), {
        status: 200,
      }),
    );
    mocked(isVerifiablePresentation).mockReturnValueOnce(true);

    await isValidVerifiablePresentation(
      "https://some.verification.api",
      MOCK_VP,
      {
        fetch: mockedFetch,
      },
    );
    expect(mockedFetch).toHaveBeenCalledWith(
      "https://some.verification.api",
      expect.anything(),
    );
    expect(getVerifiableCredentialApiConfiguration).not.toHaveBeenCalled();
  });

  it("discovers the verification endpoint if none is provided", async () => {
    const mockedDiscovery = mocked(
      getVerifiableCredentialApiConfiguration,
    ).mockResolvedValueOnce({
      verifierService: "https://some.vc.verifier",
      legacy: {},
      specCompliant: {},
    });
    mocked(isVerifiablePresentation).mockReturnValueOnce(true);

    const mockedFetch = jest.fn<typeof fetch>().mockResolvedValueOnce(
      new Response(JSON.stringify(MOCK_VERIFY_RESPONSE), {
        status: 200,
      }),
    );

    await isValidVerifiablePresentation(null, MOCK_VP, {
      fetch: mockedFetch,
    });
    expect(mockedDiscovery).toHaveBeenCalledWith(MOCK_VP.holder);
  });

  it("throws if no verification endpoint is discovered", async () => {
    mocked(getVerifiableCredentialApiConfiguration).mockResolvedValueOnce({
      legacy: {},
      specCompliant: {},
    });
    mocked(isVerifiablePresentation).mockReturnValueOnce(true);
    const mockedFetch = jest.fn<typeof fetch>().mockResolvedValueOnce(
      new Response(JSON.stringify(MOCK_VERIFY_RESPONSE), {
        status: 200,
      }),
    );

    await expect(
      isValidVerifiablePresentation(null, MOCK_VP, {
        fetch: mockedFetch,
      }),
    ).rejects.toThrow(
      `The VC service provider ${MOCK_VP.holder} does not advertize for a verifier service in its .well-known/vc-configuration document`,
    );
  });

  it("throws if passed VP is not a verifiable presentation [because the VC has no id]", async () => {
    const mockedFetch = jest.fn<typeof fetch>();
    mocked(isVerifiablePresentation).mockReturnValueOnce(false);

    const MOCK_VP_NO_ID = {
      ...MOCK_VP,
      verifiableCredential: [
        {
          ...MOCK_VC,
          id: undefined as unknown as string,
        },
      ],
    };

    await expect(
      isValidVerifiablePresentation(MOCK_VERIFY_ENDPOINT, MOCK_VP_NO_ID, {
        fetch: mockedFetch as typeof fetch,
      }),
    ).rejects.toThrow(
      `Expected vc.id to be a string, found [undefined] of type [undefined] on ${JSON.stringify(
        {
          ...MOCK_VC,
          id: undefined as unknown as string,
        },
        null,
        "  ",
      )}`,
    );
  });

  it("throws if passed VP is not a verifiable presentation [because it is the wrong type]", async () => {
    const mockedFetch = jest.fn<typeof fetch>();
    mocked(isVerifiablePresentation).mockReturnValueOnce(false);

    const MOCK_VP_NO_ID = Object.assign(
      await jsonLdStringToStore(JSON.stringify(MOCK_VP)),
      { verifiableCredential: [] },
    );
    for (const quadToDelete of MOCK_VP_NO_ID.match(
      null,
      rdf.type,
      null,
      null,
    )) {
      MOCK_VP_NO_ID.delete(quadToDelete);
    }

    await expect(
      isValidVerifiablePresentation(MOCK_VERIFY_ENDPOINT, MOCK_VP_NO_ID, {
        fetch: mockedFetch as typeof fetch,
      }),
    ).rejects.toThrow("Expected exactly one Verifiable Presentation. Found 0.");
  });

  it("throws if passed VP is not a verifiable presentation [because it has too many holders]", async () => {
    const mockedFetch = jest.fn<typeof fetch>();
    mocked(isVerifiablePresentation).mockReturnValueOnce(false);

    const MOCK_VP_EXTRA_HOLDER = Object.assign(
      await jsonLdStringToStore(JSON.stringify(MOCK_VP)),
      { verifiableCredential: [] },
    );
    MOCK_VP_EXTRA_HOLDER.add(
      quad(
        getVpSubject(MOCK_VP_EXTRA_HOLDER),
        cred.holder,
        namedNode("http://example.org/another/holder"),
      ),
    );

    expect(() =>
      getHolder(MOCK_VP_EXTRA_HOLDER, getVpSubject(MOCK_VP_EXTRA_HOLDER)),
    ).toThrow("Could not find a valid holder");
    await expect(
      isValidVerifiablePresentation(
        MOCK_VERIFY_ENDPOINT,
        MOCK_VP_EXTRA_HOLDER,
        {
          fetch: mockedFetch as typeof fetch,
        },
      ),
    ).rejects.toThrow(
      "The request to [[object Object]] returned an unexpected response",
    );
  });

  it("throws if passed VP is not a verifiable presentation [included VC is missing type]", async () => {
    const mockedFetch = jest.fn<typeof fetch>();
    mocked(isVerifiablePresentation).mockReturnValueOnce(false);

    const VC_STORE = await jsonLdStringToStore(JSON.stringify(MOCK_VC));
    VC_STORE.delete(
      quad(namedNode(MOCK_VC.id), rdf.type, cred.VerifiableCredential),
    );

    const MOCK_VP_EXTRA_HOLDER = Object.assign(
      await jsonLdStringToStore(JSON.stringify(MOCK_VP)),
      { verifiableCredential: [Object.assign(VC_STORE, { id: MOCK_VC.id })] },
    );
    await expect(
      isValidVerifiablePresentation(
        MOCK_VERIFY_ENDPOINT,
        MOCK_VP_EXTRA_HOLDER,
        {
          fetch: mockedFetch as typeof fetch,
        },
      ),
    ).rejects.toThrow(
      "The request to [[object Object]] returned an unexpected response",
    );
    await expect(
      isValidVc(Object.assign(VC_STORE, { id: MOCK_VC.id }), {
        fetch: mockedFetch as typeof fetch,
      }),
    ).rejects.toThrow(
      "The request to [[object Object]] returned an unexpected response",
    );
  });

  it("throws if passed VP is not a verifiable presentation [because it has an invalid subject]", async () => {
    const mockedFetch = jest.fn<typeof fetch>();
    mocked(isVerifiablePresentation).mockReturnValueOnce(false);

    const MOCK_VP_NO_TYPE = new Store([
      // @ts-expect-error literals should not be subjects of triples
      quad(literal("vp subpect"), rdf.type, cred.VerifiablePresentation),
    ]);

    await expect(
      // @ts-expect-error the vp is also missing the verifiableCredential property
      isValidVerifiablePresentation(MOCK_VERIFY_ENDPOINT, MOCK_VP_NO_TYPE, {
        fetch: mockedFetch as typeof fetch,
      }),
    ).rejects.toThrow(
      "Expected VP subject to be NamedNode or BlankNode. Instead found [vp subpect] with termType [Literal]",
    );
  });

  it("throws if response is not valid JSON", async () => {
    const mockedFetch = jest.fn<typeof fetch>().mockResolvedValueOnce(
      new Response(`some non-JSON response`, {
        status: 200,
      }),
    );
    mocked(isVerifiablePresentation).mockReturnValueOnce(true);

    await expect(
      isValidVerifiablePresentation(MOCK_VERIFY_ENDPOINT, MOCK_VP, {
        fetch: mockedFetch as typeof fetch,
      }),
    ).rejects.toThrow(
      `Parsing the response of the verification service hosted at [${MOCK_VERIFY_ENDPOINT}] as JSON failed:`,
    );
  });

  it("throws if the verification endpoint returns an error", async () => {
    const mockedFetch = jest.fn<typeof fetch>().mockResolvedValueOnce(
      new Response(undefined, {
        status: 400,
        statusText: "Bad request",
      }),
    );
    mocked(isVerifiablePresentation).mockReturnValueOnce(true);

    await expect(
      isValidVerifiablePresentation(MOCK_VERIFY_ENDPOINT, MOCK_VP, {
        fetch: mockedFetch as typeof fetch,
      }),
    ).rejects.toThrow(/consent\.example\.com.*400 Bad request/);
  });

  it("returns the validation result from the verification endpoint", async () => {
    const mockedFetch = jest.fn<typeof fetch>().mockResolvedValueOnce(
      new Response(JSON.stringify(MOCK_VERIFY_RESPONSE), {
        status: 200,
      }),
    );
    mocked(isVerifiablePresentation).mockReturnValueOnce(true);
    await expect(
      isValidVerifiablePresentation(MOCK_VERIFY_ENDPOINT, MOCK_VP, {
        fetch: mockedFetch as typeof fetch,
      }),
    ).resolves.toEqual({ checks: [], errors: [], warning: [] });
  });
});
