// Verify that imports from the main export work:
import { issueVerifiableCredential as mainIssueVerifiableCredential } from "@inrupt/solid-client-vc";
// Verify that submodule imports work:
import issueVerifiableCredential from "@inrupt/solid-client-vc/issue";

console.log(typeof mainIssueVerifiableCredential === "function");
console.log(typeof issueVerifiableCredential === "function");
