// eslint-disable-next-line
// @ts-ignore
// import { Ed25519VerificationKey2020 } from "@digitalbazaar/ed25519-verification-key-2020";

const { Ed25519VerificationKey2020 } = require("@digitalbazaar/ed25519-verification-key-2020");
// import { Ed25519VerificationKey2020 } from "@digitalbazaar/ed25519-verification-key-2020";

describe("verificationKey", () => {
    it("generates a key", async () => {
        const key = await Ed25519VerificationKey2020.generate();
        console.log(`Key: [${JSON.stringify(key, null, 2)}]`);
    });
});
