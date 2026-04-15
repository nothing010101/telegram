"use client";

import { useMemo, useState } from "react";

type Chat = {
  chatId: string;
  label: string;
  type: string;
  lastText?: string;
};

type Log = {
  id: number;
  message: string;
  status: "SUCCESS" | "FAILED";
  error?: string | null;
  sentAt: string;
};

type ConfigResponse = {
  id: number;
  isEnabled: boolean;
  mode: "RANDOM" | "SEQUENTIAL";
  intervalSeconds: number;
  targetChatId?: string | null;
  lastSentAt?: string | null;
  nextRunAt?: string | null;
  phrasesText: string;
  logs: Log[];
};

export default function Dashboard({ initial }: { initial: ConfigResponse }) {
  const [targetChatId, setTargetChatId] = useState(initial.targetChatId || "");
  const [intervalSeconds, setIntervalSeconds] = useState(initial.intervalSeconds || 300);
  const [mode, setMode] = useState<"RANDOM" | "SEQUENTIAL">(initial.mode || "RANDOM");
  const [phrasesText, setPhrasesText] = useState(initial.phrasesText || "");
  const [isEnabled, setIsEnabled] = useState(initial.isEnabled || false);
  const [logs, setLogs] = useState<Log[]>(initial.logs || []);
  const [recentChats, setRecentChats] = useState<Chat[]>([]);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  const phraseCount = useMemo(
    () =>
      phrasesText
        .split("\n")
        .map((x) => x.trim())
        .filter(Boolean).length,
    [phrasesText]
  );

  async function saveConfig() {
    setSaving(true);
    setMessage("");

    const res = await fetch("/api/config", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetChatId, intervalSeconds, mode, phrasesText })
    });

    const data = await res.json();
    setSaving(false);

    if (!res.ok) {
      setMessage(data.error || "Gagal simpan config.");
      return;
    }

    setMessage("Config tersimpan.");
  }

  async function control(action: "start" | "stop") {
    const res = await fetch("/api/control", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action })
    });
    const data = await res.json();

    if (!res.ok) {
      setMessage(data.error || "Gagal ubah status.");
      return;
    }

    setIsEnabled(action === "start");
    setMessage(action === "start" ? "Worker diaktifkan." : "Worker dihentikan.");
  }

  async function loadRecentChats() {
    setMessage("Mengambil recent chats...");
    const res = await fetch("/api/recent-chats");
    const data = await res.json();

    if (!res.ok) {
      setMessage(data.error || "Gagal ambil recent chats.");
      return;
    }

    setRecentChats(data.chats || []);
    setMessage("Recent chats diperbarui.");
  }

  async function refreshConfig() {
    const res = await fetch("/api/config");
    const data = await res.json();

    if (!res.ok) return;
    setLogs(data.logs || []);
    setIsEnabled(Boolean(data.isEnabled));
  }

  async function logout() {
    await fetch("/api/logout", { method: "POST" });
    window.location.reload();
  }

  return (
    <div className="container">
      <div className="actions" style={{ marginBottom: 16 }}>
        <div className="badge">{isEnabled ? "Status: RUNNING" : "Status: STOPPED"}</div>
        <div className="badge">Phrases: {phraseCount}</div>
        <div className="badge">Mode: {mode}</div>
      </div>

      <div className="grid grid-2">
        <div className="card">
          <h2>Config</h2>
          <p className="small">
            Target bisa diganti kapan saja. Untuk target bot/user, pastikan akun target sudah
            pernah start bot ini.
          </p>

          <div className="grid">
            <div>
              <label>Target chat id</label>
              <input
                value={targetChatId}
                onChange={(e) => setTargetChatId(e.target.value)}
                placeholder="contoh: 123456789 atau -100xxxxxxxxxx"
              />
              <p className="small">
                Tips: klik <span className="code">Refresh recent chats</span> lalu copy chat id.
              </p>
            </div>

            <div>
              <label>Interval (detik, minimal 60)</label>
              <input
                type="number"
                min={60}
                value={intervalSeconds}
                onChange={(e) => setIntervalSeconds(Number(e.target.value))}
              />
            </div>

            <div>
              <label>Mode</label>
              <select value={mode} onChange={(e) => setMode(e.target.value as "RANDOM" | "SEQUENTIAL")}>
                <option value="RANDOM">RANDOM</option>
                <option value="SEQUENTIAL">SEQUENTIAL</option>
              </select>
            </div>

            <div className="actions">
              <button className="primary" onClick={saveConfig} disabled={saving}>
                {saving ? "Saving..." : "Save Config"}
              </button>
              <button className="secondary" onClick={() => control("start")}>
                Start
              </button>
              <button className="danger" onClick={() => control("stop")}>
                Stop
              </button>
            </div>

            <div className="actions">
              <button className="secondary" onClick={loadRecentChats}>
                Refresh recent chats
              </button>
              <button className="secondary" onClick={refreshConfig}>
                Refresh logs
              </button>
              <button className="secondary" onClick={logout}>
                Logout
              </button>
            </div>

            {message ? <p className="small">{message}</p> : null}
          </div>
        </div>

        <div className="card">
          <h2>Recent chats</h2>
          <p className="small">Pilih salah satu untuk isi target lebih cepat.</p>

          {recentChats.length === 0 ? (
            <p className="small">Belum ada data. Klik refresh recent chats.</p>
          ) : (
            <div className="grid">
              {recentChats.map((chat) => (
                <button
                  key={chat.chatId}
                  className="secondary"
                  onClick={() => setTargetChatId(chat.chatId)}
                  style={{ textAlign: "left" }}
                >
                  <div><strong>{chat.label}</strong></div>
                  <div className="small code">{chat.chatId}</div>
                  <div className="small">{chat.type}</div>
                  {chat.lastText ? <div className="small">last: {chat.lastText}</div> : null}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div style={{ height: 16 }} />

      <div className="grid grid-2">
        <div className="card">
          <h2>Phrase list</h2>
          <p className="small">Satu baris = satu phrase.</p>
          <textarea value={phrasesText} onChange={(e) => setPhrasesText(e.target.value)} />
        </div>

        <div className="card">
          <h2>Send logs</h2>
          {logs.length === 0 ? (
            <p className="small">Belum ada log.</p>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Waktu</th>
                  <th>Status</th>
                  <th>Message</th>
                  <th>Error</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id}>
                    <td>{new Date(log.sentAt).toLocaleString()}</td>
                    <td>{log.status}</td>
                    <td>{log.message}</td>
                    <td>{log.error || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
