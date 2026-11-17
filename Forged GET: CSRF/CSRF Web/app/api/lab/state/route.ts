import { cookies } from "next/headers";
import { DEMO_SESSION_COOKIE, DEMO_SESSION_VALUE, labState, REAUTH_COOKIE, REAUTH_TTL_MS } from "@/lib/lab";

export async function GET() {
  const jar = await cookies();
  const reauthAt = Number(jar.get(REAUTH_COOKIE)?.value ?? 0);
  const hasReauth = Number.isFinite(reauthAt) && Date.now() - reauthAt < REAUTH_TTL_MS;
  const state = labState();

  return Response.json({
    mode: state.mode,
    recoveryEmail: state.recoveryEmail,
    events: state.events,
    hasSession: jar.get(DEMO_SESSION_COOKIE)?.value === DEMO_SESSION_VALUE,
    hasReauth,
    reauthRemainingSeconds: hasReauth ? Math.ceil((REAUTH_TTL_MS - (Date.now() - reauthAt)) / 1000) : 0,
  });
}
