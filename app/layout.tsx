import type { Metadata } from "next";
import { GAME_NAME, ORGANIZATION_NAME } from "../lib/brand";
import "./globals.css";

export const metadata: Metadata = {
  title: `${ORGANIZATION_NAME}｜${GAME_NAME}`,
  description: `${ORGANIZATION_NAME}${GAME_NAME}：全年齡旅遊益智挑戰，看圖認景點、探索異國文化與旅行解謎。`,
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
