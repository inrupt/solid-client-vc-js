import { t, Selector } from "testcafe";
import { screen } from "@testing-library/testcafe";

export class BrokerPage {
  accessOpenIdCheckbox: Selector;
  accessOfflineCheckbox: Selector;
  accessWebIdCheckbox: Selector;
  rememberForeverRadioButton: Selector;
  rememberOneHourRadioButton: Selector;
  rememberNotRadioButton: Selector;
  authoriseButton: Selector;
  denyButton: Selector;

  constructor() {
    this.accessOpenIdCheckbox = screen.getByLabelText(
      "log in using your identity"
    );
    this.accessOfflineCheckbox = screen.getByLabelText("offline access");
    this.accessWebIdCheckbox = screen.getByLabelText("solid webid");
    this.rememberForeverRadioButton = screen.getByLabelText(
      "remember this decision until I revoke it"
    );
    this.rememberOneHourRadioButton = screen.getByLabelText(
      "remember this decision for one hour"
    );
    this.rememberNotRadioButton = screen.getByLabelText(
      "prompt me again next time"
    );
    this.authoriseButton = screen.getByText("Authorize");
    this.denyButton = screen.getByText("Deny");
  }

  async authoriseOnce() {
    await onAuthorisePage();
    await t.click(this.rememberNotRadioButton).click(this.authoriseButton);
  }
}

export async function onAuthorisePage() {
  await t.expect(Selector("form[name=confirmationForm]").exists).ok();
}
