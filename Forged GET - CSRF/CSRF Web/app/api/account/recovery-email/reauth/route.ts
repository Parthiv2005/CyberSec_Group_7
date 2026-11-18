import { cookies } from "next/headers";
import {
  DEMO_PASSWORD,
  DEMO_SESSION_COOKIE,
  DEMO_SESSION_VALUE,
  REAUTH_COOKIE,
  recordReauthentication,
} from "@/lib/lab";

export async function POST(request: Request) {
  const jar = await cookies();
  if (jar.get(DEMO_SESSION_COOKIE)?.value !== DEMO_SESSION_VALUE) {
    return Response.json({ error: "Start a demo session first." }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as { password?: unknown } | null;
  if (body?.password !== DEMO_PASSWORD) {
    recordReauthentication(false);
    return Response.json({ error: "Password did not match. No change was made." }, { status: 401 });
  }

  jar.set(REAUTH_COOKIE, String(Date.now()), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 120,
  });
  recordReauthentication(true);
  return Response.json({ ok: true, expiresInSeconds: 120 });
}
