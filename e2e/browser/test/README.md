# End-to-end tests for solid-client-vc-js in the browser

This directory contains our browser-based end-to-end tests.

## The test code

We use [Playwright](https://playwright.dev) to run our
browser-based end-to-end tests. It is configured in `playwright.config.ts` in
the root of this repository, where it is setup to run all tests defined in files
suffixed with `.playwright.ts` inside of `/e2e/browser/test/`. It also points to
`/e2e/browser/test/globalSetup.ts`, where it is told how to start the system
under test before running the test.

## Running the tests
