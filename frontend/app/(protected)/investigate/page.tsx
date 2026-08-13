import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { SubmitForm } from "@/components/investigation/SubmitForm";

export const metadata: Metadata = {
  title: "New Investigation",
  description: "Examine claims critically before sharing.",
};

export default async function InvestigatePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="mx-auto max-w-2xl py-6 space-y-6 select-none font-sans">
      {/* Header */}
      <div className="space-y-3">
        <h1 className="text-3xl font-bold tracking-tight text-foreground font-serif">
          Bring something you're unsure about.
        </h1>
        <p className="text-sm leading-relaxed text-muted max-w-xl">
          Paste a headline, article excerpt, social media post, or claim. Second Thought will guide you through a step-by-step reflection process to examine its sources, emotional triggers, and missing context.
        </p>
      </div>

      {/* Form card */}
      <div className="rounded-2xl border border-border-default bg-surface-card p-6 md:p-8 shadow-sm">
        <SubmitForm />
      </div>

      {/* Notice */}
      <div className="text-center max-w-md mx-auto">
        <p className="text-xs text-muted leading-relaxed font-medium">
          Second Thought does not provide binary true/false verdicts or judge what you should believe. It is a space for you to slow down and think.
        </p>
      </div>
    </div>
  );
}
