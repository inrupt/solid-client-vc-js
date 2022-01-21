# Security policy

This library intends supporting the development of Solid applications manipulating
Verifiable Credentials. A Verifiable Credential is a piece of data containing claims
about a subject which may be sensitive, and as such should be manipulated with care.

Issuing and verifying Verifiable Credentials involve cryptographic operations. These
are out of scope for this library, and are implemented on the server-side providers
of Verifiable Credentials-related services.

For a better separation of concerns, this library does not deal directly with
authentication. In order to make authenticated requests, one should inject a `fetch`
function compatible with the browser-native [fetch API](https://developer.mozilla.org/docs/Web/API/WindowOrWorkerGlobalScope/fetch#parameters)
dealing with authentication. This may be done using Inrupt's authentication libraries
[for Node](https://www.npmjs.com/package/@inrupt/solid-client-authn-node) or [for
the browser](https://www.npmjs.com/package/@inrupt/solid-client-authn-browser).
The security policy for these libraries is available in the associated [GitHub repository](https://github.com/inrupt/solid-client-authn-js/blob/main/SECURITY.md).

# Reporting a vulnerability

If you discover a vulnerability in our code, or experience a bug related to security,
please report it following the instructions provided on [Inrupt’s security page](https://inrupt.com/security/).
