import { Session } from "@inrupt/solid-client-authn-browser";
import { sampleModuleFn } from "@inrupt/solid-client-vc-js";

export function getHelpers(podRoot: string, session: Session) {
  return {
    sampleModuleFn,
  };
}
