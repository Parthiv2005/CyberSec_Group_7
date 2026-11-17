export type LabMode = "vulnerable" | "secured";

export type LabEvent = {
  id: number;
  at: string;
  tone: "warning" | "safe" | "neutral";
  title: string;
  detail: string;
};

export type LabState = {
  mode: LabMode;
  recoveryEmail: string;
  events: LabEvent[];
  nextEventId: number;
};

declare global {
  // Persist the intentionally small demo state through development hot reloads.
  // This is only for the local training lab and is not a production persistence pattern.
  var csrfLabState: LabState | undefined;
}

const DEFAULT_EMAIL = "satwik.recovery@demo.test";

function initialState(): LabState {
  return {
    mode: "vulnerable",
    recoveryEmail: DEFAULT_EMAIL,
    events: [
      {
        id: 1,
        at: new Date().toISOString(),
        tone: "neutral",
        title: "Lab reset",
        detail: "Seeded account restored. Start a demo session before testing the cross-origin request.",
      },
    ],
    nextEventId: 2,
  };
}

export function labState(): LabState {
  if (!globalThis.csrfLabState) globalThis.csrfLabState = initialState();
  return globalThis.csrfLabState;
}

export function resetLab(): LabState {
  globalThis.csrfLabState = initialState();
  return globalThis.csrfLabState;
}

export function setMode(mode: LabMode): LabState {
  const state = labState();
  state.mode = mode;
  appendEvent(
    mode === "vulnerable" ? "warning" : "safe",
    mode === "vulnerable" ? "Vulnerable mode enabled" : "Secured mode enabled",
    mode === "vulnerable"
      ? "The GET endpoint will mutate recovery email when a valid session cookie accompanies the request."
      : "A fresh re-authentication is now required before a recovery-email change can be committed.",
  );
  return state;
}

export function appendEvent(
  tone: LabEvent["tone"],
  title: string,
  detail: string,
): void {
  const state = labState();
  state.events.unshift({
    id: state.nextEventId++,
    at: new Date().toISOString(),
    tone,
    title,
    detail,
  });
  state.events = state.events.slice(0, 8);
}

export function updateRecoveryEmail(email: string, source: string): void {
  const state = labState();
  state.recoveryEmail = email;
  appendEvent("warning", "Recovery email changed", `${source} set the recovery address to ${email}.`);
}

export function recordBlockedGet(email: string): void {
  appendEvent(
    "safe",
    "Forged GET blocked",
    `No account change was made for requested address ${email}. A fresh re-authentication is required.`,
  );
}

export function recordReauthentication(success: boolean): void {
  appendEvent(
    success ? "safe" : "warning",
    success ? "Re-authentication accepted" : "Re-authentication rejected",
    success
      ? "A short-lived grant may now be used for one explicit recovery-email confirmation."
      : "The supplied demo password did not match. The recovery address remains unchanged.",
  );
}

export function recordSignIn(success: boolean): void {
  appendEvent(
    success ? "safe" : "warning",
    success ? "Sign-in accepted" : "Sign-in rejected",
    success
      ? "Valid local demo credentials created an authenticated session cookie."
      : "Incorrect demo email or password. No session cookie was created.",
  );
}

export function recordSecureUpdate(email: string): void {
  const state = labState();
  state.recoveryEmail = email;
  appendEvent(
    "safe",
    "Recovery email changed after re-authentication",
    `The explicit protected confirmation set the recovery address to ${email}.`,
  );
}

export function validDemoEmail(value: unknown): value is string {
  return typeof value === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) && value.length <= 120;
}

export const DEMO_SESSION_COOKIE = "csrf-lab-session";
export const REAUTH_COOKIE = "csrf-lab-reauth";
export const DEMO_SESSION_VALUE = "local-training-session";
export const DEMO_USER_EMAIL = "satwik@demo.test";
export const DEMO_PASSWORD = "demo-pass-2026";
export const REAUTH_TTL_MS = 2 * 60 * 1000;

export function hasValidDemoCredentials(email: unknown, password: unknown): boolean {
  return email === DEMO_USER_EMAIL && password === DEMO_PASSWORD;
}
