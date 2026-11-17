import assert from "node:assert/strict";
import test from "node:test";
import {
  labState,
  hasValidDemoCredentials,
  recordBlockedGet,
  recordReauthentication,
  recordSecureUpdate,
  resetLab,
  setMode,
  updateRecoveryEmail,
} from "../lib/lab";

test("only the seeded local credentials can create a demo session", () => {
  assert.equal(hasValidDemoCredentials("satwik@demo.test", "demo-pass-2026"), true);
  assert.equal(hasValidDemoCredentials("satwik@demo.test", "wrong-password"), false);
  assert.equal(hasValidDemoCredentials("wrong@demo.test", "demo-pass-2026"), false);
});

test("vulnerable state accepts the forged GET mutation model", () => {
  resetLab();
  setMode("vulnerable");
  updateRecoveryEmail("intruder@malicious.test", "Cross-origin GET request");

  assert.equal(labState().recoveryEmail, "intruder@malicious.test");
  assert.equal(labState().events[0]?.title, "Recovery email changed");
});

test("secured state can record a blocked forged GET without mutation", () => {
  resetLab();
  setMode("secured");
  const before = labState().recoveryEmail;
  recordBlockedGet("intruder@malicious.test");

  assert.equal(labState().recoveryEmail, before);
  assert.equal(labState().events[0]?.title, "Forged GET blocked");
});

test("failed re-authentication does not mutate the address", () => {
  resetLab();
  const before = labState().recoveryEmail;
  recordReauthentication(false);

  assert.equal(labState().recoveryEmail, before);
  assert.equal(labState().events[0]?.title, "Re-authentication rejected");
});

test("a protected confirmation updates the address only through the secure model", () => {
  resetLab();
  setMode("secured");
  recordReauthentication(true);
  recordSecureUpdate("satwik.secured@demo.test");

  assert.equal(labState().recoveryEmail, "satwik.secured@demo.test");
  assert.equal(labState().events[0]?.title, "Recovery email changed after re-authentication");
});
