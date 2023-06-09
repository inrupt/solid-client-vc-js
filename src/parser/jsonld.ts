//
// Copyright 2022 Inrupt Inc.
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
import {
  ContextParser,
  FetchDocumentLoader,
  IJsonLdContext,
  JsonLdContextNormalized,
} from "jsonld-context-parser";
import { JsonLdParser } from "jsonld-streaming-parser";
import { Store } from "n3";
import { ReadableWebToNodeStream } from "readable-web-to-node-stream";
import CONTEXTS from "./contexts";

/**
 * Creates a context for use with the VC library
 */
// FIXME: See if our access grants specific context should be passed
// through as a parameter instead
export function getVcContext(): Promise<JsonLdContextNormalized> {
  const myParser = new ContextParser({
    documentLoader: new FetchDocumentLoader()
  });
  return myParser.parse(Object.values(CONTEXTS));
}

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
 * Our internal JsonLd Parser with a cached VC context
 */
export class IJsonLdParser extends JsonLdParser {
  constructor(options?: { fetch?: typeof globalThis.fetch }) {
    super({
      documentLoader: new CachedFetchDocumentLoader(
        options?.fetch ?? defaultFetch
      ),
    });
  }
}

/**
 * Converts any HTTP response body into a readable stream
 * @param body The body of the HTTP response
 * @returns The body as a readable stream
 */
function toNodeStream(
  body: ReadableStream<Uint8Array>
): ReadableWebToNodeStream {
  if (typeof (body as unknown as ReadableWebToNodeStream).pipe === "function")
    return body as unknown as ReadableWebToNodeStream;
  return new ReadableWebToNodeStream(body);
}

/**
 * Gets an N3 store from a JSON-LD response to a fetch request
 * @param response A JSON-LD response
 * @param options An optional fetch function for dereferencing remote contexts
 * @returns A store containing the Quads in the JSON-LD response
 */
export function jsonLdResponseToStore(
  response: globalThis.Response,
  options?: { fetch?: typeof globalThis.fetch }
): Promise<Store> {
  if (response.body === null) 
    throw new Error("Empty response body. Expected JSON-LD.");
  
  const store = new Store();
  // Resolve on the `end` event of the stream and return store, reject if the
  // error event occurs
  return promisifyEventEmitter(
    // Convert the response body to Quads and import them into a store
    store.import(toNodeStream(response.body).pipe(new IJsonLdParser(options))),
    store
  );
}
