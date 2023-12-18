# Inrupt client library for Verifiable Credentials

[![Contributor Covenant](https://img.shields.io/badge/Contributor%20Covenant-2.1-4baaaa.svg)](CODE-OF-CONDUCT.md)

This project adheres to the Contributor Covenant [code of conduct](CODE-OF-CONDUCT.md).
By participating, you are expected to uphold this code. Please report unacceptable
behavior to [engineering@inrupt.com](mailto:engineering@inrupt.com).

**This library is still in alpha state**

This library is a client library designed to interact with servers implementing
the [W3C VC HTTP APIs](https://w3c-ccg.github.io/vc-api/).

More documentation will be added when the library matures.

## Supported environments

Our JavaScript Client Libraries use relatively modern JavaScript, aligned with
the [ES2018](https://262.ecma-international.org/9.0/) Specification features, we
ship both [ESM](https://nodejs.org/docs/latest-v16.x/api/esm.html) and
[CommonJS](https://nodejs.org/docs/latest-v16.x/api/modules.html), with type
definitions for TypeScript alongside.

This means that out of the box, we only support environments (browsers or
runtimes) that were released after mid-2018, if you wish to target other (older)
environments, then you will need to cross-compile our SDKs via the use of
[Babel](https://babeljs.io), [webpack](https://webpack.js.org/),
[SWC](https://swc.rs/), or similar.

If you need support for Internet Explorer, it is recommended to pass them
through a tool like [Babel](https://babeljs.io), and to add polyfills for e.g.
`Map`, `Set`, `Promise`, `Headers`, `Array.prototype.includes`, `Object.entries`
and `String.prototype.endsWith`.

### Node.js Support

Our JavaScript Client Libraries track Node.js [LTS
releases](https://nodejs.org/en/about/releases/), and support 18.x and 20.x.

## Changelog

See [the release notes](https://github.com/inrupt/template-ts/blob/main/CHANGELOG.md).

## License

MIT © [Inrupt](https://inrupt.com)
