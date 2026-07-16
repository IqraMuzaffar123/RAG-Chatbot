import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AppShell } from "@/components/layout/AppShell";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AskDocs - Enterprise RAG Knowledge Base",
  description:
    "AI-powered document intelligence with hybrid search, cross-encoder re-ranking, and cited answers.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} dark h-full antialiased`}
    >
      <body
        className="min-h-full text-slate-100"
        style={{
          background:
            "radial-gradient(1200px 700px at 78% -10%, rgba(16,185,129,0.10), transparent 55%), radial-gradient(1000px 600px at 10% 110%, rgba(6,182,212,0.08), transparent 55%), linear-gradient(160deg, #06080d 0%, #0a0f1a 100%)",
        }}
      >
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
