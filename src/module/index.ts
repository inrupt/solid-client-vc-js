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
// eslint-disable-next-line
// @ts-ignore
import * as vc from "vc-js";

// eslint-disable-next-line
// @ts-ignore
import { Ed25519VerificationKey2020 } from "@digitalbazaar/ed25519-verification-key-2020";

// eslint-disable-next-line
// @ts-ignore
import { Ed25519Signature2020 } from "@digitalbazaar/ed25519-signature-2020";

// eslint-disable-next-line
// @ts-ignore
import cred from "credentials-context";

// eslint-disable-next-line
// @ts-ignore
import ed25519 from "ed25519-signature-2020-context";

/**
 * Mock Data Setup
 */
// These are the equivalent of a WebID and the WebID Profile document...
const controllerId = "https://alice.example.com";
const controllerDoc = {
  // (Note: the vocab used for the terms here is the 'sec' vocab, and not the 'vc' vocab!)
  "@context": "https://w3id.org/security/suites/ed25519-2020/v1",
  id: controllerId,
  // Actual keys are going to be added in our setup.
  assertionMethod: [],
  authentication: [],
};

// Set up the keys - import from static data for now, generate() later.

// Key IDs are formed from <controllerId>#<key fingerprint>
// Usually, you won't have to construct them yourself, they're set based on
// the controller during .generate()
const keyId = `${controllerId}#z6MkjLrk3gKS2nnkeWcmcxiZPGskmesDpuwRBorgHxUXfxnG`;

const examplePublicKey = {
  "@context": "https://w3id.org/security/suites/ed25519-2020/v1",
  type: "Ed25519VerificationKey2020",
  controller: controllerId,
  id: keyId,
  publicKeyMultibase: "zEYJrMxWigf9boyeJMTRN4Ern8DJMoCXaLK77pzQmxVjf",
};

const exampleKeyPair = {
  type: "Ed25519VerificationKey2020",
  controller: controllerId,
  id: keyId,
  publicKeyMultibase: "zEYJrMxWigf9boyeJMTRN4Ern8DJMoCXaLK77pzQmxVjf",
  privateKeyMultibase:
    "z4E7Q4neNHwv3pXUNzUjzc6TTYspqn9Aw6vakpRKpbVrCzwKWD4hQ" +
    "DHnxuhfrTaMjnR8BTp9NeUvJiwJoSUM6xHAZ",
};

// Now let's _authorize_ these keys for their intended purposes (authentication
// and assertionMethod (for signing VCs and other assertions)), by adding them
// to the controller doc.
// eslint-disable-next-line
// @ts-ignore
controllerDoc.assertionMethod = [examplePublicKey];

// jsonld-signatures (and other libs like vc-js) have a secure context loader
// by requiring this first you ensure security
// contexts are loaded from known sources/versions
// and not an insecure source.

// For extra clarity, let's define which contexts we're supporting
const documentMap = new Map();
// The Ed25519 2020 Crypto Suite context. Contains terms for keys and VC signatures.
// 'https://w3id.org/security/suites/ed25519-2020/v1'
documentMap.set(
  ed25519.constants.CONTEXT_URL,
  ed25519.contexts.get(ed25519.constants.CONTEXT_URL)
);
// The Verifiable Credentials v1 context. Contains terms in common for all VCs.
// 'https://www.w3.org/2018/credentials/v1'
documentMap.set(
  cred.constants.CREDENTIALS_CONTEXT_V1_URL,
  cred.contexts.get(cred.constants.CREDENTIALS_CONTEXT_V1_URL)
);

// The controller doc is also fetched via the document loader
// Typically, this is done by a DID resolver / WebID Profile fetcher,
// but in this case, we're using a static controller doc for the demo
documentMap.set(controllerId, controllerDoc);

// Keys are also typically fetched by a DID resolver or fetcher
// Again, here we're specifically providing a static key instead
documentMap.set(keyId, examplePublicKey);

// Now that we have a list of contexts and documents, let's construct a simple
// documentLoader
// eslint-disable-next-line
// @ts-ignore
const documentLoader = async (url) => {
  const localDoc = documentMap.get(url);
  if (localDoc) {
    return {
      contextUrl: null,
      documentUrl: url,
      document: localDoc,
    };
  }
  // If it's not in our list of approved documents, throw an error --
  // we're not going to be fetching anything off the web
  throw new Error(`Could not load document at '${url}' (not allowed).`);
};

async function generateSuite() {
  const seed =
    "8c2114a150a16209c653817acc7f3e7e9c6c6290ae93d6689cbd61bb038cd31b";
  // Encoding returns a 64 byte uint8array, seed needs to be 32 bytes
  const seedBytes = new TextEncoder().encode(seed).slice(0, 32);

  // Set up the key that will be signing and verifying.
  // const keyPair = await Ed25519VerificationKey2020.generate({
  //   //   seed: seedBytes,
  //   controller: controllerId,
  // });

  const signingKey = new Ed25519VerificationKey2020({ ...exampleKeyPair });

  // Add the key to the Controller doc (authorizes its use for assertion).
  // eslint-disable-next-line
  // @ts-ignore
  // assertionController.assertionMethod.push(keyPair.id);
  // Also add the key for authentication (VP) purposes.
  // eslint-disable-next-line
  // @ts-ignore
  // assertionController.authentication.push(keyPair.id);

  // Set up the signature suite, using the generated key.
  const suite = new Ed25519Signature2020({ key: signingKey });

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
      // Normally, 'alumniOf', 'AlumniCredential' etc are defined in
      // "https://www.w3.org/2018/credentials/examples/v1",
      // But we're going to inline these definitions, as an example of
      // how to add domain-specific terms
      {
        alumniOf: "https://example.org/examples#alumniOf",
        AlumniCredential: "https://example.org/examples#AlumniCredential",
      },
    ],
    id: "https://example.com/credentials/1872",
    type: ["VerifiableCredential", "AlumniCredential"],
    // In our example, the key controller (Alice) is also the issuer
    issuer: controllerId,
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
  const signedVc = await vc.issue({ credential, suite, documentLoader });
  // eslint-disable-next-line
  console.log(`And the signed VC is:\n${JSON.stringify(signedVc, null, 2)}`);

  const isVcValid = await vc.verifyCredential({
    credential: signedVc,
    // We don't have to pass in the public key during verification;
    // it will be fetched via the documentLoader we've set up
    suite: new Ed25519Signature2020({}),
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
    domain: "https://rs.example.com",
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
    domain: "https://rs.example.com",
    suit: new Ed25519Signature2020({}),
    documentLoader,
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

  // expect(signedResult.verified).toBe(!useDefaultDocumentLoader);

  return Promise.resolve(signedResult.verified);
}
