import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Decision Log",
  description: "Track predictions, resolve outcomes, and calibrate over time.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <header className="sticky top-0 z-10 border-b border-border bg-surface/85 backdrop-blur">
          <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-3">
            <Link href="/" className="group flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent text-[13px] font-bold text-white shadow-sm">
                ◎
              </span>
              <span className="text-[15px] font-semibold tracking-tight text-ink">
                Decision Log
              </span>
            </Link>
            <nav className="flex items-center gap-1 text-sm">
              <Link
                href="/"
                className="rounded-lg px-3 py-1.5 font-medium text-muted transition-colors hover:bg-surface-muted hover:text-ink"
              >
                Dashboard
              </Link>
              <Link
                href="/practice"
                className="rounded-lg px-3 py-1.5 font-medium text-muted transition-colors hover:bg-surface-muted hover:text-ink"
              >
                Practice
              </Link>
              <Link
                href="/new"
                className="rounded-lg bg-accent px-3.5 py-1.5 font-medium text-white shadow-sm transition-colors hover:bg-accent-hover"
              >
                New prediction
              </Link>
            </nav>
          </div>
        </header>
        <main className="mx-auto w-full max-w-5xl flex-1 px-5 py-8">
          {children}
        </main>
        <footer className="border-t border-border py-5 text-center text-xs text-faint">
          Log it before you know · resolve it honestly · calibrate over time
        </footer>
      </body>
    </html>
  );
}
