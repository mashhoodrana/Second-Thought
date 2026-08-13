"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export function LoginForm() {
  const router = useRouter();
  const supabase = createClient();
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (values: LoginFormValues) => {
    setServerError(null);

    const { error } = await supabase.auth.signInWithPassword({
      email: values.email,
      password: values.password,
    });

    if (error) {
      setServerError(
        error.message === "Invalid login credentials"
          ? "Invalid email or password"
          : error.message,
      );
      return;
    }

    router.push("/investigate");
    router.refresh();
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      {/* Email */}
      <div className="space-y-1">
        <label
          htmlFor="login-email"
          className="block text-xs font-semibold uppercase tracking-wider text-muted"
        >
          Email address
        </label>
        <input
          id="login-email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          className="w-full rounded-xl border border-border-default bg-[#FAF8F5] px-3.5 py-2 text-xs text-foreground placeholder-muted/40 outline-none transition-all focus:border-brand-primary focus:ring-1 focus:ring-brand-primary/20 disabled:opacity-50"
          {...register("email")}
        />
        {errors.email && (
          <p className="text-[10px] font-semibold text-signal-danger">{errors.email.message}</p>
        )}
      </div>

      {/* Password */}
      <div className="space-y-1">
        <label
          htmlFor="login-password"
          className="block text-xs font-semibold uppercase tracking-wider text-muted"
        >
          Password
        </label>
        <div className="relative">
          <input
            id="login-password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            placeholder="Your password"
            className="w-full rounded-xl border border-border-default bg-[#FAF8F5] px-3.5 py-2 pr-9 text-xs text-foreground placeholder-muted/40 outline-none transition-all focus:border-brand-primary focus:ring-1 focus:ring-brand-primary/20 disabled:opacity-50"
            {...register("password")}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted/40 hover:text-muted transition-colors cursor-pointer"
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        {errors.password && (
          <p className="text-[10px] font-semibold text-signal-danger">{errors.password.message}</p>
        )}
      </div>

      {/* Server error */}
      {serverError && (
        <div className="rounded-xl border border-signal-danger/20 bg-red-50 px-4 py-2.5">
          <p className="text-xs font-semibold text-signal-danger">{serverError}</p>
        </div>
      )}

      <button
        id="login-submit-btn"
        type="submit"
        disabled={isSubmitting}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-primary hover:bg-brand-hover px-4 py-2.5 text-xs font-bold text-white shadow-sm transition-all disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Signing in…
          </>
        ) : (
          "Sign in"
        )}
      </button>
    </form>
  );
}
