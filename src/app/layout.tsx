import type { Metadata } from "next";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "OAuth App Readiness",
  description: "How long it takes to get a provider OAuth app approved, what blocks it, and what to do next.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased`}>
        <header className="border-b border-zinc-200 bg-white/80 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/80">
          <nav className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
            <Link href="/" className="flex items-center gap-2 font-semibold">
              <span className="grid h-6 w-6 place-items-center rounded-md bg-zinc-900 text-[11px] text-white dark:bg-white dark:text-zinc-900">OA</span>
              OAuth App Readiness
            </Link>
            <div className="flex gap-4 text-sm muted">
              <Link href="/#library" className="hover:text-zinc-900 dark:hover:text-white">Library</Link>
              <Link href="/method" className="hover:text-zinc-900 dark:hover:text-white">How it works</Link>
            </div>
          </nav>
        </header>
        <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
      </body>
    </html>
  );
}
