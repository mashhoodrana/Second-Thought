import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/layout/Logo";
import { LoginForm } from "@/components/auth/LoginForm";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to your Second Thought account.",
};

export default function LoginPage() {
  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-background px-6 py-16 select-none">
      <div className="w-full max-w-sm space-y-6">
        {/* Logo */}
        <div className="flex flex-col items-center space-y-3">
          <Logo size="xl" className="shadow-sm" />
          <div className="text-center space-y-1">
            <h1 className="text-xl font-bold tracking-tight text-foreground">Welcome back</h1>
            <p className="text-xs text-muted">
              Sign in to continue your investigations
            </p>
          </div>
        </div>

        {/* Form Card */}
        <div className="rounded-2xl border border-border-default bg-surface-card p-6 shadow-sm">
          <LoginForm />
        </div>

        <p className="text-center text-xs text-muted">
          New here?{" "}
          <Link
            href="/register"
            className="font-bold text-brand-primary hover:text-brand-hover transition-colors"
          >
            Create an account free
          </Link>
        </p>
      </div>
    </div>
  );
}
