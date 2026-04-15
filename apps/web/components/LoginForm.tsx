"use client";

import { useState } from "react";

export default function LoginForm() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password })
    });

    const data = await res.json();

    if (!res.ok) {
      setError(data.error || "Login gagal.");
      setLoading(false);
      return;
    }

    window.location.reload();
  }

  return (
    <div className="container" style={{ maxWidth: 480, paddingTop: 80 }}>
      <div className="card">
        <h1>Login Admin</h1>
        <p className="small">Masuk untuk atur target, phrase, interval, dan status worker.</p>
        <form onSubmit={onSubmit} className="grid">
          <div>
            <label>Password</label>
            <input
              type="password"
              placeholder="ADMIN_PASSWORD"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          {error ? <p style={{ color: "#fca5a5" }}>{error}</p> : null}
          <button className="primary" disabled={loading}>
            {loading ? "Loading..." : "Masuk"}
          </button>
        </form>
      </div>
    </div>
  );
}
