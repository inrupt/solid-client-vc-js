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
import {
  mockSolidDatasetFrom,
  getSolidDataset,
  buildThing,
  setThing,
} from "@inrupt/solid-client";
import type * as SolidClient from "@inrupt/solid-client";
import { getVerifiableCredentialApiConfiguration } from "./common";

jest.mock("@inrupt/solid-client", () => {
  const solidClientModule = jest.requireActual<typeof SolidClient>(
    "@inrupt/solid-client",
  );
  solidClientModule.getSolidDataset =
    jest.fn<(typeof SolidClient)["getSolidDataset"]>();
  solidClientModule.getWellKnownSolid =
    jest.fn<(typeof SolidClient)["getWellKnownSolid"]>();
  return solidClientModule;
});

const MOCKED_VC_SERVICE = "https://vc-service.iri";

const mockVcWellKnown = (options: {
  issuerPresent?: boolean;
  statusPresent?: boolean;
  verifierPresent?: boolean;
  derivationPresent?: boolean;
}): SolidClient.SolidDataset & SolidClient.WithServerResourceInfo => {
  const wellKnown = buildThing();
  if (options.issuerPresent) {
    wellKnown.addIri(
      "http://www.w3.org/ns/solid/vc#issuerService",
      `${MOCKED_VC_SERVICE}/issue`,
    );
  }
  if (options.statusPresent) {
    wellKnown.addIri(
      "http://www.w3.org/ns/solid/vc#statusService",
      `${MOCKED_VC_SERVICE}/status`,
    );
  }
  if (options.verifierPresent) {
    wellKnown.addIri(
      "http://www.w3.org/ns/solid/vc#verifierService",
      `${MOCKED_VC_SERVICE}/verify`,
    );
  }
  if (options.derivationPresent) {
    wellKnown.addIri(
      "http://www.w3.org/ns/solid/vc#derivationService",
      `${MOCKED_VC_SERVICE}/derive`,
    );
  }
  return setThing(
    mockSolidDatasetFrom("https://vc-service.iri/.well-known/solid"),
    wellKnown.build(),
  );
};

describe("getVerifiableCredentialApiConfiguration", () => {
  describe("legacy discovery", () => {
    it("builds the well-known IRI from the given VC service domain, and specify the JSON-LD serialization", async () => {
      const clientModule = jest.requireMock("@inrupt/solid-client") as {
        getSolidDataset: typeof getSolidDataset;
      };
      clientModule.getSolidDataset = jest
        .fn(getSolidDataset)
        .mockResolvedValueOnce(mockVcWellKnown({}));
      await getVerifiableCredentialApiConfiguration(
        "https://some.example.vc/service",
      );
      expect(clientModule.getSolidDataset).toHaveBeenCalledWith(
        "https://some.example.vc/.well-known/vc-configuration",
        {
          parsers: {
            "application/ld+json": expect.anything(),
          },
        },
      );
    });

    it("returns the IRI of the issuer service if present", async () => {
      const clientModule = jest.requireMock(
        "@inrupt/solid-client",
      ) as jest.Mocked<typeof SolidClient>;
      clientModule.getSolidDataset.mockResolvedValueOnce(
        mockVcWellKnown({ issuerPresent: true }),
      );
      const result = await getVerifiableCredentialApiConfiguration(
        "https://some.example.wellknown.iri",
      );
      expect(result).toEqual(
        expect.objectContaining({
          issuerService: `${MOCKED_VC_SERVICE}/issue`,
        }),
      );
    });

    it("returns the IRI of the status service if present", async () => {
      const clientModule = jest.requireMock(
        "@inrupt/solid-client",
      ) as jest.Mocked<typeof SolidClient>;
      clientModule.getSolidDataset.mockResolvedValueOnce(
        mockVcWellKnown({ statusPresent: true }),
      );
      const result = await getVerifiableCredentialApiConfiguration(
        "https://some.example.wellknown.iri",
      );
      expect(result).toEqual(
        expect.objectContaining({
          statusService: `${MOCKED_VC_SERVICE}/status`,
        }),
      );
    });

    it("returns the IRI of the verifier service if present", async () => {
      const clientModule = jest.requireMock(
        "@inrupt/solid-client",
      ) as jest.Mocked<typeof SolidClient>;
      clientModule.getSolidDataset.mockResolvedValueOnce(
        mockVcWellKnown({ verifierPresent: true }),
      );
      const result = await getVerifiableCredentialApiConfiguration(
        "https://some.example.wellknown.iri",
      );
      expect(result).toEqual(
        expect.objectContaining({
          verifierService: `${MOCKED_VC_SERVICE}/verify`,
        }),
      );
    });

    it("returns the IRI of the derivation service if present", async () => {
      const clientModule = jest.requireMock(
        "@inrupt/solid-client",
      ) as jest.Mocked<typeof SolidClient>;
      clientModule.getSolidDataset.mockResolvedValueOnce(
        mockVcWellKnown({ derivationPresent: true }),
      );
      const result = await getVerifiableCredentialApiConfiguration(
        "https://some.example.wellknown.iri",
      );
      expect(result).toEqual(
        expect.objectContaining({
          derivationService: `${MOCKED_VC_SERVICE}/derive`,
        }),
      );
    });

    it("returns the IRI of multiple services if present", async () => {
      const clientModule = jest.requireMock(
        "@inrupt/solid-client",
      ) as jest.Mocked<typeof SolidClient>;
      clientModule.getSolidDataset.mockResolvedValueOnce(
        mockVcWellKnown({ derivationPresent: true, issuerPresent: true }),
      );
      const result = await getVerifiableCredentialApiConfiguration(
        "https://some.example.wellknown.iri",
      );
      expect(result).toEqual(
        expect.objectContaining({
          issuerService: `${MOCKED_VC_SERVICE}/issue`,
          derivationService: `${MOCKED_VC_SERVICE}/derive`,
        }),
      );
    });

    it("returns an empty object if no services are present", async () => {
      const clientModule = jest.requireMock(
        "@inrupt/solid-client",
      ) as jest.Mocked<typeof SolidClient>;
      clientModule.getSolidDataset.mockResolvedValueOnce(mockVcWellKnown({}));
      const result = await getVerifiableCredentialApiConfiguration(
        "https://some.example.wellknown.iri",
      );

      expect(result.derivationService).toBeUndefined();
      expect(result.issuerService).toBeUndefined();
      expect(result.statusService).toBeUndefined();
      expect(result.verifierService).toBeUndefined();
    });

    it("makes the legacy endpoints available on the legacy object", async () => {
      const clientModule = jest.requireMock(
        "@inrupt/solid-client",
      ) as jest.Mocked<typeof SolidClient>;
      clientModule.getSolidDataset.mockResolvedValueOnce(
        mockVcWellKnown({ derivationPresent: true, issuerPresent: true }),
      );
      const result = await getVerifiableCredentialApiConfiguration(
        "https://some.example.wellknown.iri",
      );
      expect(result.issuerService).toStrictEqual(result.legacy.issuerService);
      expect(result.derivationService).toStrictEqual(
        result.legacy.derivationService,
      );
    });
  });

  describe("spec-compliant discovery", () => {
    it("doesn't fail if the legacy endpoints aren't discoverable", async () => {
      const clientModule = jest.requireMock(
        "@inrupt/solid-client",
      ) as jest.Mocked<typeof SolidClient>;
      clientModule.getSolidDataset.mockRejectedValueOnce(
        new Error("A network error"),
      );
      const result = await getVerifiableCredentialApiConfiguration(
        "https://some.example.wellknown.iri",
      );
      expect(result.specCompliant).toBeDefined();
      expect(result.legacy).toEqual({});
    });

    it("builds spec-compliant endpoints", async () => {
      const BASE_URL = "https://some.example.iri";
      const result = await getVerifiableCredentialApiConfiguration(
        "https://some.example.iri",
      );
      expect(result.specCompliant.credentialVerifierService).toBe(
        `${BASE_URL}/credentials/verify`,
      );
      expect(result.specCompliant.derivationService).toBe(
        `${BASE_URL}/credentials/derive`,
      );
      expect(result.specCompliant.exchangeService).toBe(
        `${BASE_URL}/exchanges`,
      );
      expect(result.specCompliant.holderPresentationAll).toBe(
        `${BASE_URL}/presentations`,
      );
      expect(result.specCompliant.issuerCredentialAll).toBe(
        `${BASE_URL}/credentials`,
      );
      expect(result.specCompliant.issuerService).toBe(
        `${BASE_URL}/credentials/issue`,
      );
      expect(result.specCompliant.presentationVerifierService).toBe(
        `${BASE_URL}/presentations/verify`,
      );
      expect(result.specCompliant.proveService).toBe(
        `${BASE_URL}/presentations/prove`,
      );
      expect(result.specCompliant.queryService).toBe(`${BASE_URL}/query`);
      expect(result.specCompliant.statusService).toBe(
        `${BASE_URL}/credentials/status`,
      );
    });
  });
});
