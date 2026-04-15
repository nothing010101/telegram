import { NextResponse } from "next/server";
import { isAuthenticated } from "../../../lib/auth";

type TelegramUpdate = {
  update_id: number;
  message?: {
    chat?: {
      id?: number | string;
      type?: string;
      title?: string;
      username?: string;
      first_name?: string;
      last_name?: string;
    };
    text?: string;
  };
};

export async function GET() {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const token = process.env.BOT_TOKEN;
  if (!token) {
    return NextResponse.json({ error: "BOT_TOKEN belum diset." }, { status: 500 });
  }

  const url = `https://api.telegram.org/bot${token}/getUpdates?limit=20&timeout=1`;
  const res = await fetch(url, { cache: "no-store" });
  const data = await res.json();

  if (!data.ok) {
    return NextResponse.json({ error: data.description || "Gagal ambil updates." }, { status: 400 });
  }

  const map = new Map<string, { chatId: string; label: string; type: string; lastText?: string }>();

  for (const update of (data.result || []) as TelegramUpdate[]) {
    const chat = update.message?.chat;
    if (!chat?.id) continue;

    const chatId = String(chat.id);
    const label =
      chat.username
        ? `@${chat.username}`
        : [chat.first_name, chat.last_name].filter(Boolean).join(" ") || chat.title || chatId;

    map.set(chatId, {
      chatId,
      label,
      type: chat.type || "unknown",
      lastText: update.message?.text
    });
  }

  return NextResponse.json({ chats: Array.from(map.values()) });
}
