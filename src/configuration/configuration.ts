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

import {
  getSolidDataset,
  getStringNoLocale,
  getThingAll,
} from "@inrupt/solid-client";
import fallbackFetch from "../fetcher";

import { Iri } from "../common/common";

/**
 * A Verifiable Credential API configuration details.
 */
export type VerifiableCredentialApiConfiguration = {
  derivationService?: Iri | null;
  issuerService?: Iri | null;
  statusService?: Iri | null;
  verifierService?: Iri | null;
};

// Solid VC URIs
const SOLID_VC_NS = "http://www.w3.org/ns/solid/vc#";
const SOLID_VC_DERIVATION_SERVICE = SOLID_VC_NS.concat("derivationService");
const SOLID_VC_ISSUER_SERVICE = SOLID_VC_NS.concat("issuerService");
const SOLID_VC_STATUS_SERVICE = SOLID_VC_NS.concat("statusService");
const SOLID_VC_VERIFIER_SERVICE = SOLID_VC_NS.concat("verifierService");

/**
 *
 * @param wellKnownIri
 * @param options
 * @returns
 */
export async function getVerifiableCredentialApiConfiguration(
  wellKnownIri: URL | Iri,
  options: {
    fetcher?: typeof fallbackFetch;
  } = {}
): Promise<VerifiableCredentialApiConfiguration> {
  const { fetcher = fallbackFetch } = options;

  // Retrieve dataset
  const vcConfigData = await getSolidDataset(
    wellKnownIri instanceof URL ? wellKnownIri.href : wellKnownIri,
    {
      fetch: fetcher,
    }
  );

  // Get the consent
  const wellKnownRootBlankNode = getThingAll(vcConfigData, {
    acceptBlankNodes: true,
  })[0];

  return {
    derivationService: getStringNoLocale(
      wellKnownRootBlankNode,
      SOLID_VC_DERIVATION_SERVICE
    ),
    issuerService: getStringNoLocale(
      wellKnownRootBlankNode,
      SOLID_VC_ISSUER_SERVICE
    ),
    statusService: getStringNoLocale(
      wellKnownRootBlankNode,
      SOLID_VC_STATUS_SERVICE
    ),
    verifierService: getStringNoLocale(
      wellKnownRootBlankNode,
      SOLID_VC_VERIFIER_SERVICE
    ),
  };
}
