import type { Metadata } from "next";
import Link from "next/link";
import { Geist, Geist_Mono, Instrument_Serif } from "next/font/google";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
const instrumentSerif = Instrument_Serif({ variable: "--font-instrument-serif", subsets: ["latin"], weight: "400", style: ["normal", "italic"] });

export const metadata: Metadata = {
  title: "OAuth Setup Guides",
  description: "How long it takes to get a provider OAuth app approved, what blocks it, and what to do next.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="dark">
      <body className={`${geistSans.variable} ${geistMono.variable} ${instrumentSerif.variable} relative min-h-screen font-sans antialiased`}>
        {/* Ambient background: grid plus drifting glows, behind everything. */}
        <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[640px] overflow-hidden print:hidden">
          <div className="grid-bg absolute inset-0" />
          <div className="orb orb-blue left-[8%] top-[-120px] h-[340px] w-[340px]" />
          <div className="orb orb-cyan right-[10%] top-[-60px] h-[300px] w-[300px]" />
          <div className="orb orb-violet left-[45%] top-[120px] h-[260px] w-[260px]" />
        </div>

        <header className="sticky top-0 z-20 print:hidden border-b border-[var(--border)]/70 bg-[var(--bg)]/70 backdrop-blur-md">
          <nav className="mx-auto flex max-w-5xl items-center justify-between px-5 py-3.5">
            <Link href="/" className="flex items-center gap-2.5 text-[15px] font-semibold tracking-tight">
              <span className="grid h-7 w-7 place-items-center rounded-lg bg-gradient-to-br from-[var(--brand)] to-[var(--cyan)] font-mono text-[11px] font-bold text-[#06121f] shadow-[0_0_20px_-4px_var(--brand)]">
                OA
              </span>
              OAuth Setup Guides
            </Link>
            <Link href="/#guides" className="text-sm muted transition hover:text-white">
              Guides
            </Link>
          </nav>
        </header>

        <main className="mx-auto max-w-5xl px-5 py-10 sm:py-14 print:max-w-none print:p-0">{children}</main>

        <footer className="mx-auto max-w-5xl px-5 pb-10 pt-6 text-xs muted print:hidden">
          Guides are researched by an agent from each provider&rsquo;s own docs. Every claim links to its source.
        </footer>
      </body>
    </html>
  );
}
