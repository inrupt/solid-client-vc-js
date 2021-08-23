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

/**
 * @ignore Internal fallback for when no fetcher is provided; not to be used downstream.
 * Note that this is inspired from @inrupt/solid-client, extended now that solid-client-authn
 * provides a default session.
 */
const defaultFetch: typeof window.fetch = async (resource, init) => {
  /* istanbul ignore if: `require` is always defined in the unit test environment */
  if (typeof window === "object" && typeof require !== "function") {
    return window.fetch(resource, init);
  }
  /* istanbul ignore if: `require` is always defined in the unit test environment */
  if (typeof require !== "function") {
    // When using Node.js with ES Modules, require is not defined:
    let fetch;
    try {
      // solid-client-authn-browser may be unresolved, we just try to autodetect it.
      const { fetch: defaultSessionFetch } = await import(
        /* eslint-disable import/no-unresolved */
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        "@inrupt/solid-client-authn-browser"
      );
      fetch = defaultSessionFetch;
    } catch (e) {
      const crossFetchModule = await import("cross-fetch");
      fetch = crossFetchModule.default;
      return await fetch(resource, init);
    }
  }
  // Implementation note: it's up to the client application to resolve these module names to their
  // respective npm packages. At least one commonly used tool (Webpack) is only able to do that if
  // the module names are literal strings.
  // Additionally, Webpack throws a warning in a way that halts compilation for at least Next.js
  // when using native JavaScript dynamic imports (`import()`), whereas `require()` just logs a
  // warning. Since the use of package names instead of file names requires a bundler anyway, this
  // should not have any practical consequences. For more background, see:
  // https://github.com/webpack/webpack/issues/7713
  // eslint-disable-next-line no-shadow
  let fetch;

  try {
    // eslint-disable-next-line global-require, @typescript-eslint/no-var-requires
    const sca = require("@inrupt/solid-client-authn-browser");
    /* istanbul ignore next : `solid-client-authn-browser` is not a dependency of this library */
    fetch = sca.fetch;
  } catch (e) {
    // eslint-disable-next-line prefer-const, global-require
    fetch = require("cross-fetch");
  }

  return fetch(resource, init);
};

export default defaultFetch;
