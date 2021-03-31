
// SyntaxError: Cannot use import statement outside a module
// import { Ed25519VerificationKey2020 } from "@digitalbazaar/ed25519-verification-key-2020";

const { Ed25519VerificationKey2020 } = require("@digitalbazaar/ed25519-verification-key-2020");

Ed25519VerificationKey2020.generate().then((key) => console.log(`Key: [${JSON.stringify(key, null, 2)}]`) );
