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
import { FetchDocumentLoader, IJsonLdContext } from "jsonld-context-parser";
import { JsonLdParser } from "jsonld-streaming-parser";
import { Store } from "n3";
import { ReadableWebToNodeStream } from 'readable-web-to-node-stream';
import { DatasetCore } from "@rdfjs/types";
import VC_CONTEXT from "./context";

// A JSON-LD document loader with the standard context for VCs pre-loaded
class CachedFetchDocumentLoader extends FetchDocumentLoader {
  public async load(url: string): Promise<IJsonLdContext> {
    if (url === "https://www.w3.org/2018/credentials/v1") {
      return VC_CONTEXT;
    }
    // FIXME: See if we want to error on other contexts
    return super.load(url);
  }
}

// Our internal JsonLd Parser with a cached VC context
export class IJsonLdParser extends JsonLdParser {
  constructor(options?: { fetch?: typeof globalThis.fetch }) {
    super({
      documentLoader: new CachedFetchDocumentLoader(
        options?.fetch ?? defaultFetch
      ),
    });
  }
}

function toNodeStream(body: ReadableStream<Uint8Array>): ReadableWebToNodeStream {
  if (typeof (body as unknown as ReadableWebToNodeStream).pipe === 'function')
    return body as unknown as ReadableWebToNodeStream;
  return new ReadableWebToNodeStream(body);
}

// This is what we should be doing but our tests complain
export function jsonLdResponseToStore(response: globalThis.Response, options?: { fetch?: typeof globalThis.fetch }): Promise<DatasetCore> | DatasetCore {
  const store = new Store();

  const { body } = response;

  // If the body is null then there are no quads
  // FIXME: See if we should error here
  if (body === null)
    return store;

  return promisifyEventEmitter(
    store.import(toNodeStream(body).pipe(new IJsonLdParser(options))),
    store
  );
}
