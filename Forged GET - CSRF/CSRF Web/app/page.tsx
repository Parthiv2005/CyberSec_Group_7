"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";

type Mode = "vulnerable" | "secured";
type EventTone = "warning" | "safe" | "neutral";

type LabEvent = {
  id: number;
  at: string;
  tone: EventTone;
  title: string;
  detail: string;
};

type Snapshot = {
  mode: Mode;
  recoveryEmail: string;
  events: LabEvent[];
  hasSession: boolean;
  hasReauth: boolean;
  reauthRemainingSeconds: number;
};

const ATTACK_EMAIL = "intruder@malicious.test";
const DEMO_EMAIL = "satwik@demo.test";

function requestOptions(method: "POST", body?: unknown): RequestInit {
  return {
    method,
    headers: body ? { "content-type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  };
}

export default function Home() {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [notice, setNotice] = useState("Start the local session, then open the attacker origin.");
  const [noticeTone, setNoticeTone] = useState<EventTone>("neutral");
  const [email, setEmail] = useState("satwik.secured@demo.test");
  const [password, setPassword] = useState("");
  const [loginEmail, setLoginEmail] = useState(DEMO_EMAIL);
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const response = await fetch("/api/lab/state", { cache: "no-store" });
    if (response.ok) setSnapshot(await response.json());
  }, []);

  useEffect(() => {
    void refresh();
    const timer = window.setInterval(() => void refresh(), 2500);
    return () => window.clearInterval(timer);
  }, [refresh]);

  const endpoint = useMemo(
    () => `http://localhost:3000/api/account/recovery-email?email=${encodeURIComponent(ATTACK_EMAIL)}`,
    [],
  );

  async function mutate(label: string, route: string, body?: unknown) {
    setBusy(label);
    try {
      const response = await fetch(route, requestOptions("POST", body));
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error ?? "Request was not accepted.");
      await refresh();
      return payload;
    } finally {
      setBusy(null);
    }
  }

  async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy("login");
    setLoginError("");
    try {
      const response = await fetch("/api/lab/session", requestOptions("POST", { email: loginEmail, password: loginPassword }));
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        setLoginError(payload.error ?? "Could not sign in to the local demo account.");
        setLoginPassword("");
        await refresh();
        return;
      }
      setLoginPassword("");
      await refresh();
      setNotice("Sign-in accepted. The victim browser now has an authenticated local session cookie.");
      setNoticeTone("safe");
    } finally {
      setBusy(null);
    }
  }

  async function switchMode(mode: Mode) {
    try {
      await mutate("mode", "/api/lab/mode", { mode });
      setNotice(mode === "vulnerable" ? "Vulnerable mode is active. The forged GET can mutate state." : "Secured mode is active. The same GET will be blocked.");
      setNoticeTone(mode === "vulnerable" ? "warning" : "safe");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not change mode.");
      setNoticeTone("warning");
    }
  }

  async function reset() {
    try {
      await mutate("reset", "/api/lab/reset");
      setLoginPassword("");
      setLoginError("");
      setNotice("Lab reset. Sign in again to create a new local session.");
      setNoticeTone("neutral");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not reset the lab.");
      setNoticeTone("warning");
    }
  }

  async function reauthenticate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      const result = await mutate("reauth", "/api/account/recovery-email/reauth", { password });
      setPassword("");
      setNotice(`Identity confirmed. You have ${result.expiresInSeconds} seconds for one explicit confirmation.`);
      setNoticeTone("safe");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Re-authentication failed.");
      setNoticeTone("warning");
      await refresh();
    }
  }

  async function confirmEmail(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      await mutate("confirm", "/api/account/recovery-email/confirm", { email });
      setNotice("Recovery email changed through the deliberate, re-authenticated confirmation flow.");
      setNoticeTone("safe");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "The protected confirmation was not accepted.");
      setNoticeTone("warning");
      await refresh();
    }
  }

  const isSecured = snapshot?.mode === "secured";
  const recoveryCompromised = snapshot?.recoveryEmail === ATTACK_EMAIL;

  if (!snapshot) {
    return <main className="auth-shell"><p className="loading-label">Checking the local training session…</p></main>;
  }

  if (!snapshot.hasSession) {
    return (
      <main className="auth-shell">
        <section className="login-frame" aria-labelledby="login-title">
          <div className="login-intro">
            <div className="brand"><span aria-hidden="true">◒</span> Account Security Lab</div>
            <p className="section-label">LOCAL TRAINING INSTANCE</p>
            <h1 id="login-title">Sign in before examining the account.</h1>
            <p>This lab only creates an authenticated session after the local demo account is verified. That session is what makes the CSRF scenario meaningful.</p>
            <div className="credential-note">
              <span>Demo credentials</span>
              <code>{DEMO_EMAIL}</code>
              <code>demo-pass-2026</code>
            </div>
          </div>
          <form className="login-form" onSubmit={signIn}>
            <div>
              <p className="section-label">AUTHENTICATE</p>
              <h2>Local demo sign-in</h2>
            </div>
            <label htmlFor="login-email">Email</label>
            <input id="login-email" type="email" value={loginEmail} onChange={(event) => setLoginEmail(event.target.value)} autoComplete="username" required disabled={busy !== null} />
            <label htmlFor="login-password">Password</label>
            <input id="login-password" type="password" value={loginPassword} onChange={(event) => setLoginPassword(event.target.value)} autoComplete="current-password" placeholder="Enter demo password" required disabled={busy !== null} />
            {loginError && <p className="login-error" role="alert">{loginError}</p>}
            <button className="login-button" type="submit" disabled={busy !== null}>{busy === "login" ? "Signing in…" : "Sign in to the lab"}</button>
            <p className="login-footnote">No real account, email delivery, or data is involved.</p>
          </form>
        </section>
      </main>
    );
  }

  return (
    <main className="shell">
      <header className="topbar">
        <div className="brand"><span aria-hidden="true">◒</span> Account Security Lab</div>
        <div className="topbar-actions">
          <span className="local-mark">LOCAL ONLY</span>
          <button className="quiet-button" type="button" onClick={reset} disabled={busy !== null}>Sign out &amp; reset</button>
        </div>
      </header>

      <section className="intro" aria-labelledby="page-title">
        <div>
          <p className="section-label">CSRF / VARIANT 1</p>
          <h1 id="page-title">A GET request should never rewrite account state.</h1>
          <p className="lede">Inspect the request shape, reproduce the forged action from a second origin, then observe how fresh re-authentication stops the same attempt.</p>
        </div>
        <div className={`mode-plate ${isSecured ? "is-secured" : "is-vulnerable"}`}>
          <span>Current deployment</span>
          <strong>{isSecured ? "Secured" : "Vulnerable"}</strong>
          <small>{isSecured ? "Fresh identity proof is required" : "GET endpoint mutates state"}</small>
        </div>
      </section>

      <section className="control-strip" aria-label="Lab controls">
        <div className="mode-switch" role="group" aria-label="Choose deployment mode">
          <button type="button" className={!isSecured ? "selected vulnerable" : ""} onClick={() => void switchMode("vulnerable")} disabled={busy !== null}>Vulnerable</button>
          <button type="button" className={isSecured ? "selected secured" : ""} onClick={() => void switchMode("secured")} disabled={busy !== null}>Secured</button>
        </div>
        <div className="session-chip active">
          <span className="status-dot" aria-hidden="true" />
          Authenticated as {DEMO_EMAIL}
        </div>
      </section>

      <p className={`notice ${noticeTone}`} role="status">{notice}</p>

      <div className="dashboard-grid">
        <section className="account-panel" aria-labelledby="account-heading">
          <div className="panel-heading">
            <div>
              <p className="section-label">SIGNED-IN ACCOUNT</p>
              <h2 id="account-heading">Satwik Santosh</h2>
            </div>
            <span className="account-mark">SR</span>
          </div>
          <dl className="account-data">
            <div><dt>Primary email</dt><dd>satwik@demo.test</dd></div>
            <div><dt>Recovery email</dt><dd className={isSecured ? "safe-data" : "warning-data"}>{snapshot?.recoveryEmail ?? "Loading…"}</dd></div>
            <div><dt>Session boundary</dt><dd>localhost:3000</dd></div>
          </dl>
          <p className="account-note">This seeded account is in-memory only. Signing out resets its session and all state.</p>
        </section>

        <section className="request-panel" aria-labelledby="request-heading">
          <div className="panel-heading compact">
            <div>
              <p className="section-label">RECONNAISSANCE CLUE</p>
              <h2 id="request-heading">The suspicious request</h2>
            </div>
            <span className="method-badge">GET</span>
          </div>
          <code className="endpoint">/api/account/recovery-email?email=…</code>
          <p>A URL parameter changes a sensitive account field. There is no deliberate confirmation in the vulnerable route.</p>
          <div className="cause-box">
            <strong>Why this is CSRF Variant 1</strong>
            <span>A foreign page can embed this GET URL. The browser carries the authenticated local session while the endpoint treats the request itself as proof of intent.</span>
          </div>
          <a className="attacker-link" href="http://localhost:3001" target="_blank" rel="noreferrer">Open attacker origin <span aria-hidden="true">↗</span></a>
        </section>

        <section className="event-panel" aria-labelledby="event-heading">
          <div className="panel-heading compact">
            <div>
              <p className="section-label">SERVER-SIDE EVIDENCE</p>
              <h2 id="event-heading">Recent account events</h2>
            </div>
          </div>
          <ol className="event-list">
            {snapshot?.events.map((item) => (
              <li key={item.id} className={item.tone}>
                <span className="event-time">{new Date(item.at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</span>
                <div><strong>{item.title}</strong><p>{item.detail}</p></div>
              </li>
            )) ?? <li className="neutral">Loading event record…</li>}
          </ol>
        </section>
      </div>

      <section className={`recovery-impact ${recoveryCompromised ? "compromised" : ""}`} aria-labelledby="recovery-impact-heading">
        <div>
          <p className="section-label">WHY THIS FIELD MATTERS</p>
          <h2 id="recovery-impact-heading">The recovery email is an account-recovery channel.</h2>
          <p>Password-reset links and ownership-recovery instructions can be sent to this address. It is not a cosmetic profile field.</p>
        </div>
        <div className="impact-outcome">
          <span>{recoveryCompromised ? "Critical consequence" : "Protected account channel"}</span>
          <strong>{recoveryCompromised ? "Password-reset takeover becomes possible." : "Recovery instructions reach the account owner."}</strong>
          <p>{recoveryCompromised ? "An attacker-controlled address can receive recovery links, reset the password, and lock out the legitimate owner." : "If this address changes without consent, the attacker may control the next password-reset path."}</p>
        </div>
      </section>

      <section className={`protected-flow ${isSecured ? "available" : ""}`} aria-labelledby="protection-heading">
        <div className="protected-copy">
          <p className="section-label">IMPLEMENTED MITIGATION</p>
          <h2 id="protection-heading">Require a fresh identity check for a sensitive change.</h2>
          <p>In Secured mode, the identical GET request returns <code>401</code> and makes no change. A person must re-enter the demo password, then explicitly confirm one protected update.</p>
          <p className="password-hint">Demo password: <code>demo-pass-2026</code></p>
        </div>
        <div className="protected-actions" aria-disabled={!isSecured || !snapshot?.hasSession}>
          <form onSubmit={reauthenticate} className="inline-form">
            <label htmlFor="password">Current password</label>
            <div className="form-row"><input id="password" value={password} onChange={(event) => setPassword(event.target.value)} type="password" placeholder="Enter demo password" disabled={!isSecured || !snapshot?.hasSession || busy !== null} /><button type="submit" disabled={!isSecured || !snapshot?.hasSession || busy !== null}>{busy === "reauth" ? "Checking…" : "Verify identity"}</button></div>
          </form>
          <form onSubmit={confirmEmail} className="inline-form confirm-form">
            <label htmlFor="new-email">New recovery email {snapshot?.hasReauth && <span className="grant-label">verified, {snapshot.reauthRemainingSeconds}s left</span>}</label>
            <div className="form-row"><input id="new-email" value={email} onChange={(event) => setEmail(event.target.value)} type="email" disabled={!isSecured || !snapshot?.hasReauth || busy !== null} /><button type="submit" disabled={!isSecured || !snapshot?.hasReauth || busy !== null}>{busy === "confirm" ? "Saving…" : "Confirm change"}</button></div>
          </form>
        </div>
      </section>

      <section className="payload-section" aria-labelledby="payload-heading">
        <div>
          <p className="section-label">EXACT PAYLOAD</p>
          <h2 id="payload-heading">A single embedded request is enough in vulnerable mode.</h2>
        </div>
        <pre><code>{`<img src="${endpoint}" alt="">`}</code></pre>
      </section>

      <footer>Training application. Test only this local instance. No real accounts, data, or services are involved.</footer>
    </main>
  );
}
