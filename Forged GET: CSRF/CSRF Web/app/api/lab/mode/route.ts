import { setMode, type LabMode } from "@/lib/lab";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { mode?: unknown } | null;
  if (body?.mode !== "vulnerable" && body?.mode !== "secured") {
    return Response.json({ error: "mode must be vulnerable or secured" }, { status: 400 });
  }
  setMode(body.mode as LabMode);
  return Response.json({ ok: true });
}
