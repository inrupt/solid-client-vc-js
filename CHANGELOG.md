# Changelog

This project adheres to [Semantic Versioning](http://semver.org/spec/v2.0.0.html).

The following changes have been implemented but not released yet:

## [Unreleased]

### New features

- Lookup credentials held in a wallet: the `getVerifiableCredentialAllFromShape`
  function collects presentations for all the VCs matching a given shape from a 
  given holder.
- Request the issuance of a Verifiable Credential: the `issueVerifiableCredential`
  function requests a Verifiable Credential to be issued by a server implementing the
  W3C VC Issuer HTTP API.

The following sections document changes that have been released already:
