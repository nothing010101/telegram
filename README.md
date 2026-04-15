# Telegram Curhat Starter

Starter monorepo untuk:

- **Vercel**: dashboard admin + login sederhana
- **Railway**: worker 24/7 yang kirim phrase acak ke target Telegram
- **Postgres**: simpan config, target, phrase list, dan logs

## Fitur

- login admin pakai password tunggal
- target Telegram **bisa diganti dari dashboard**
- list phrase bisa diedit dari dashboard
- kirim mode:
  - `random` → pilih phrase acak
  - `sequential` → kirim berurutan
- bisa `start/stop`
- minimum interval 60 detik
- recent chat discovery via `getUpdates`
- log sukses/gagal

## Penting

Project ini dirancang untuk **akun/bot milik sendiri atau target yang sudah consent**.  
Untuk target user biasa, bot Telegram **harus sudah pernah di-start** dulu.

## Struktur

```bash
apps/
  web/      # Next.js dashboard (deploy ke Vercel)
  worker/   # Node worker (deploy ke Railway)
prisma/
  schema.prisma
```

## 1) Buat bot Telegram

1. Chat ke **BotFather**
2. Buat bot baru
3. Ambil `BOT_TOKEN`

## 2) Ambil `chat_id` target

Cara termudah:
1. Start bot dari akun Telegram target
2. Kirim pesan apa saja ke bot
3. Buka dashboard
4. Klik refresh recent chats
5. Pilih `chat_id` yang muncul

Alternatif manual:
- panggil `getUpdates` ke Bot API

## 3) Setup database

Pakai Postgres apa saja yang support connection string, misalnya:
- Railway Postgres
- Neon
- Supabase

Lalu set `DATABASE_URL`.

## 4) Environment variables

### Root / shared

Tidak wajib, tapi semua app membaca `DATABASE_URL`.

### apps/web/.env.local

```env
DATABASE_URL="postgresql://..."
BOT_TOKEN="123456:telegram-bot-token"
ADMIN_PASSWORD="ganti-password-ini"
JWT_SECRET="ganti-jadi-random-panjang"
APP_URL="http://localhost:3000"
```

### apps/worker/.env

```env
DATABASE_URL="postgresql://..."
BOT_TOKEN="123456:telegram-bot-token"
WORKER_POLL_MS="5000"
```

## 5) Install & migrate

Di root:

```bash
npm install
npx prisma migrate dev --name init
```

Untuk production:
```bash
npm run prisma:migrate
```

## 6) Jalan lokal

Terminal 1:
```bash
npm run dev:web
```

Terminal 2:
```bash
npm run dev:worker
```

## 7) Deploy

### Vercel
- Root directory: **repo root**
- Framework: Next.js
- Build command:
  ```bash
  npm install && npm run build:web
  ```
- Output directory: default Next.js
- Tambahkan env:
  - `DATABASE_URL`
  - `BOT_TOKEN`
  - `ADMIN_PASSWORD`
  - `JWT_SECRET`
  - `APP_URL`

### Railway
- Root directory: **repo root**
- Start command:
  ```bash
  npm install && npm run prisma:migrate && npm run build:worker && npm run start --workspace worker
  ```
- Tambahkan env:
  - `DATABASE_URL`
  - `BOT_TOKEN`
  - `WORKER_POLL_MS`

## 8) Flow pakai

1. Login ke dashboard
2. Refresh recent chats
3. Pilih / isi `targetChatId`
4. Isi interval, mode, phrase list
5. Klik **Save Config**
6. Klik **Start**
7. Worker Railway akan kirim sesuai setting

## Default phrase examples

Sudah ada seed phrase campuran Indo-English. Bisa ganti total dari dashboard.

## Catatan teknis

- Worker hanya memproses **1 config global** untuk starter ini.
- Target **bisa diganti kapan saja** dari dashboard.
- Untuk multi target / multi project, tinggal ubah schema dari 1 config → banyak campaign.

## Upgrade berikutnya yang mudah ditambah

- banyak campaign
- jadwal jam aktif
- AI rewrite phrase
- analytics sederhana
- webhook Telegram
- export logs
