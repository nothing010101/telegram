import { NextResponse } from "next/server";
import { createSessionToken, setSessionCookie } from "@/lib/auth";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const password = body?.password;

  if (!process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ error: "ADMIN_PASSWORD belum diset." }, { status: 500 });
  }

  if (!password || password !== process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ error: "Password salah." }, { status: 401 });
  }

  const token = await createSessionToken();
  await setSessionCookie(token);

  return NextResponse.json({ ok: true });
}
