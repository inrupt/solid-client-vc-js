import { getVcContext, jsonLdResponseToStore } from "./src/parser/jsonld"
import { DataFactory as DF, Term } from 'n3';
import { Util } from "jsonld-streaming-serializer";

const data = {
  "@context": [
    "https://www.w3.org/2018/credentials/v1",
    "https://schema.inrupt.com/credentials/v1.jsonld",
  ],
  type: ["VerifiableCredential", "SolidAccessGrant"],
  credentialSubject: {
    id: "http://example.org/jeswr",
    providedConsent: {
      hasStatus:
        true,
    },
  },
}


const VC = "https://www.w3.org/2018/credentials#";
const RDF = "http://www.w3.org/1999/02/22-rdf-syntax-ns#";
const XSD = "http://www.w3.org/2001/XMLSchema#";
const SEC = "https://w3id.org/security#";
const CRED = "https://www.w3.org/2018/credentials#";


async function main() {
  const vcStore = await jsonLdResponseToStore(new Response(JSON.stringify(data)))
  const context = await getVcContext();

  const vcs = vcStore.getSubjects(
    `${RDF}type`,
    `${VC}VerifiableCredential`,
    DF.defaultGraph()
  );
  if (vcs.length !== 1) {
    throw new Error(
      `Expected exactly one Verifiable Credential i received: ${vcs.length}`
    );
  }

  const [vc] = vcs;
  
  const types: string[] = [];
  for (const t of vcStore.getObjects(vc, `${RDF}type`, DF.defaultGraph())) {
    if (t.termType !== "NamedNode") {
      throw new Error(
        `Expected all VC types to be Named Nodes but received [${t.value}] of termType [${t.termType}]`
      );
    }

    const compact = context.compactIri(t.value, true);

    if (/^[a-z]+$/i.test(compact))
      types.push(compact);
  }

  function getSingleObject(
    fullProperty: string,
    subject?: Term,
    graph: Term = DF.defaultGraph()
  ): Term {
    const objects = vcStore.getObjects(subject ?? vc, fullProperty, graph);

    if (objects.length !== 1) {
      throw new Error(
        `Expected exactly one [${fullProperty}] for the Verifiable Credential ${vc.value}, received: ${objects.length}`
      );
    }

    return objects[0];
  }

  function getSingleObjectOfTermType(
    fullProperty: string,
    subject?: Term,
    graph?: Term,
    termType = "NamedNode"
  ) {
    const object = getSingleObject(fullProperty, subject, graph);

    if (object.termType !== termType) {
      throw new Error(
        `Expected property [${fullProperty}] of the Verifiable Credential [${vc.value}] to be a ${termType}, received: ${object.termType}`
      );
    }

    // TODO: Make sure that Literals with URIs are correclty handled here
    return object.value;
  }

  function getProperties(subject: Term) {
    const object: Record<string, unknown> = {};

    for (const predicate of vcStore.getPredicates(
      subject,
      null,
      DF.defaultGraph()
    )) {
      if (predicate.termType !== "NamedNode") {
        throw new Error("Predicate must be a named node")
      }
      
      const compact = context.compactIri(predicate.value, true);
      if (/^[a-z]+$/i.test(compact)) {
        const objects = vcStore.getObjects(
          subject,
          predicate,
          DF.defaultGraph()
        );
        
        if (objects.length === 1) {
          object[compact] = writeObject(objects[0])
        } else {
          object[compact] = objects.map(object => writeObject(object))
        }
      }
    }

    return object;
  }

  function writeObject(object: Term) {
    switch (object.termType) {
      case "BlankNode":
        return getProperties(object);
      case "NamedNode":
        // TODO: See if we actually want to do compacting here
        // given how ConsentStatusExplicitlyGiven as the full
        // URI in e2e tests, and this may make it look like a
        // literal
        return context.compactIri(object.value, true);
      case "Literal":
        return Util.termToValue(object, context);
      default:
        throw new Error("Unexpected term type")
    }
  }


  const credentialSubject = getSingleObjectOfTermType(
    `${CRED}credentialSubject`
  );

  const credentialSubjectData = getProperties(DF.namedNode(credentialSubject))
  credentialSubjectData.id = credentialSubject;

  // console.log(credentialSubjectData)
  
  // any = {
  //   id: credentialSubject,
  // };

  const written = new Set();


  // for (const predicate of vcStore.getPredicates(
  //   DF.namedNode(credentialSubject),
  //   null,
  //   DF.defaultGraph()
  // )) {
  //   if (predicate.termType !== "NamedNode") {
  //     throw new Error("Predicate must be a named node")
  //   }
    
  //   const compact = context.compactIri(predicate.value, true);

  //   if (/^[a-z]+$/i.test(compact)) {
  //     credentialSubjectData[compact] = {}

    

  //   const objects = vcStore.getObjects(
  //     DF.namedNode(credentialSubject),
  //     predicate,
  //     DF.defaultGraph()
  //   );

    

  //     console.log(compact)
  //   }

  //   // const objects = vcStore.getObjects(
  //   //   DF.namedNode(credentialSubject),
  //   //   predicate,
  //   //   DF.defaultGraph()
  //   // );

  //   // console.log(predicate, objects)

  // //   if (objects.length === 1) {
  // //     const object = objects[0];
  // //     if (object.termType === "NamedNode") {
  // //       credentialSubjectData[predicate.value] = object.value;
  // //     } else if (object.termType === "Literal") {
  // //       credentialSubjectData[predicate.value] = object.value;
  // //     } else {
  // //       throw new Error(
  // //         `Expected credentialSubject to be a Named Node or Literal, received: ${object.termType}`
  // //       );
  // //     }
  // //   } else {
  // //     throw new Error(
  // //       `Expected exactly one [${predicate.value}] for the Verifiable Credential ${vc.value}, received: ${objects.length}`
  // //     );
  // //   }
  // }

  console.log(credentialSubjectData)
}

main();
