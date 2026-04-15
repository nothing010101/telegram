import { NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";
import { isAuthenticated } from "../../../lib/auth";
import { z } from "zod";

const bodySchema = z.object({
  action: z.enum(["start", "stop"])
});

export async function POST(req: Request) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Action tidak valid." }, { status: 400 });
  }

  const action = parsed.data.action;

  const updated = await prisma.botConfig.upsert({
    where: { id: 1 },
    update: {
      isEnabled: action === "start",
      nextRunAt: new Date()
    },
    create: {
      id: 1,
      isEnabled: action === "start",
      nextRunAt: new Date()
    }
  });

  return NextResponse.json({ ok: true, config: updated });
}
