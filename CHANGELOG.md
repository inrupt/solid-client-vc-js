# Changelog

This project adheres to [Semantic Versioning](http://semver.org/spec/v2.0.0.html).

The following changes have been implemented but not released yet:

## Unreleased

# New feature

- Protect against uncontrolled memory consumption by setting a max size for parsing JSON
  in a response body. The default value is 10MB but this can be overridden using
  `custom.maxJsonSize`.

## [1.2.0](https://github.com/inrupt/solid-client-vc-js/releases/tag/v1.2.0) - 2024-12-17

# New feature

- Query endpoint discovery: the `getVerifiableCredentialApiConfiguration` function now
  has a `queryService` entry if the target service supports the Inrupt Access Grant query
  endpoint.

## [1.1.2](https://github.com/inrupt/solid-client-vc-js/releases/tag/v1.1.2) - 2024-10-22

### Patch changes

- Added support for the `https://schema.inrupt.com/credentials/v2.jsonld` JSON-LD context.

## [1.1.1](https://github.com/inrupt/solid-client-vc-js/releases/tag/v1.1.1) - 2024-10-14

### Internal change

- This release has no impact on shipped code. A feature flag has been added to Problem Details end-to-end tests.

## [1.1.0](https://github.com/inrupt/solid-client-vc-js/releases/tag/v1.1.0) - 2024-09-03

### New feature

- Integrate @inrupt/solid-client-errors for handling HTTP errors.
- Node 22 is now supported.

## [1.0.3](https://github.com/inrupt/solid-client-vc-js/releases/tag/v1.0.3) - 2024-05-15

### Patch changes

- Added `types` in `exports` entries. This fixes issue #1028.

## [1.0.2](https://github.com/inrupt/solid-client-vc-js/releases/tag/v1.0.2) - 2024-01-17

### Patch changes

- Export type `VerifiableCredentialApiConfiguration`, which is part of the public API but was missing from the exports.

## [1.0.0](https://github.com/inrupt/solid-client-vc-js/releases/tag/v1.0.0) - 2023-12-21

### Breaking Changes

- Parsing Verifiable Credentials. This allows the Verifiable Credential to be read using the RDF/JS DatasetCore API.
  This is a breaking change because the `VerifiableCredential` type now is also of type `DatasetCore`. Importantly, this
  dataset is not preserved when converting to verifiableCredentials a string and back doing
  `JSON.parse(JSON.stringify(verifiableCredential))`. We reccomend that developers set `returnLegacyJsonld` to `false`
  in functions such as `getVerifiableCredential` in order to avoid returning deprecated object properties. Instead
  developers should make use of the exported `getter` functions to get these attributes.
- Use the global `fetch` function instead of `@inrupt/universal-fetch`. This means this library now only works
  with Node 18 and higher.
- The deprecated signature of `issueVerifiableCredential` (including a `subjectId` parameter) is no longer supported.
  Please remove the extraneous parameter.
- Due to changes in the rollup config, the `umd` output is now found at `dist/index.umd.js` rather than `umd/index.js`.

## [0.7.4](https://github.com/inrupt/solid-client-vc-js/releases/tag/v0.7.4) - 2023-11-17

### Internal Changes

- Remove some assumptions for an end-to-end test. This should be transparent to dependants.

## [0.7.3](https://github.com/inrupt/solid-client-vc-js/releases/tag/v0.7.3) - 2023-11-16

### Internal Changes

- Remove some assumptions for an end-to-end test. This should be transparent to dependants.

## 0.7.2 - 2023-09-15

- Build system (bundler and TypeScript) updates. This should be transparent to dependants.

## 0.7.1 - 2023-06-10

- Fix broken checks for `null` fields

## 0.7.0 - 2023-05-09

### New features

- Node 20 is now supported

## 0.6.0 - 2023-04-14

### New features

- Node 18 is now supported
- A new function `isValidVerifiablePresentation` has been added to the `verify` module, which verifies the validity of a
  VP using a verification service.
- `getVerifiableCredentialApiConfiguration` now discovers the future-compatible
  specification-compliant endpoints, as well as the legacy endpoints.
- A `query` function is added from the top-level export and the `@inrupt/solid-client-vc/query` submodule. It implements
  the Verifiable Presentation Request mechanism as described in https://w3c-ccg.github.io/vp-request-spec/. An important
  note is that we make the assumption that an endpoint supporting Verifiable Presentation Request is available at a
  /query path, which is outside of the VC API specification scope. This assumption is used to distinguish new endpoints
  vs legacy endpoints. Currently, only Query by Example VPRs are supported, which is similar to the legacy behavior in a
  lot of ways. The existing `getVerifiableCredentialAllFromShape` function now supports both legacy and VPR-compliant
  endpoints.

### Other changes

- Upgraded documentation tooling and improved documentation output.
- Added named exports to revoke, verify, and derive (these were previously default exports but they format poorly in the
  documentation)

## 0.5.0 - 2022-03-07

### New features

- `getVerifiableCredentialAllFromShape` supports a new option, `includeExpiredVc`.
  If set to true, the Holder endpoint will return VCs that have expired and are thus
  no longer valid. This new option defaults to false.

The following sections document changes that have been released already:

## 0.4.0 - 2022-02-20

### New features

- `getVerifiableCredential`: function exported by the `./common` module to dereference
  a VC URL and validate the obtained content.

## 0.3.1 - 2022-02-15

### Deprecation

- Passing a subject ID to `issueVerifiableCredential` is now deprecated.

## 0.3.0 - 2022-01-21

### New features

- `isValidVc`: this function, exported by the `verify` module, verifies that a VC
  is valid. Such verification is performed server-side by a verification service,
  which checks the validity of the signature, and that the VC hasn't been revoked.

## 0.2.2 - 2021-11-26

### Bugfixes

- If getting a large response from the `/derive` endpoint, the code would freeze
  due to the response being cloned for display purpose. This is no longer the case.

## 0.2.1 - 2021-11-02

### Bugfixes

- Looking up the configuration discovery file explicitly sets the `Accept` header
  to `application/ld+json`, preventing the a`406 Unacceptable` response when trying
  to dereference it as Turtle.

## 0.2.0 - 2021-10-30

### New features

- `getVerifiableCredentialApiConfiguration`: If the VC service exposes a `.well-known/vc-configuration`
  document, this function fetches it, parses it, and returns known services from it.

## 0.1.5 - 2021-10-29

- Looking up a VC at the '/derive' endpoint was issuing incorrect requests.

## 0.1.4 - 2021-10-26

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
