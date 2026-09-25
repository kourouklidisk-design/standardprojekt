import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI-Coder – Homepages, Spiele & Web-Apps per Prompt",
  description:
    "Erstelle Homepages, Spiele und Web-Apps per Prompt – kostenlos, direkt im Browser, ganz ohne Server oder API-Key.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de">
      <body>{children}</body>
    </html>
  );
}