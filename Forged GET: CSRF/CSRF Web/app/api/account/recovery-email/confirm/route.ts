import { cookies } from "next/headers";
import {
  DEMO_SESSION_COOKIE,
  DEMO_SESSION_VALUE,
  REAUTH_COOKIE,
  REAUTH_TTL_MS,
  recordSecureUpdate,
  validDemoEmail,
} from "@/lib/lab";

export async function POST(request: Request) {
  const jar = await cookies();
  if (jar.get(DEMO_SESSION_COOKIE)?.value !== DEMO_SESSION_VALUE) {
    return Response.json({ error: "Start a demo session first." }, { status: 401 });
  }

  const reauthAt = Number(jar.get(REAUTH_COOKIE)?.value ?? 0);
  if (!Number.isFinite(reauthAt) || Date.now() - reauthAt >= REAUTH_TTL_MS) {
    return Response.json({ error: "Fresh re-authentication is required." }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as { email?: unknown } | null;
  if (!validDemoEmail(body?.email)) {
    return Response.json({ error: "Enter a valid recovery email." }, { status: 400 });
  }

  recordSecureUpdate(body.email);
  jar.delete(REAUTH_COOKIE);
  return Response.json({ ok: true });
}
