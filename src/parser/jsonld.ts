import { JsonLdParser } from 'jsonld-streaming-parser';
import { FetchDocumentLoader, IJsonLdContext } from 'jsonld-context-parser';
import defaultFetch from "../fetcher";
import { Store } from 'n3';
import { promisifyEventEmitter } from 'event-emitter-promisify';

// The context object for https://www.w3.org/2018/credentials/v1
const VC_CONTEXT = {"@context":{"@version":1.1,"@protected":true,"id":"@id","type":"@type","VerifiableCredential":{"@id":"https://www.w3.org/2018/credentials#VerifiableCredential","@context":{"@version":1.1,"@protected":true,"id":"@id","type":"@type","cred":"https://www.w3.org/2018/credentials#","sec":"https://w3id.org/security#","xsd":"http://www.w3.org/2001/XMLSchema#","credentialSchema":{"@id":"cred:credentialSchema","@type":"@id","@context":{"@version":1.1,"@protected":true,"id":"@id","type":"@type","cred":"https://www.w3.org/2018/credentials#","JsonSchemaValidator2018":"cred:JsonSchemaValidator2018"}},"credentialStatus":{"@id":"cred:credentialStatus","@type":"@id"},"credentialSubject":{"@id":"cred:credentialSubject","@type":"@id"},"evidence":{"@id":"cred:evidence","@type":"@id"},"expirationDate":{"@id":"cred:expirationDate","@type":"xsd:dateTime"},"holder":{"@id":"cred:holder","@type":"@id"},"issued":{"@id":"cred:issued","@type":"xsd:dateTime"},"issuer":{"@id":"cred:issuer","@type":"@id"},"issuanceDate":{"@id":"cred:issuanceDate","@type":"xsd:dateTime"},"proof":{"@id":"sec:proof","@type":"@id","@container":"@graph"},"refreshService":{"@id":"cred:refreshService","@type":"@id","@context":{"@version":1.1,"@protected":true,"id":"@id","type":"@type","cred":"https://www.w3.org/2018/credentials#","ManualRefreshService2018":"cred:ManualRefreshService2018"}},"termsOfUse":{"@id":"cred:termsOfUse","@type":"@id"},"validFrom":{"@id":"cred:validFrom","@type":"xsd:dateTime"},"validUntil":{"@id":"cred:validUntil","@type":"xsd:dateTime"}}},"VerifiablePresentation":{"@id":"https://www.w3.org/2018/credentials#VerifiablePresentation","@context":{"@version":1.1,"@protected":true,"id":"@id","type":"@type","cred":"https://www.w3.org/2018/credentials#","sec":"https://w3id.org/security#","holder":{"@id":"cred:holder","@type":"@id"},"proof":{"@id":"sec:proof","@type":"@id","@container":"@graph"},"verifiableCredential":{"@id":"cred:verifiableCredential","@type":"@id","@container":"@graph"}}},"EcdsaSecp256k1Signature2019":{"@id":"https://w3id.org/security#EcdsaSecp256k1Signature2019","@context":{"@version":1.1,"@protected":true,"id":"@id","type":"@type","sec":"https://w3id.org/security#","xsd":"http://www.w3.org/2001/XMLSchema#","challenge":"sec:challenge","created":{"@id":"http://purl.org/dc/terms/created","@type":"xsd:dateTime"},"domain":"sec:domain","expires":{"@id":"sec:expiration","@type":"xsd:dateTime"},"jws":"sec:jws","nonce":"sec:nonce","proofPurpose":{"@id":"sec:proofPurpose","@type":"@vocab","@context":{"@version":1.1,"@protected":true,"id":"@id","type":"@type","sec":"https://w3id.org/security#","assertionMethod":{"@id":"sec:assertionMethod","@type":"@id","@container":"@set"},"authentication":{"@id":"sec:authenticationMethod","@type":"@id","@container":"@set"}}},"proofValue":"sec:proofValue","verificationMethod":{"@id":"sec:verificationMethod","@type":"@id"}}},"EcdsaSecp256r1Signature2019":{"@id":"https://w3id.org/security#EcdsaSecp256r1Signature2019","@context":{"@version":1.1,"@protected":true,"id":"@id","type":"@type","sec":"https://w3id.org/security#","xsd":"http://www.w3.org/2001/XMLSchema#","challenge":"sec:challenge","created":{"@id":"http://purl.org/dc/terms/created","@type":"xsd:dateTime"},"domain":"sec:domain","expires":{"@id":"sec:expiration","@type":"xsd:dateTime"},"jws":"sec:jws","nonce":"sec:nonce","proofPurpose":{"@id":"sec:proofPurpose","@type":"@vocab","@context":{"@version":1.1,"@protected":true,"id":"@id","type":"@type","sec":"https://w3id.org/security#","assertionMethod":{"@id":"sec:assertionMethod","@type":"@id","@container":"@set"},"authentication":{"@id":"sec:authenticationMethod","@type":"@id","@container":"@set"}}},"proofValue":"sec:proofValue","verificationMethod":{"@id":"sec:verificationMethod","@type":"@id"}}},"Ed25519Signature2018":{"@id":"https://w3id.org/security#Ed25519Signature2018","@context":{"@version":1.1,"@protected":true,"id":"@id","type":"@type","sec":"https://w3id.org/security#","xsd":"http://www.w3.org/2001/XMLSchema#","challenge":"sec:challenge","created":{"@id":"http://purl.org/dc/terms/created","@type":"xsd:dateTime"},"domain":"sec:domain","expires":{"@id":"sec:expiration","@type":"xsd:dateTime"},"jws":"sec:jws","nonce":"sec:nonce","proofPurpose":{"@id":"sec:proofPurpose","@type":"@vocab","@context":{"@version":1.1,"@protected":true,"id":"@id","type":"@type","sec":"https://w3id.org/security#","assertionMethod":{"@id":"sec:assertionMethod","@type":"@id","@container":"@set"},"authentication":{"@id":"sec:authenticationMethod","@type":"@id","@container":"@set"}}},"proofValue":"sec:proofValue","verificationMethod":{"@id":"sec:verificationMethod","@type":"@id"}}},"RsaSignature2018":{"@id":"https://w3id.org/security#RsaSignature2018","@context":{"@version":1.1,"@protected":true,"challenge":"sec:challenge","created":{"@id":"http://purl.org/dc/terms/created","@type":"xsd:dateTime"},"domain":"sec:domain","expires":{"@id":"sec:expiration","@type":"xsd:dateTime"},"jws":"sec:jws","nonce":"sec:nonce","proofPurpose":{"@id":"sec:proofPurpose","@type":"@vocab","@context":{"@version":1.1,"@protected":true,"id":"@id","type":"@type","sec":"https://w3id.org/security#","assertionMethod":{"@id":"sec:assertionMethod","@type":"@id","@container":"@set"},"authentication":{"@id":"sec:authenticationMethod","@type":"@id","@container":"@set"}}},"proofValue":"sec:proofValue","verificationMethod":{"@id":"sec:verificationMethod","@type":"@id"}}},"proof":{"@id":"https://w3id.org/security#proof","@type":"@id","@container":"@graph"}}}

// A JSON-LD document loader with the standard context for VCs pre-loaded
class CachedFetchDocumentLoader extends FetchDocumentLoader {
  public async load(url: string): Promise<IJsonLdContext> {
    if (url === 'https://www.w3.org/2018/credentials/v1') {
      return VC_CONTEXT;
    }
    return super.load(url);
  }
}

// Our internal JsonLd Parser with a cached VC context
export class IJsonLdParser extends JsonLdParser {
  constructor(options?: { fetch?: typeof globalThis.fetch }) {
    super({
      documentLoader: new CachedFetchDocumentLoader(options?.fetch ?? defaultFetch),
    })
  }
}

// Load the response of fetching a JSON-LD object into an N3 Store.
export async function jsonLdResponseToStore(response: Response, options?: { fetch?: typeof globalThis.fetch }): Promise<Store> {
  const parser = new IJsonLdParser(options);
  const store = new Store();

  const res = promisifyEventEmitter(store.import(parser), store);

  parser.write(await response.text())
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


