import { t, Selector } from "testcafe";
import { screen } from "@testing-library/testcafe";

export class GluuPage {
  usernameInput;
  passwordInput;
  submitButton;

  constructor() {
    this.usernameInput = screen.getByRole("textbox");
    this.passwordInput = Selector("input[type=password]");
    this.submitButton = screen.getByRole("button");
  }

  async login(username: string, password: string) {
    await onGluuPage();
    await t
      .typeText(this.usernameInput, username)
      .typeText(this.passwordInput, password)
      .click(this.submitButton);
  }
}

export async function onGluuPage() {
  await t.expect(Selector("form#loginForm").exists).ok();
}
