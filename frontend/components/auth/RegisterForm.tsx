"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const registerSchema = z
  .object({
    display_name: z
      .string()
      .min(2, "Name must be at least 2 characters")
      .max(50, "Name must be 50 characters or fewer"),
    email: z.string().email("Please enter a valid email address"),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters"),
    confirm_password: z.string(),
  })
  .refine((data) => data.password === data.confirm_password, {
    message: "Passwords do not match",
    path: ["confirm_password"],
  });

type RegisterFormValues = z.infer<typeof registerSchema>;

export function RegisterForm() {
  const router = useRouter();
  const supabase = createClient();
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (values: RegisterFormValues) => {
    setServerError(null);

    const { error } = await supabase.auth.signUp({
      email: values.email,
      password: values.password,
      options: {
        data: { display_name: values.display_name },
      },
    });

    if (error) {
      setServerError(error.message);
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      router.push("/investigate");
      router.refresh();
    } else {
      setSuccess(true);
    }
  };

  if (success) {
    return (
      <div className="rounded-xl border border-brand-primary/20 bg-indigo-50/50 p-6 text-center">
        <p className="text-xs font-semibold text-brand-primary">
          Check your email for a confirmation link to complete registration.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      {/* Display name */}
      <div className="space-y-1">
        <label
          htmlFor="register-display-name"
          className="block text-xs font-semibold uppercase tracking-wider text-muted"
        >
          Display name
        </label>
        <input
          id="register-display-name"
          type="text"
          autoComplete="name"
          placeholder="Your name"
          className="w-full rounded-xl border border-border-default bg-[#FAF8F5] px-3.5 py-2 text-xs text-foreground placeholder-muted/40 outline-none transition-all focus:border-brand-primary focus:ring-1 focus:ring-brand-primary/20 disabled:opacity-50"
          {...register("display_name")}
        />
        {errors.display_name && (
          <p className="text-[10px] font-semibold text-signal-danger">{errors.display_name.message}</p>
        )}
      </div>

      {/* Email */}
      <div className="space-y-1">
        <label
          htmlFor="register-email"
          className="block text-xs font-semibold uppercase tracking-wider text-muted"
        >
          Email address
        </label>
        <input
          id="register-email"
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
          htmlFor="register-password"
          className="block text-xs font-semibold uppercase tracking-wider text-muted"
        >
          Password
        </label>
        <div className="relative">
          <input
            id="register-password"
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            placeholder="At least 8 characters"
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

      {/* Confirm password */}
      <div className="space-y-1">
        <label
          htmlFor="register-confirm-password"
          className="block text-xs font-semibold uppercase tracking-wider text-muted"
        >
          Confirm password
        </label>
        <input
          id="register-confirm-password"
          type={showPassword ? "text" : "password"}
          autoComplete="new-password"
          placeholder="Repeat your password"
          className="w-full rounded-xl border border-border-default bg-[#FAF8F5] px-3.5 py-2 text-xs text-foreground placeholder-muted/40 outline-none transition-all focus:border-brand-primary focus:ring-1 focus:ring-brand-primary/20 disabled:opacity-50"
          {...register("confirm_password")}
        />
        {errors.confirm_password && (
          <p className="text-[10px] font-semibold text-signal-danger">{errors.confirm_password.message}</p>
        )}
      </div>

      {/* Server error */}
      {serverError && (
        <div className="rounded-xl border border-signal-danger/20 bg-red-50 px-4 py-2.5">
          <p className="text-xs font-semibold text-signal-danger">{serverError}</p>
        </div>
      )}

      <button
        id="register-submit-btn"
        type="submit"
        disabled={isSubmitting}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-primary hover:bg-brand-hover px-4 py-2.5 text-xs font-bold text-white shadow-sm transition-all disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Creating account…
          </>
        ) : (
          "Create account"
        )}
      </button>
    </form>
  );
}
