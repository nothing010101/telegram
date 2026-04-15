import Dashboard from "@/components/Dashboard";
import LoginForm from "@/components/LoginForm";
import { isAuthenticated } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { seedPhrases } from "@/lib/seed-phrases";

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

export default async function HomePage() {
  const authed = await isAuthenticated();

  if (!authed) {
    return <LoginForm />;
  }

  const config = await ensureConfig();

  return (
    <Dashboard
      initial={{
        id: config.id,
        isEnabled: config.isEnabled,
        mode: config.mode,
        intervalSeconds: config.intervalSeconds,
        targetChatId: config.targetChatId,
        lastSentAt: config.lastSentAt?.toISOString() ?? null,
        nextRunAt: config.nextRunAt?.toISOString() ?? null,
        phrasesText: config.phrases.map((p) => p.text).join("\n"),
        logs: config.logs.map((log) => ({
          id: log.id,
          message: log.message,
          status: log.status,
          error: log.error,
          sentAt: log.sentAt.toISOString()
        }))
      }}
    />
  );
}
