import { PrismaClient, SendMode, SendStatus } from "@prisma/client";

const prisma = new PrismaClient();
const BOT_TOKEN = process.env.BOT_TOKEN;
const WORKER_POLL_MS = Number(process.env.WORKER_POLL_MS || 5000);

if (!BOT_TOKEN) {
  throw new Error("BOT_TOKEN is missing");
}

function telegramUrl(method: string) {
  return `https://api.telegram.org/bot${BOT_TOKEN}/${method}`;
}

async function sendTelegramMessage(chatId: string, text: string) {
  const res = await fetch(telegramUrl("sendMessage"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text
    })
  });

  const data = await res.json();

  if (!data.ok) {
    throw new Error(data.description || "Telegram API error");
  }

  return data.result?.message_id as number | undefined;
}

function pickRandom<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

async function tick() {
  const config = await prisma.botConfig.findUnique({
    where: { id: 1 },
    include: {
      phrases: {
        where: { isActive: true },
        orderBy: { sortOrder: "asc" }
      }
    }
  });

  if (!config || !config.isEnabled) return;
  if (!config.targetChatId) return;
  if (config.phrases.length === 0) return;

  const now = new Date();
  if (config.nextRunAt && config.nextRunAt > now) return;

  let selectedPhrase = "";

  if (config.mode === SendMode.RANDOM) {
    selectedPhrase = pickRandom(config.phrases).text;
  } else {
    const index = config.sequentialIndex % config.phrases.length;
    selectedPhrase = config.phrases[index].text;
  }

  try {
    const telegramMessageId = await sendTelegramMessage(config.targetChatId, selectedPhrase);

    await prisma.$transaction([
      prisma.sendLog.create({
        data: {
          configId: 1,
          message: selectedPhrase,
          status: SendStatus.SUCCESS,
          telegramMessageId
        }
      }),
      prisma.botConfig.update({
        where: { id: 1 },
        data: {
          lastSentAt: now,
          nextRunAt: new Date(now.getTime() + config.intervalSeconds * 1000),
          sequentialIndex:
            config.mode === SendMode.SEQUENTIAL ? config.sequentialIndex + 1 : config.sequentialIndex
        }
      })
    ]);

    console.log(`[SUCCESS] ${now.toISOString()} -> ${selectedPhrase}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";

    await prisma.$transaction([
      prisma.sendLog.create({
        data: {
          configId: 1,
          message: selectedPhrase,
          status: SendStatus.FAILED,
          error: message
        }
      }),
      prisma.botConfig.update({
        where: { id: 1 },
        data: {
          nextRunAt: new Date(now.getTime() + config.intervalSeconds * 1000)
        }
      })
    ]);

    console.error(`[FAILED] ${now.toISOString()} -> ${message}`);
  }
}

async function bootstrap() {
  console.log("Worker started.");
  console.log(`Polling every ${WORKER_POLL_MS}ms`);

  setInterval(async () => {
    try {
      await tick();
    } catch (error) {
      console.error("Worker tick error:", error);
    }
  }, WORKER_POLL_MS);
}

bootstrap().catch((error) => {
  console.error("Fatal bootstrap error:", error);
  process.exit(1);
});
