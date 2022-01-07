import { Role } from "testcafe";
import { IndexPage } from "./pageModels";
import { BrokerPage } from "./pageModels/broker";
import { CognitoPage } from "./pageModels/cognito";

export const essUser = Role("http://localhost:1234", async (t) => {
  return await essUserLogin(t);
});

/**
 * Unfortunately solid-client-authn-browser sessions, at the time of writing,
 * do not survive a page refresh.
 * Testcafe's "Role" functionality logs you in,
 * then redirects you back to where you wanted to be for the test.
 * To avoid this redirect, the login functionality is extracted into this single helper,
 * which we'll have to use instead of the Role for now.
 * Move this function into `essUser` and replace uses of it with uses of the Role
 * once this issue is resolved: https://github.com/inrupt/solid-client-authn-js/issues/423
 */
export const essUserLogin = async (_t: TestController) => {
  const indexPage = new IndexPage();
  await indexPage.startLogin(process.env.E2E_TEST_ESS_IDP_URL);

  const cognitoPage = new CognitoPage();
  await cognitoPage.login(
    process.env.E2E_TEST_ESS_COGNITO_USER!,
    process.env.E2E_TEST_ESS_COGNITO_PASSWORD!
  );

  const authorisePage = new BrokerPage();
  await authorisePage.authoriseOnce();

  await indexPage.handleRedirect();
};
