import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Telegram Curhat Dashboard",
  description: "Dashboard untuk atur phrase dan target Telegram bot."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
