"use client";

import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import { LogOut, Settings, User } from "lucide-react";

interface UserNavProps {
  user: any;
}

export function UserNav({ user }: UserNavProps) {
  const [open, setOpen] = useState(false);
  const { signOut } = useAuth();
  const router = useRouter();

  const handleSignOut = async () => {
    await signOut();
    router.push("/");
    router.refresh();
  };

  const displayName = user?.email?.split("@")[0] || "User";

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 rounded-lg border border-border-default bg-surface-card p-1.5 px-3 hover:bg-surface-soft hover:border-brand-primary/30 transition-colors cursor-pointer text-xs font-semibold"
      >
        <span className="h-2 w-2 rounded-full bg-brand-primary" />
        <span className="capitalize">{displayName}</span>
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setOpen(false)}
          />
          <div className="absolute right-0 mt-2 w-48 rounded-xl border border-border-default bg-surface-card p-1.5 shadow-lg z-20 animate-in fade-in slide-in-from-top-1 duration-100">
            <div className="px-3 py-2 text-[10px] font-bold tracking-wider text-muted border-b border-border-default select-none uppercase">
              {displayName}
            </div>
            
            <button
              onClick={() => {
                setOpen(false);
                router.push("/investigate");
              }}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-medium hover:bg-surface-soft text-foreground transition-colors cursor-pointer"
            >
              <User className="h-3.5 w-3.5 text-muted" />
              Account
            </button>

            <button
              onClick={() => {
                setOpen(false);
                alert("Settings configured: Language: English, Theme: Warm Light.");
              }}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-medium hover:bg-surface-soft text-foreground transition-colors cursor-pointer"
            >
              <Settings className="h-3.5 w-3.5 text-muted" />
              Settings
            </button>

            <div className="my-1 border-t border-border-default" />

            <button
              onClick={handleSignOut}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-semibold text-signal-danger hover:bg-red-50 transition-colors cursor-pointer"
            >
              <LogOut className="h-3.5 w-3.5" />
              Sign out
            </button>
          </div>
        </>
      )}
    </div>
  );
}
