import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "國民教育委員會｜世界旅遊委員會",
  description: "國民教育委員會世界旅遊委員會：從小一開始，挑戰世界地理與旅行知識。",
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
