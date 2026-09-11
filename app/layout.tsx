import type { Metadata } from "next";
import { GAME_NAME, ORGANIZATION_NAME } from "../lib/brand";
import "./globals.css";

export const metadata: Metadata = {
  title: `${ORGANIZATION_NAME}｜${GAME_NAME}`,
  description: `${ORGANIZATION_NAME}${GAME_NAME}：從小一開始，挑戰世界地理與旅行知識。`,
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-Hant">
      <body className="antialiased">{children}</body>
    </html>
  );
}
