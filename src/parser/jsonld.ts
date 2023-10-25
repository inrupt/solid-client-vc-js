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
import { fetch as defaultFetch } from "@inrupt/universal-fetch";
import { promisifyEventEmitter } from "event-emitter-promisify";
import type {
  IJsonLdContext,
  IJsonLdContextNormalizedRaw,
  IParseOptions,
  JsonLdContext,
  JsonLdContextNormalized,
} from "jsonld-context-parser";
import { ContextParser, FetchDocumentLoader } from "jsonld-context-parser";
import { JsonLdParser } from "jsonld-streaming-parser";
import { Store } from "n3";
import { ParsingContext } from "jsonld-streaming-parser/lib/ParsingContext";
import CONTEXTS, { cachedContexts } from "./contexts";
import type { JsonLd } from "../common/common";

/**
 * A JSON-LD document loader with the standard context for VCs pre-loaded
 */
class CachedFetchDocumentLoader extends FetchDocumentLoader {
  private contexts: Record<string, JsonLd>;

  constructor(
    contexts?: Record<string, JsonLd>,
    private readonly allowContextFetching = false,
    ...args: ConstructorParameters<typeof FetchDocumentLoader>
  ) {
    super(args[0] ?? defaultFetch);
    this.contexts = { ...contexts, ...cachedContexts, ...CONTEXTS };
  }

  public async load(url: string): Promise<IJsonLdContext> {
    if (Object.keys(this.contexts).includes(url)) {
      return this.contexts[url as keyof typeof CONTEXTS];
    }
    if (!this.allowContextFetching) {
      throw new Error(`Unexpected context requested [${url}]`);
    }
    return super.load(url);
  }
}

/**
 * Creates a context for use with the VC library
 */
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

export interface ParseOptions {
  baseIRI?: string;
  contexts?: Record<string, JsonLd>;
  allowContextFetching?: boolean;
}

const reusableDocumentLoader = new CachedFetchDocumentLoader();

class MyContextParser extends ContextParser {
  private cachedParsing: Record<string, Promise<JsonLdContextNormalized>> = {};

  async parse(
    context: JsonLdContext,
    options?: IParseOptions,
  ): Promise<JsonLdContextNormalized> {
    if (
      typeof options?.baseIRI === "undefined" &&
      options?.processingMode === 1.1 &&
      Object.keys(options?.parentContext ?? {}).length === 0 &&
      Array.isArray(context) &&
      context.every((c) => typeof c === "string")
    ) {
      const str = JSON.stringify(context);
      console.log('cache hit', str in this.cachedParsing);
      return (this.cachedParsing[str] ??= super.parse(context, options));
      // return super.parse(context, options)
    }

    return super.parse(context, options);
  }

  load(url: string) {
    return super.load(url);
  }
}

const reusableContextParser = new MyContextParser({
  documentLoader: reusableDocumentLoader,
});

/**
 * Our internal JsonLd Parser with a cached VC context
 */
export class CachedJsonLdParser extends JsonLdParser {
  constructor(options?: ParseOptions) {
    let documentLoader: CachedFetchDocumentLoader;

    if (!options?.contexts && !options?.allowContextFetching) {
      documentLoader = reusableDocumentLoader;
    } else {
      documentLoader = new CachedFetchDocumentLoader(
        options.contexts,
        options.allowContextFetching,
        defaultFetch,
      );
    }

    super({
      documentLoader,
      baseIRI: options?.baseIRI,
    });

    if (!options?.contexts && !options?.allowContextFetching) {
      // @ts-ignore
      this.parsingContext.contextParser = reusableContextParser;
    }
  }
}

/**
 * Gets an N3 store from a JSON-LD string
 * @param response A JSON-LD string
 * @param options An optional fetch function for dereferencing remote contexts
 * @returns A store containing the Quads in the JSON-LD response
 */
export async function jsonLdStringToStore(
  data: string,
  options?: ParseOptions,
) {
  const parser = new CachedJsonLdParser(options);
  const store = new Store();
  const storePromise = promisifyEventEmitter(store.import(parser), store);
  parser.write(data);
  parser.end();
  return storePromise;
}

/**
 * Gets an N3 store from a JSON-LD as an Object
 * @param response JSON-LD as an Object
 * @param options An optional fetch function for dereferencing remote contexts
 * @returns A store containing the Quads in the JSON-LD response
 */
export function jsonLdToStore(data: JsonLd, options?: ParseOptions) {
  return jsonLdStringToStore(JSON.stringify(data), options);
}
