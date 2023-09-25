//
// Copyright Inrupt Inc.
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal in
// the Software without restriction, including without limitation the rights to use,
// copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the
// Software, and to permit persons to whom the Software is furnished to do so,
// subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED,
// INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A
// PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
// HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
// OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
// SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
//

/* eslint-disable max-classes-per-file */
import defaultFetch from "@inrupt/universal-fetch";
import { promisifyEventEmitter } from "event-emitter-promisify";
import type {
  IJsonLdContext,
  JsonLdContextNormalized,
} from "jsonld-context-parser";
import { ContextParser, FetchDocumentLoader } from "jsonld-context-parser";
import { JsonLdParser } from "jsonld-streaming-parser";
import { Store } from "n3";
import CONTEXTS from "./contexts";
import type { JsonLd } from "../common/common";

/**
 * A JSON-LD document loader with the standard context for VCs pre-loaded
 */
class CachedFetchDocumentLoader extends FetchDocumentLoader {
  public async load(url: string): Promise<IJsonLdContext> {
    if (Object.keys(CONTEXTS).includes(url)) {
      return CONTEXTS[url as keyof typeof CONTEXTS];
    }
    // FIXME: See if we want to error on other contexts
    return super.load(url);
  }
}

/**
 * Creates a context for use with the VC library
 */
// FIXME: See if our access grants specific context should be passed
// through as a parameter instead
export function getVcContext(
  ...contexts: IJsonLdContext[]
): Promise<JsonLdContextNormalized> {
  const myParser = new ContextParser({
    documentLoader: new CachedFetchDocumentLoader(),
  });
  return myParser.parse([
    ...Object.values(CONTEXTS).map((x) => x["@context"]),
    ...contexts,
  ]);
}

interface Options {
  fetch?: typeof globalThis.fetch;
  baseIRI?: string;
}

/**
 * Our internal JsonLd Parser with a cached VC context
 */
export class CachedJsonLdParser extends JsonLdParser {
  constructor(options?: Options) {
    super({
      documentLoader: new CachedFetchDocumentLoader(
        options?.fetch ?? defaultFetch,
      ),
      baseIRI: options?.baseIRI,
    });
  }
}

/**
 * Gets an N3 store from a JSON-LD string
 * @param response A JSON-LD string
 * @param options An optional fetch function for dereferencing remote contexts
 * @returns A store containing the Quads in the JSON-LD response
 */
export async function jsonLdStringToStore(data: string, options?: Options) {
  try {
    const parser = new CachedJsonLdParser(options);
    const store = new Store();
    const storePromise = promisifyEventEmitter(store.import(parser), store);
    parser.write(data);
    parser.end();
    return await storePromise;
  } catch (e) {
    throw new Error(`Error parsing JSON-LD: [${e}].`);
  }
}

/**
 * Gets an N3 store from a JSON-LD response to a fetch request
 * @param response A JSON-LD response
 * @param options An optional fetch function for dereferencing remote contexts
 * @returns A store containing the Quads in the JSON-LD response
 */
export async function jsonLdResponseToStore(
  response: Response,
  options?: Options,
): Promise<Store> {
  if (response.body === null)
    throw new Error("Empty response body. Expected JSON-LD.");

  return jsonLdStringToStore(await response.text(), options);

  // FIXME: Use this logic once node 16 is deprecated
  // This won't work with node-fetch (and hence versions of Node lower than 16.8) because
  // node-fetch does not have #getReader implemented.
  // You will likely encounter the following error when trying to implement it this way and testing it in Jest:
  // TypeError: The "chunk" argument must be of type string or an instance of Buffer or Uint8Array.
  // Received an instance of Uint8Array.
  // I believe this error is caused by the `fetch` and `TextEncoder` polyfills in our environment
  // causing multiple versions of the Buffer or Uint8Array classes existing and hence `instanceof`
  // checks not behaving as intended.

  // const reader = response.body.getReader();
  // const parser = new IJsonLdParser({ fetch: options?.fetch, baseIRI: response.url });
  // const store = new Store();
  // const result = promisifyEventEmitter(store.import(parser), store);
  // let value = await reader.read();
  // while (!value.done) {
  //   parser.write(value.value);
  //   value = await reader.read();
  // }
  // parser.end();
  // return result;
}

/**
 * Gets an N3 store from a JSON-LD as an Object
 * @param response JSON-LD as an Object
 * @param options An optional fetch function for dereferencing remote contexts
 * @returns A store containing the Quads in the JSON-LD response
 */
export function jsonLdToStore(data: JsonLd, options?: Options) {
  return jsonLdStringToStore(JSON.stringify(data), options);
}
