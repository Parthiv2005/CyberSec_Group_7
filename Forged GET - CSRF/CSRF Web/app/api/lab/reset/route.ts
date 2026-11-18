import { cookies } from "next/headers";
import { DEMO_SESSION_COOKIE, REAUTH_COOKIE, resetLab } from "@/lib/lab";

export async function POST() {
  const jar = await cookies();
  jar.delete(DEMO_SESSION_COOKIE);
  jar.delete(REAUTH_COOKIE);
  resetLab();
  return Response.json({ ok: true });
}
