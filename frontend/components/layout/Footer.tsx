import Link from "next/link";
import { Logo } from "./Logo";

export function Footer() {
  return (
    <footer className="border-t border-border-default bg-background py-10 select-none">
      <div className="mx-auto max-w-6xl px-6">
        <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
          <div className="flex items-center gap-2">
            <Logo size="sm" />
            <span className="text-xs font-bold text-foreground">Second Thought</span>
          </div>

          <p className="text-center text-xs text-muted">
            Second Thought · Media &amp; Information Literacy workbook
          </p>

          <div className="flex items-center gap-4 text-xs text-muted">
            <Link href="https://github.com/mashhoodrana/Second-Thought" className="transition-colors hover:text-foreground" target="_blank" rel="noopener noreferrer">
              GitHub
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
