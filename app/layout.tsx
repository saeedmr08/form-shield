import type { Metadata } from "next";
import { Syne, Manrope } from "next/font/google";
import "./globals.css";

const display = Syne({ subsets: ["latin"], variable: "--font-syne" });
const body = Manrope({ subsets: ["latin"], variable: "--font-manrope" });

export const metadata: Metadata = {
  title: "FormShield",
  description: "Validation, honeypot, rate limit, and retention demo",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable}`}>
      <body style={{ fontFamily: "var(--font-manrope), var(--font-body)" }}>{children}</body>
    </html>
  );
}
