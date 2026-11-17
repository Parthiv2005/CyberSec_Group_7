# Account Security Lab: CSRF Variant 1

A small, local-only training application for the **GET-based forged action** variant of Cross-Site Request Forgery (CSRF). It is designed for the IT-30001 Web Server Security assignment: identify the vulnerable code path, reproduce the exploit, show the root cause, implement one mitigation, and explain the alternatives.

> Authorized use only: run and test this application only on your own machine. It uses a seeded in-memory account and no real credentials, accounts, or external services.

## What the lab demonstrates

- **Victim app:** Next.js on `http://localhost:3000`
- **Attacker origin:** a small static Node server on `http://localhost:3001`
- **Sign-in prerequisite:** the lab first verifies `satwik@demo.test` with `demo-pass-2026`, then issues an HTTP-only local session cookie.
- **Vulnerable behavior:** `GET /api/account/recovery-email?email=...` immediately changes the signed-in account's recovery email.
- **Exact exploit:** the attacker page injects an image using that URL. The image request can cross origins without CORS permission, and the browser sends the already-established local session cookie.
- **Implemented mitigation:** in Secured mode, the same GET is rejected with `401 Fresh re-authentication required`; no state changes. A user must enter `demo-pass-2026` and explicitly confirm a short-lived, protected update.

## Run locally

Install dependencies once:

```bash
npm install
```

Use two terminals in this folder:

```bash
# terminal 1, victim application
npm run dev
```

```bash
# terminal 2, attacker origin
npm run attacker
```

Then open `http://localhost:3000`, sign in with the visible local demo credentials, and open the attacker origin from the lab UI. Keep both servers running for the recording.

### Local demo credentials

| Field | Value |
| --- | --- |
| Email | `satwik@demo.test` |
| Password | `demo-pass-2026` |

The session cookie is issued only after these credentials are accepted. A failed sign-in does not create a session cookie or expose the account dashboard.

## The vulnerable code path

The vulnerable endpoint is [`app/api/account/recovery-email/route.ts`](app/api/account/recovery-email/route.ts). In Vulnerable mode it accepts a state-changing operation through a GET URL:

```text
GET /api/account/recovery-email?email=intruder%40malicious.test
```

The attacker page's payload is:

```html
<img src="http://localhost:3000/api/account/recovery-email?email=intruder%40malicious.test" alt="">
```

The request works after sign-in because the browser has an authenticated cookie for `localhost`. Port `3001` is a different **origin** from port `3000`, while the host-only local cookie is still sent to `localhost:3000` with the image request.

## Why the recovery email is security-sensitive

A recovery email is an account-recovery channel. Password-reset links and ownership-recovery instructions can be delivered there. If an attacker changes it to an address they control, they may receive the next password-reset link, set a new password, and lock the real account holder out. The signed-in lab dashboard highlights this password-reset takeover consequence after the vulnerable forged GET succeeds.

## How to recognize CSRF Variant 1 before exploiting it

1. Find an authenticated, **state-changing** endpoint, such as a recovery-email update.
2. Observe that it accepts a **GET** request with a URL parameter, rather than requiring a deliberate confirmation.
3. Notice that the server relies on the browser's ambient authenticated session and asks for no fresh proof of user intent.
4. Confirm the URL can be embedded by another origin as an image, navigation, or link.

That combination is **CSRF Variant 1: GET-based forged action**. The exploit does not need to read the victim response. It only needs the browser to send a valid authenticated request that changes state.

## Root cause

The vulnerable route treats a GET request accompanied by a valid session cookie as authorization to change a sensitive account field. A forged cross-origin request therefore gains the user's ambient session context without proving that the user intended that email change.

## Implemented mitigation: fresh re-authentication

Secured mode blocks the forged GET and records a `401` result. The only route that changes the recovery email is the protected POST confirmation route, and it requires a short-lived re-authentication grant created after the user enters the current demo password.

This is useful for sensitive actions because a foreign page cannot know the user's password or silently complete the user's deliberate confirmation. The grant is consumed after one successful change and expires after two minutes.

The lab also uses a POST for the final confirmation. The mitigation demonstrated and discussed in the video is **re-authentication**; POST is the normal request shape used to carry that deliberate protected action.

## Other CSRF mitigations to explain in the viva

- **Synchronizer anti-CSRF tokens:** the server renders an unpredictable token in a legitimate page or form and validates it on submission. A foreign site cannot read that token because of the same-origin policy, so it cannot construct an accepted forged request.
- **SameSite cookies:** `SameSite=Lax` or `SameSite=Strict` reduces when browsers attach cookies to cross-site requests. This is valuable defense in depth, but it should not be the only defense for sensitive state changes. Local ports in this lab are different origins but remain the same `localhost` site, which keeps the exploit repeatable on one machine.
- **Avoid state-changing GET requests:** GET is intended for safe retrieval. Moving mutations to a deliberate unsafe method and validating intent prevents an embedded URL from performing an account update.

## Demo controls and expected results

| Mode | Forged GET from `localhost:3001` | Recovery email |
| --- | --- | --- |
| Vulnerable | `200` and mutation | Changes to `intruder@malicious.test` |
| Secured | `401` re-authentication required | Remains unchanged |

Use **Sign out & reset** before each clean recording take. It clears the session, restores `satwik.recovery@demo.test`, switches the deployment back to Vulnerable mode, and returns to the sign-in screen.

## Verification

```bash
npm test
npm run build
```

`tests/lab.test.ts` checks deterministic state behavior. The manual browser evidence checklist and narration are in [`DEMO_SCRIPT.md`](DEMO_SCRIPT.md).

## Ownership declaration

| Member name | Roll number | Category | Variant implemented |
| --- | --- | --- | --- |
| **[Fill before submission]** | **[Fill before submission]** | Cross-Site Request Forgery (CSRF) | Variant 1: GET-based forged action |

## Project layout

```text
app/                 Next.js victim application and route handlers
attacker/            Separate local attacker-origin page and server
lib/lab.ts           Deterministic in-memory lab state
tests/               State-level automated checks
```
