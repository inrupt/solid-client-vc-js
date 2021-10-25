# Changelog

This project adheres to [Semantic Versioning](http://semver.org/spec/v2.0.0.html).

The following changes have been implemented but not released yet:

## [Unreleased]

The following sections document changes that have been released already:

### Bugfix

- Revoking a VC was setting the revocation status to an incorrect value, preventing
  the revocation to actually happen.

## 0.1.3 - 2021-10-20

### Bugfix

- Receiving a legitimate VP could be rejected by the library if it had a single
  string as a type, which should be acceptable.

## 0.1.2 - 2021-10-13

### Bugfix

- `getVerifiableCredentialAllFromShape` expected a response format from the VC
  holder mismatching the actual response.

## 0.1.1 - 2021-09-15

### Bugfix

- No longer uses the default session from `@inrupt/solid-client-authn-browser`
  because it causes issues with Webpack.

## 0.1.0 - 2021-09-06

### New features

- Revoke a credential: the `revokeVerifiableCredential` function allows to ask
  an issuer to revoke a given credential.
- Lookup credentials at a Holder endpoint: the `getVerifiableCredentialAllFromShape`
  function collects presentations for all the VCs matching a given shape from a
  given holder.
- Request the issuance of a Verifiable Credential: the `issueVerifiableCredential`
  function requests a Verifiable Credential to be issued by a server implementing the
  W3C VC Issuer HTTP API.
