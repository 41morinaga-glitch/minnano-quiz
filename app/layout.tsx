import type { Metadata } from "next";
import { Geist_Mono } from "next/font/google";
import "./globals.css";

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "みんなのクイズ",
  description: "家族・友人と楽しめる手作りクイズアプリ",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" className={`${geistMono.variable} h-full`}>
      <body className="min-h-full flex flex-col bg-background">
        {children}
      </body>
    </html>
  );
}
