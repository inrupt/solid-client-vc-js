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
import {
  mockSolidDatasetFrom,
  getSolidDataset,
  SolidDataset,
  WithServerResourceInfo,
  buildThing,
  setThing,
} from "@inrupt/solid-client";
import { getVerifiableCredentialApiConfiguration } from "./common";

jest.mock("../fetcher");

jest.mock("@inrupt/solid-client", () => {
  // TypeScript can't infer the type of modules imported via Jest;
  // skip type checking for those:
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const solidClientModule = jest.requireActual("@inrupt/solid-client") as any;
  solidClientModule.getSolidDataset = jest.fn(
    solidClientModule.getSolidDataset
  );
  solidClientModule.getWellKnownSolid = jest.fn();
  return solidClientModule;
});

const MOCKED_VC_SERVICE = "https://vc-service.iri";

const mockVcWellKnown = (options: {
  issuerPresent?: boolean;
  statusPresent?: boolean;
  verifierPresent?: boolean;
  derivationPresent?: boolean;
}): SolidDataset & WithServerResourceInfo => {
  const wellKnown = buildThing();
  if (options.issuerPresent) {
    wellKnown.addIri(
      "http://www.w3.org/ns/solid/vc#issuerService",
      `${MOCKED_VC_SERVICE}/issue`
    );
  }
  if (options.statusPresent) {
    wellKnown.addIri(
      "http://www.w3.org/ns/solid/vc#statusService",
      `${MOCKED_VC_SERVICE}/status`
    );
  }
  if (options.verifierPresent) {
    wellKnown.addIri(
      "http://www.w3.org/ns/solid/vc#verifierService",
      `${MOCKED_VC_SERVICE}/verify`
    );
  }
  if (options.derivationPresent) {
    wellKnown.addIri(
      "http://www.w3.org/ns/solid/vc#derivationService",
      `${MOCKED_VC_SERVICE}/derive`
    );
  }
  return setThing(
    mockSolidDatasetFrom("https://vc-service.iri/.well-known/solid"),
    wellKnown.build()
  );
};

describe("getVerifiableCredentialApiConfiguration", () => {
  it("builds the well-known IRI from the given VC service domain, and specify the JSON-LD serialization", async () => {
    const clientModule = jest.requireMock("@inrupt/solid-client") as {
      getSolidDataset: typeof getSolidDataset;
    };
    clientModule.getSolidDataset = jest
      .fn(getSolidDataset)
      .mockResolvedValueOnce(mockVcWellKnown({}));
    await getVerifiableCredentialApiConfiguration(
      "https://some.example.vc/service"
    );
    expect(clientModule.getSolidDataset).toHaveBeenCalledWith(
      "https://some.example.vc/.well-known/vc-configuration",
      {
        parsers: {
          "application/ld+json": expect.anything(),
        },
      }
    );
  });

  it("returns the IRI of the issuer service if present", async () => {
    const clientModule = jest.requireMock("@inrupt/solid-client") as {
      getSolidDataset: typeof getSolidDataset;
    };
    clientModule.getSolidDataset = jest
      .fn(getSolidDataset)
      .mockResolvedValueOnce(mockVcWellKnown({ issuerPresent: true }));
    const result = await getVerifiableCredentialApiConfiguration(
      "https://some.example.wellknown.iri"
    );
    expect(result).toEqual({ issuerService: `${MOCKED_VC_SERVICE}/issue` });
  });

  it("returns the IRI of the status service if present", async () => {
    const clientModule = jest.requireMock("@inrupt/solid-client") as {
      getSolidDataset: typeof getSolidDataset;
    };
    clientModule.getSolidDataset = jest
      .fn(getSolidDataset)
      .mockResolvedValueOnce(mockVcWellKnown({ statusPresent: true }));
    const result = await getVerifiableCredentialApiConfiguration(
      "https://some.example.wellknown.iri"
    );
    expect(result).toEqual({ statusService: `${MOCKED_VC_SERVICE}/status` });
  });

  it("returns the IRI of the verifier service if present", async () => {
    const clientModule = jest.requireMock("@inrupt/solid-client") as {
      getSolidDataset: typeof getSolidDataset;
    };
    clientModule.getSolidDataset = jest
      .fn(getSolidDataset)
      .mockResolvedValueOnce(mockVcWellKnown({ verifierPresent: true }));
    const result = await getVerifiableCredentialApiConfiguration(
      "https://some.example.wellknown.iri"
    );
    expect(result).toEqual({ verifierService: `${MOCKED_VC_SERVICE}/verify` });
  });

  it("returns the IRI of the derivation service if present", async () => {
    const clientModule = jest.requireMock("@inrupt/solid-client") as {
      getSolidDataset: typeof getSolidDataset;
    };
    clientModule.getSolidDataset = jest
      .fn(getSolidDataset)
      .mockResolvedValueOnce(mockVcWellKnown({ derivationPresent: true }));
    const result = await getVerifiableCredentialApiConfiguration(
      "https://some.example.wellknown.iri"
    );
    expect(result).toEqual({
      derivationService: `${MOCKED_VC_SERVICE}/derive`,
    });
  });

  it("returns the IRI of multiple services if present", async () => {
    const clientModule = jest.requireMock("@inrupt/solid-client") as {
      getSolidDataset: typeof getSolidDataset;
    };
    clientModule.getSolidDataset = jest
      .fn(getSolidDataset)
      .mockResolvedValueOnce(
        mockVcWellKnown({ derivationPresent: true, issuerPresent: true })
      );
    const result = await getVerifiableCredentialApiConfiguration(
      "https://some.example.wellknown.iri"
    );
    expect(result).toEqual({
      issuerService: `${MOCKED_VC_SERVICE}/issue`,
      derivationService: `${MOCKED_VC_SERVICE}/derive`,
    });
  });

  it("returns an empty object if no services are present", async () => {
    const clientModule = jest.requireMock("@inrupt/solid-client") as {
      getSolidDataset: typeof getSolidDataset;
    };
    clientModule.getSolidDataset = jest
      .fn(getSolidDataset)
      .mockResolvedValueOnce(mockVcWellKnown({}));
    const result = await getVerifiableCredentialApiConfiguration(
      "https://some.example.wellknown.iri"
    );
    expect(result).toEqual({});
  });
});
