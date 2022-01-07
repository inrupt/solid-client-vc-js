import { t, ClientFunction, Selector } from "testcafe";
import { screen } from "@testing-library/testcafe";

export class IndexPage {
  idpInput;
  submitButton;

  constructor() {
    this.idpInput = screen.getByLabelText("Identity provider:");
    this.submitButton = screen.getByText("Log in");
  }

  async startLogin(idp = "https://broker.pod.inrupt.com") {
    await t
      .selectText(this.idpInput)
      .pressKey("delete")
      .typeText(this.idpInput, idp)
      .click(this.submitButton)
      // For some reason the login process does not seem to kicked off
      // directly in response to the form submission, but after a timeout or something.
      // Thus, we have to explicitly wait for it to start navigating:
      .wait(500);
  }

  async handleRedirect() {
    // It looks like testing-library selectors do not allow us to wait for the element to appear,
    // hence the use of TestCafe's native Selector:
    // const initialisationNotification = screen.getByText("End-to-end test helpers initialised.");
    const initialisationNotification = Selector("[role=alert]");
    await t
      .expect(initialisationNotification.exists)
      .ok(
        "solid-client-authn took too long to verify the query parameters after redirection.",
        { timeout: 15000 }
      );
  }
}

export async function isIndexPage() {
  return (
    (await ClientFunction(() => window.location.origin)()) ===
    "http://localhost:1234"
  );
}
