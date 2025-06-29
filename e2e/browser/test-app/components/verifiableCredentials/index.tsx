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

import { getDefaultSession } from "@inrupt/solid-client-authn-browser";
import {
  issueVerifiableCredential,
  revokeVerifiableCredential,
} from "@inrupt/solid-client-vc";

import React, { useState } from "react";

const session = getDefaultSession();
const DEFAULT_VC_PROVIDER = "https://vc.inrupt.com/";

export default function VerifiableCredential() {
  const [vcProvider, setVcProvider] = useState<string>(DEFAULT_VC_PROVIDER);

  const [verifiableCredential, setVerifiableCredential] = useState<string>();

  const validCredentialClaims = {
    "@context": {
      gc: "https://w3id.org/GConsent#",
      consent: "http://www.w3.org/ns/solid/consent#",
      ldp: "http://www.w3.org/ns/ldp#",
      acl: "http://www.w3.org/ns/auth/acl#",
      inbox: {
        "@id": "ldp:inbox",
        "@type": "@id",
      },
      Read: "acl:Read",
      mode: {
        "@id": "acl:mode",
        "@type": "@id",
      },
      forPersonalData: {
        "@id": "gc:forPersonalData",
        "@type": "@id",
      },
      forPurpose: {
        "@id": "gc:forPurpose",
        "@type": "@id",
      },
      hasConsent: {
        "@id": "gc:hasConsent",
        "@type": "@id",
      },
      isConsentForDataSubject: {
        "@id": "gc:isConsentForDataSubject",
        "@type": "@id",
      },
      hasStatus: {
        "@id": "gc:hasStatus",
        "@type": "@id",
      },
    },
    hasConsent: {
      forPurpose: "https://example.org/ns/somePurpose",
      forPersonalData: "https://example.org/ns/someData",
      hasStatus: "gc:ConsentStatusRequested",
      mode: "acl:Read",
      isConsentForDataSubject: "https://some.webid/resource-owner",
    },
  };

  const invalidCredentialClaims = {
    "@context": {
      gc: "https://w3id.org/GConsent#",
      consent: "http://www.w3.org/ns/solid/consent#",
      ldp: "http://www.w3.org/ns/ldp#",
      acl: "http://www.w3.org/ns/auth/acl#",
      inbox: {
        "@id": "ldp:inbox",
        "@type": "@id",
      },
      Read: "acl:Read",
      mode: {
        "@id": "acl:mode",
        "@type": "@id",
      },
      forPersonalData: {
        "@id": "gc:forPersonalData",
        "@type": "@id",
      },
      forPurpose: {
        "@id": "gc:forPurpose",
        "@type": "@id",
      },
      hasConsent: {
        "@id": "gc:hasConsent",
        "@type": "@id",
      },
      isConsentForDataSubject: {
        "@id": "gc:isConsentForDataSubject",
        "@type": "@id",
      },
      hasStatus: {
        "@id": "gc:hasStatus",
        "@type": "@id",
      },
    },
  };
  const handleIssue = async (e, provider: string, issueInvalid = true) => {
    // This prevents the default behaviour of the button, i.e. to resubmit, which reloads the page.
    e.preventDefault();
    const credential = await issueVerifiableCredential(
      new URL("issue", vcProvider).href,
      issueInvalid ? validCredentialClaims : invalidCredentialClaims,
      {
        "@context": [
          "https://www.w3.org/2018/credentials/v1",
          "https://schema.inrupt.com/credentials/v1.jsonld",
        ],
        type: ["SolidAccessRequest"],
        expirationDate: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
      },
      {
        fetch: session.fetch,
      },
    );
    setVerifiableCredential(JSON.stringify(credential, null, "  "));
  };

  const handleRevoke = async (e, provider: string) => {
    // This prevents the default behaviour of the button, i.e. to resubmit, which reloads the page.
    e.preventDefault();
    if (typeof verifiableCredential !== "string") {
      // If the resource does not exist, do nothing.
      return;
    }

    await revokeVerifiableCredential(
      `${provider}/status`,
      session.info.webId || "n/a",
      {
        fetch: session.fetch,
      },
    );

    setVerifiableCredential(undefined);
  };

  return (
    <>
      <input
        data-testid={"vcProvider"}
        type="text"
        value={vcProvider}
        onChange={(e) => {
          setVcProvider(e.target.value);
        }}
      />
      <br />

      <div>
        <button
          onClick={async (e) => handleIssue(e, vcProvider)}
          data-testid="issue-vc"
        >
          Issue access via VC
        </button>
        <button
          onClick={async (e) => handleRevoke(e, vcProvider)}
          data-testid="revoke-vc"
        >
          Revoke access via VC
        </button>
        <button
          onClick={async (e) => handleIssue(e, vcProvider, false)}
          data-testid="issue-invalid-vc"
        >
          Issue invalid access via VC
        </button>
      </div>
      <p>
        Issused access:{" "}
        <pre data-testid="verifiable-credential">{verifiableCredential}</pre>
      </p>
    </>
  );
}
