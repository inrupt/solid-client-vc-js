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
import { JsonLdParser } from "jsonld-streaming-parser";
import { FetchDocumentLoader, IJsonLdContext } from "jsonld-context-parser";
import { Store } from "n3";
import { promisifyEventEmitter } from "event-emitter-promisify";
import defaultFetch from "../fetcher";
import VC_CONTEXT from "./context";

// A JSON-LD document loader with the standard context for VCs pre-loaded
class CachedFetchDocumentLoader extends FetchDocumentLoader {
  public async load(url: string): Promise<IJsonLdContext> {
    if (url === "https://www.w3.org/2018/credentials/v1") {
      return VC_CONTEXT;
    }
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

// Load the response of fetching a JSON-LD object into an N3 Store.
export async function jsonLdResponseToStore(
  response: Response,
  options?: { fetch?: typeof globalThis.fetch }
): Promise<Store> {
  const parser = new IJsonLdParser(options);
  const store = new Store();

  const res = promisifyEventEmitter(store.import(parser), store);

  parser.write(await response.text());
  parser.end();

  return res;
}

// This is what we should be doing but our tests complain
// export function jsonLdResponseToStore(response: Response, options?: { fetch?: typeof globalThis.fetch }): Promise<Store> {
//   if (typeof response.body === 'undefined') {
//     throw new Error('Response has no body');
//   }

//   const store = new Store();
//   return promisifyEventEmitter(store.import(new IJsonLdParser(options).import(response.body as any)), store);
// }
