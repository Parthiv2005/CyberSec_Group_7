import { cookies } from "next/headers";
import {
  appendEvent,
  DEMO_SESSION_COOKIE,
  DEMO_SESSION_VALUE,
  labState,
  recordBlockedGet,
  updateRecoveryEmail,
  validDemoEmail,
} from "@/lib/lab";

export async function GET(request: Request) {
  const email = new URL(request.url).searchParams.get("email");
  const jar = await cookies();

  if (jar.get(DEMO_SESSION_COOKIE)?.value !== DEMO_SESSION_VALUE) {
    appendEvent("neutral", "Unauthenticated GET ignored", "A recovery-email GET arrived without the demo session cookie.");
    return new Response("No active local demo session.", { status: 401 });
  }

  if (!validDemoEmail(email)) {
    return new Response("A valid email parameter is required.", { status: 400 });
  }

  if (labState().mode === "vulnerable") {
    updateRecoveryEmail(email, "Cross-origin GET request");
    return new Response("VULNERABLE: recovery email changed by GET.", {
      status: 200,
      headers: { "X-Lab-Outcome": "mutated-by-get" },
    });
  }

  recordBlockedGet(email);
  return new Response("BLOCKED: fresh re-authentication required. No account change was made.", {
    status: 401,
    headers: { "X-Lab-Outcome": "reauthentication-required" },
  });
}
