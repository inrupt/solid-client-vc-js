import { t, Selector } from "testcafe";
import { screen } from "@testing-library/testcafe";

export class CognitoPage {
  usernameInput;
  passwordInput;
  submitButton;

  constructor() {
    // The Cognito sign-in page contains the sign-in form twice and is basically confusing
    // TestCafe/testing-library, hence the cumbersome selectors rather than selecting by label text.
    this.usernameInput = screen.getByRole("textbox");
    this.passwordInput = Selector(".visible-lg input[type=password]");
    this.submitButton = Selector(".visible-lg input[type=submit]");
  }

  async login(username: string, password: string) {
    await onCognitoPage();
    await t
      .typeText(this.usernameInput, username)
      .typeText(this.passwordInput, password)
      .click(this.submitButton);
  }
}

export async function onCognitoPage() {
  await t.expect(Selector("form[name=cognitoSignInForm]").exists).ok();
}
