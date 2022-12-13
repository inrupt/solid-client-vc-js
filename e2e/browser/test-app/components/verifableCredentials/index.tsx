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

import { getDefaultSession } from "@inrupt/solid-client-authn-browser";
import {
  issueVerifiableCredential,
  revokeVerifiableCredential,
} from "@inrupt/solid-client-vc";
// import { getNodeTestingEnvironment } from "@inrupt/internal-test-env";
import {
  getPodUrlAll,
  saveFileInContainer,
  getSourceUrl,
  deleteFile,
} from "@inrupt/solid-client";
import React, { useState } from "react";

const session = getDefaultSession();
const SHARED_FILE_CONTENT = "Some content.\n";
const env = { vcProvider: "" };
export default function VerifiableCredential({
  setErrorMessage,
}: {
  setErrorMessage: (msg: string) => void;
}) {
  const [verifiableCredential, setVerifiableCredential] = useState<string>();
  const [sharedResourceIri, setSharedResourceIri] = useState<string>();
  // const env = getNodeTestingEnvironment({
  //   vcProvider: "",
  //   clientCredentials: {
  //     owner: { id: "", secret: "" },
  //   },
  // });

  const handleCreate = async (e): Promise<void> => {
    // This prevents the default behaviour of the button, i.e. to resubmit, which reloads the page.
    e.preventDefault();
    if (typeof sharedResourceIri === "string") {
      // If a resource already exist, do nothing
      return;
    }

    if (typeof session.info.webId !== "string") {
      setErrorMessage("You must be authenticated to create a resource.");
      return;
    }
    // Create a file in the resource owner's Pod
    const resourceOwnerPodAll = await getPodUrlAll(session.info.webId);
    if (resourceOwnerPodAll.length === 0) {
      setErrorMessage(
        "The Resource Owner WebID Profile is missing a link to at least one Pod root."
      );
    }
    const savedFile = await saveFileInContainer(
      resourceOwnerPodAll[0],
      new Blob([SHARED_FILE_CONTENT], { type: "text/plain" }),
      {
        // The session ID is a random string, used here as a unique slug.
        slug: `${session.info.sessionId}.txt`,
        fetch: session.fetch,
      }
    );
    setSharedResourceIri(getSourceUrl(savedFile));
  };

  const handleDelete = async (e) => {
    // This prevents the default behaviour of the button, i.e. to resubmit, which reloads the page.
    e.preventDefault();
    if (typeof sharedResourceIri !== "string") {
      // If no resource exist, do nothing
      return;
    }
    await deleteFile(sharedResourceIri, {
      fetch: session.fetch,
    });
    setSharedResourceIri(undefined);
  };

  const handleIssue = async (e) => {
    // This prevents the default behaviour of the button, i.e. to resubmit, which reloads the page.
    e.preventDefault();
    if (typeof sharedResourceIri !== "string") {
      // If the resource does not exist, do nothing.
      return;
    }

    const { webId } = session.info;
    const vcRequest = await issueVerifiableCredential(
      `${env.vcProvider}/issue`,

      // Ends up being the subject. We will want to modify this to be someone
      // else so that we can issue a VC to someone else, not myself. This is the
      // vcSubject parameter.
      webId || "n/a",
      JSON.parse("{}") || undefined,
      JSON.parse("{}") || undefined,
      { fetch: session.fetch }
    );
    setVerifiableCredential(JSON.stringify(vcRequest, null, "  "));
  };

  const handleRevoke = async (e) => {
    // This prevents the default behaviour of the button, i.e. to resubmit, which reloads the page.
    e.preventDefault();
    if (typeof verifiableCredential !== "string") {
      // If the resource does not exist, do nothing.
      return;
    }

    const { webId } = session.info;
    await revokeVerifiableCredential(
      `${env.vcProvider}/status`,
      webId || "n/a",
      {
        fetch: session.fetch,
      }
    );

    setVerifiableCredential(undefined);
  };

  return (
    <>
      <div>
        <button
          onClick={async (e) => handleCreate(e)}
          data-testid="create-resource"
        >
          Create resource
        </button>
        <button
          onClick={async (e) => handleDelete(e)}
          data-testid="delete-resource"
        >
          Delete resource
        </button>
      </div>
      <p>
        Created resource:{" "}
        <span data-testid="resource-iri">{sharedResourceIri}</span>
      </p>
      <div>
        <button onClick={async (e) => handleIssue(e)} data-testid="issue-vc">
          Issue access via VC
        </button>
        <button onClick={async (e) => handleRevoke(e)} data-testid="revoke-vc">
          Revoke access via VC
        </button>
      </div>
      <p>
        Issused access:{" "}
        <pre data-testid="verifiable-credential">{verifiableCredential}</pre>
      </p>
    </>
  );
}
