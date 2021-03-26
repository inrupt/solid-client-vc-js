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
// export default function sampleModuleFn(): string {
//   return "Hello, world- from a module.";
// }

// jsonld-signatures has a secure context loader
// by requiring this first you ensure security
// contexts are loaded from jsonld-signatures
// and not an insecure source.

// This document loader won't work for us out-of-the-box, as it has no awareness of the context
// for 'https://www.w3.org/2018/credentials/v1', which the VC signing functions require to be
// resolvable.
// But it allows us to extend it, which we need to do to add our test context for our test issuer!
// // @ts-ignore
// const {extendContextLoader} = require('jsonld-signatures');

// eslint-disable-next-line
// @ts-ignore
import vc from "vc-js";

// eslint-disable-next-line
// @ts-ignore
import { Ed25519KeyPair, suites } from "jsonld-signatures";

// Use the VC.js document loader as our default (as it is pre-loaded with the VC vocabs).
const { defaultDocumentLoader } = vc;

// These are the equivalent of a WebID and the WebID Profile document...
const testIssuerId = "https://example.edu/issuers/565049";
const assertionController = {
  // (Note: the vocab used for the terms here is the 'sec' vocab, and not the 'vc' vocab!)
  "@context": "https://w3id.org/security/v2",
  id: testIssuerId,
  // Actual keys are going to be added in our setup.
  assertionMethod: [],
  authentication: [],
};

// Here we are just 'extending' the default VC document loader to pre-load it with our issuer's
// ID and their profile document (or 'assertion controller' document).
// eslint-disable-next-line
// @ts-ignore
const documentLoader = async (url) => {
  if (url === testIssuerId) {
    return {
      contextUrl: null,
      documentUrl: url,
      document: assertionController,
    };
  }
  return defaultDocumentLoader(url);
};

async function generateSuite() {
  // Set up the key that will be signing and verifying.
  const keyPair = await Ed25519KeyPair.generate({
    id: "https://example.edu/issuers/keys/1",
    controller: testIssuerId,
  });

  // Add the key to the Controller doc (authorizes its use for assertion).
  // eslint-disable-next-line
  // @ts-ignore
  assertionController.assertionMethod.push(keyPair.id);
  // Also add the key for authentication (VP) purposes.
  // eslint-disable-next-line
  // @ts-ignore
  assertionController.authentication.push(keyPair.id);

  // // Register the controller document and the key document with documentLoader.
  // // eslint-disable-next-line
  // //@ts-ignore
  // contexts["https://example.edu/issuers/565049"] = assertionController;
  // // FIXME this might require a security context.
  // // eslint-disable-next-line
  // //@ts-ignore
  // contexts["https://example.edu/issuers/keys/1"] = keyPair.publicNode();

  // Set up the signature suite, using the generated key.
  const suite = new suites.Ed25519Signature2018({
    verificationMethod: "https://example.edu/issuers/keys/1",
    key: keyPair,
  });

  return suite;
}

export default async function sampleModuleFn(
  useDefaultDocumentLoader: boolean
): Promise<boolean> {
  const suite = await generateSuite();

  // Sample unsigned credential.
  const credential = {
    "@context": [
      "https://www.w3.org/2018/credentials/v1",
      "https://www.w3.org/2018/credentials/examples/v1",
    ],
    id: "https://example.com/credentials/1872",
    type: ["VerifiableCredential", "AlumniCredential"],
    issuer: testIssuerId,
    issuanceDate: "2010-01-01T19:23:24Z",
    credentialSubject: {
      id: "did:example:ebfeb1f712ebc6f1c276e12ec21",
      alumniOf: "Example University",
    },
  };

  // eslint-disable-next-line
  console.log(`The unsigned VC is:\n${JSON.stringify(credential, null, 2)}\n`);
  // eslint-disable-next-line
  // @ts-ignore
  const signedVc = await vc.issue({ credential, suite });
  // eslint-disable-next-line
  console.log(`And the signed VC is:\n${JSON.stringify(signedVc, null, 2)}`);

  const isVcValid = await vc.verifyCredential({
    credential: signedVc,
    suite,
    documentLoader,
  });
  expect(isVcValid.verified).toBe(true);

  // optional `id` and `holder`
  const id = "ebc6f1c2";
  const holder = "did:ex:12345";

  const presentation = vc.createPresentation({ signedVc, id, holder });
  // eslint-disable-next-line
  console.log(
    `An unsigned presentation:\n${JSON.stringify(presentation, null, 2)}`
  );

  const unsignedResult = await vc.verify({
    presentation,
    suite,
    unsignedPresentation: true,
  });
  // eslint-disable-next-line
  console.log(
    `Verify our unsigned presentation is valid: [${unsignedResult.verified}]`
  );
  expect(unsignedResult.verified).toBe(true);

  const challenge =
    "randomly generated string - used as a nonce, generated by the party" +
    " requesting the VP";

  // We can't just use the default document loader, as that will be the 'strict' loader, that
  // only works with local, in-memory contexts...
  // const documentLoader = undefined;

  // This is better, but won't work either as we need to add our test Issuer's context to it,
  // otherwise our signing operation fails with "Document loader unable to load URL
  // "https://example.edu/issuers/565049"".
  // const documentLoader = defaultDocumentLoader;

  const signedPresentation = await vc.signPresentation({
    presentation,
    suite,
    challenge,
    documentLoader,
  });
  // eslint-disable-next-line
  console.log(
    `Our signed presentation:\n${JSON.stringify(signedPresentation, null, 2)}`
  );

  const signedResult = await vc.verify({
    presentation: signedPresentation,
    challenge,
    suite,
    documentLoader: useDefaultDocumentLoader
      ? defaultDocumentLoader
      : documentLoader,
  });
  // eslint-disable-next-line
  console.log(
    `Verify our signed presentation is valid (and contains our challenge): [${signedResult.verified}]`
  );

  if (!signedResult.verified) {
    // Beware here - the result structure is different for a signed and an unsigned presentation.
    // Unsigned has a 'results' array, whereas signed has an 'results' array inside a
    // 'presentationResult' object!
    const results = { ...signedResult.presentationResult.results };

    const resultCount = results.length;
    // eslint-disable-next-line
    console.log(
      `Presentation invalid ([${resultCount}] results): [${results[0].error}]`
    );
  }

  expect(signedResult.verified).toBe(!useDefaultDocumentLoader);

  return Promise.resolve(signedResult.verified);
}
