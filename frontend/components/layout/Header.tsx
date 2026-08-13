"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogOut, Menu, X } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Logo } from "./Logo";

export function Header() {
  const { user, signOut, loading } = useAuth();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    router.push("/");
    router.refresh();
  };

  return (
    <header className="sticky top-0 z-50 border-b border-border-default bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        {/* Logo */}
        <Link href="/" className="group flex items-center gap-2.5">
          <Logo size="lg" className="transition-transform group-hover:scale-105" />
          <span className="text-foreground font-bold tracking-tight text-sm md:text-base">
            Second Thought
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-6 md:flex">
          <Link
            href="/#how-it-works"
            className="text-xs font-semibold text-muted hover:text-foreground transition-colors"
          >
            How it works
          </Link>


          {!loading && user ? (
            <>
              <Link
                href="/investigate"
                className="text-xs font-semibold text-brand-primary hover:text-brand-hover transition-colors"
              >
                Go to workspace
              </Link>
              <button
                onClick={handleSignOut}
                className="flex items-center gap-1.5 rounded-lg border border-border-default bg-surface-card px-3 py-1.5 text-xs font-semibold text-muted hover:text-foreground hover:bg-surface-soft transition-all cursor-pointer"
              >
                <LogOut className="h-3.5 w-3.5" />
                Sign out
              </button>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="text-xs font-semibold text-muted hover:text-foreground transition-colors"
              >
                Sign in
              </Link>
              <Link
                href="/register"
                className="rounded-xl bg-brand-primary hover:bg-brand-hover px-4 py-2 text-xs font-bold text-white shadow-sm transition-all"
              >
                Try Second Thought
              </Link>
            </>
          )}
        </nav>

        {/* Mobile menu button */}
        <button
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-border-default bg-surface-card text-muted hover:text-foreground hover:bg-surface-soft md:hidden cursor-pointer"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle menu"
        >
          {menuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
        </button>
      </div>

      {/* Mobile nav */}
      {menuOpen && (
        <div className="border-t border-border-default px-6 pb-6 pt-3 md:hidden space-y-4 bg-background">
          <div className="flex flex-col gap-3">
            <Link
              href="/#how-it-works"
              className="text-xs font-semibold text-muted"
              onClick={() => setMenuOpen(false)}
            >
              How it works
            </Link>

          </div>

          <div className="border-t border-border-default/50 pt-3">
            {!loading && user ? (
              <div className="flex flex-col gap-3">
                <Link
                  href="/investigate"
                  className="text-xs font-bold text-brand-primary"
                  onClick={() => setMenuOpen(false)}
                >
                  Go to workspace
                </Link>
                <button
                  onClick={() => { handleSignOut(); setMenuOpen(false); }}
                  className="text-left text-xs font-semibold text-muted"
                >
                  Sign out
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                <Link href="/login" className="text-xs font-semibold text-muted" onClick={() => setMenuOpen(false)}>
                  Sign in
                </Link>
                <Link href="/register" className="text-xs font-bold text-brand-primary" onClick={() => setMenuOpen(false)}>
                  Get started
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
