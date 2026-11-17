import { cookies } from "next/headers";
import {
  DEMO_SESSION_COOKIE,
  DEMO_SESSION_VALUE,
  hasValidDemoCredentials,
  recordSignIn,
} from "@/lib/lab";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { email?: unknown; password?: unknown } | null;
  if (!hasValidDemoCredentials(body?.email, body?.password)) {
    recordSignIn(false);
    return Response.json({ error: "Email or password did not match the local demo account." }, { status: 401 });
  }

  const jar = await cookies();
  jar.set(DEMO_SESSION_COOKIE, DEMO_SESSION_VALUE, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
  });
  recordSignIn(true);
  return Response.json({ ok: true });
}
