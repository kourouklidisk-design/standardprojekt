import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AppForge – AI App Builder",
  description: "Erstelle Homepages, Spiele und Web-Apps per Prompt – kostenlos, direkt im Browser.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de">
      <body>{children}</body>
    </html>
  );
}