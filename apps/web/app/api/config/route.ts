import { NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";
import { isAuthenticated } from "../../../lib/auth";
import { seedPhrases } from "../../../lib/seed-phrases";
import { MIN_INTERVAL_SECONDS } from "../../../lib/config";
import { z } from "zod";

async function ensureConfig() {
  const existing = await prisma.botConfig.findUnique({
    where: { id: 1 },
    include: {
      phrases: {
        where: { isActive: true },
        orderBy: { sortOrder: "asc" }
      },
      logs: {
        orderBy: { sentAt: "desc" },
        take: 20
      }
    }
  });

  if (existing) return existing;

  return await prisma.botConfig.create({
    data: {
      id: 1,
      intervalSeconds: 300,
      nextRunAt: new Date(),
      phrases: {
        create: seedPhrases.map((text, index) => ({
          text,
          sortOrder: index
        }))
      }
    },
    include: {
      phrases: {
        where: { isActive: true },
        orderBy: { sortOrder: "asc" }
      },
      logs: {
        orderBy: { sentAt: "desc" },
        take: 20
      }
    }
  });
}

export async function GET() {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const config = await ensureConfig();
  return NextResponse.json({
    ...config,
    phrasesText: config.phrases.map((p) => p.text).join("\n")
  });
}

const bodySchema = z.object({
  targetChatId: z.string().trim().min(1, "targetChatId wajib diisi"),
  intervalSeconds: z.coerce.number().int().min(MIN_INTERVAL_SECONDS),
  mode: z.enum(["RANDOM", "SEQUENTIAL"]),
  phrasesText: z.string().min(1)
});

export async function POST(req: Request) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Payload tidak valid" },
      { status: 400 }
    );
  }

  const { targetChatId, intervalSeconds, mode, phrasesText } = parsed.data;
  const phrases = phrasesText
    .split("\n")
    .map((x) => x.trim())
    .filter(Boolean);

  if (phrases.length === 0) {
    return NextResponse.json({ error: "Phrase list kosong." }, { status: 400 });
  }

  await prisma.$transaction(async (tx) => {
    await tx.botConfig.upsert({
      where: { id: 1 },
      update: {
        targetChatId,
        intervalSeconds,
        mode,
        nextRunAt: new Date()
      },
      create: {
        id: 1,
        targetChatId,
        intervalSeconds,
        mode,
        nextRunAt: new Date()
      }
    });

    await tx.phrase.updateMany({
      where: { configId: 1 },
      data: { isActive: false }
    });

    await Promise.all(
      phrases.map((text, index) =>
        tx.phrase.create({
          data: {
            configId: 1,
            text,
            sortOrder: index,
            isActive: true
          }
        })
      )
    );
  });

  const config = await ensureConfig();
  return NextResponse.json({
    ok: true,
    config,
    phrasesText: config.phrases.map((p) => p.text).join("\n")
  });
}
