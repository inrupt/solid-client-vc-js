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
import { promisifyEventEmitter } from "event-emitter-promisify";
import type {
  IJsonLdContext,
  IParseOptions,
  JsonLdContext,
  JsonLdContextNormalized,
} from "jsonld-context-parser";
import { ContextParser, FetchDocumentLoader } from "jsonld-context-parser";
import { JsonLdParser } from "jsonld-streaming-parser";
import { Store } from "n3";
import md5 from "md5";
import type { JsonLd } from "../common/common";
import CONTEXTS, { cachedContexts } from "./contexts";

/**
 * A JSON-LD document loader with the standard context for VCs pre-loaded
 */
export class CachedFetchDocumentLoader extends FetchDocumentLoader {
  private contexts: Record<string, JsonLd>;

  constructor(
    contexts?: Record<string, JsonLd>,
    private readonly allowContextFetching = false,
    ...args: ConstructorParameters<typeof FetchDocumentLoader>
  ) {
    super(args[0] ?? fetch);
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

export interface ParseOptions {
  baseIRI?: string;
  contexts?: Record<string, JsonLd>;
  allowContextFetching?: boolean;
}

function hashOptions(options: IParseOptions | undefined) {
  const opts = { ...options, parentContext: undefined };
  for (const key of Object.keys(opts)) {
    if (typeof opts[key as keyof typeof opts] === "undefined") {
      delete opts[key as keyof typeof opts];
    }
  }

  return md5(JSON.stringify(opts, Object.keys(opts).sort()));
}

function hashContext(
  context: JsonLdContext,
  cmap: (c: IJsonLdContext) => number,
): string {
  if (Array.isArray(context)) {
    return md5(
      JSON.stringify(context.map((c) => (typeof c === "string" ? c : cmap(c)))),
    );
  }
  return typeof context === "string" ? md5(context) : cmap(context).toString();
}

// This is a workaround until https://github.com/rubensworks/jsonld-context-parser.js/pull/70 is closed
export class CachingContextParser extends ContextParser {
  private cachedParsing: Record<string, Promise<JsonLdContextNormalized>> = {};

  private contextMap: Map<IJsonLdContext, number> = new Map();

  private contextHashMap: Map<string, number> = new Map();

  private mapIndex = 1;

  private cmap = (context: IJsonLdContext) => {
    if (!this.contextMap.has(context)) {
      const hash = md5(JSON.stringify(context));
      if (!this.contextHashMap.has(hash)) {
        this.contextHashMap.set(hash, (this.mapIndex += 1));
      }
      this.contextMap.set(context, this.contextHashMap.get(hash)!);
    }
    return this.contextMap.get(context)!;
  };

  async parse(
    context: JsonLdContext,
    options?: IParseOptions,
  ): Promise<JsonLdContextNormalized> {
    let hash = hashOptions(options);

    if (
      options?.parentContext &&
      Object.keys(options.parentContext).length !== 0
    ) {
      hash = md5(hash + this.cmap(options.parentContext));
    }

    // eslint-disable-next-line no-return-assign
    return (this.cachedParsing[md5(hash + hashContext(context, this.cmap))] ??=
      super.parse(context, options));
  }
}

let reusableDocumentLoader: CachedFetchDocumentLoader;
let reusableContextParser: CachingContextParser;

/**
 * Our internal JsonLd Parser with a cached VC context
 */
export class CachedJsonLdParser extends JsonLdParser {
  constructor(options?: ParseOptions) {
    let documentLoader: CachedFetchDocumentLoader;

    if (!options?.contexts && !options?.allowContextFetching) {
      reusableDocumentLoader ??= new CachedFetchDocumentLoader(
        undefined,
        undefined,
        fetch,
      );
      documentLoader = reusableDocumentLoader;
    } else {
      documentLoader = new CachedFetchDocumentLoader(
        options.contexts,
        options.allowContextFetching,
        fetch,
      );
    }

    super({
      documentLoader,
      baseIRI: options?.baseIRI,
    });

    if (!options?.contexts && !options?.allowContextFetching) {
      reusableContextParser ??= new CachingContextParser({
        documentLoader: reusableDocumentLoader,
      });
      // @ts-expect-error parsingContext is an internal property
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
export function jsonLdToStore(data: unknown, options?: ParseOptions) {
  return jsonLdStringToStore(JSON.stringify(data), options);
}
