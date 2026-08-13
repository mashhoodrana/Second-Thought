"use client";

import { useEffect, useState, use } from "react";
import { getInvestigation, getThinkingData, retryInvestigation } from "@/lib/api-client";
import type { InvestigationDetailResponse, ThinkingResponse } from "@/lib/types";
import { ResultContainer } from "@/components/investigation/ResultContainer";
import { ArrowLeft, Loader2, AlertCircle } from "lucide-react";
import Link from "next/link";

interface PageProps {
  params: Promise<{ session_id: string }>;
}

export default function InvestigationDetailPage({ params }: PageProps) {
  const { session_id } = use(params);
  const [data, setData] = useState<InvestigationDetailResponse | null>(null);
  const [thinkingData, setThinkingData] = useState<ThinkingResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    let timerId: NodeJS.Timeout;
    let retryCount = 0;
    const maxRetries = 5;

    const poll = async () => {
      try {
        const res = await getInvestigation(session_id);
        if (!active) return;

        setData(res);
        setError(null);
        setLoading(false);

        // Fetch thinking data progressively
        try {
          const thinkingRes = await getThinkingData(session_id);
          if (active) {
            setThinkingData(thinkingRes);
          }
        } catch {
          // Ignore transient failures in thinking endpoint during early setup
        }

        // Continue polling if pending or processing
        if (res.status === "pending" || res.status === "processing") {
          timerId = setTimeout(poll, 2000);
        }
      } catch (err: any) {
        if (!active) return;

        // Gracefully handle initial 404s due to database write propagation lag
        if (err.status === 404 && retryCount < maxRetries) {
          retryCount++;
          timerId = setTimeout(poll, 2000);
          return;
        }

        setError(err.message || "Failed to fetch investigation details.");
        setLoading(false);
      }
    };

    poll();

    return () => {
      active = false;
      clearTimeout(timerId);
    };
  }, [session_id]);

  const handleRetry = async () => {
    try {
      setLoading(true);
      setError(null);
      setData(null);
      setThinkingData(null);
      await retryInvestigation(session_id);
    } catch (err: any) {
      setError(err.message || "Failed to restart investigation.");
      setLoading(false);
    }
  };

  // ── 1. Initial Load ─────────────────────────────────────────────
  if (loading && !data) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3">
        <Loader2 className="h-6.5 w-6.5 animate-spin text-brand-primary" />
        <p className="text-sm font-semibold text-muted select-none">Retrieving investigation session...</p>
      </div>
    );
  }

  // ── 2. Error State ──────────────────────────────────────────────
  if (error) {
    return (
      <div className="mx-auto max-w-xl py-6 select-none font-sans">
        <div className="rounded-2xl border border-signal-danger/25 bg-red-50 p-6 space-y-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-signal-danger" />
            <div className="space-y-1">
              <h3 className="font-bold text-sm text-foreground">Retrieval Failed</h3>
              <p className="text-xs leading-relaxed text-muted">{error}</p>
            </div>
          </div>
          <div className="flex gap-4">
            <button
              onClick={handleRetry}
              className="inline-flex items-center gap-2 rounded-xl bg-brand-primary px-4 py-2 text-xs font-semibold text-white transition-all hover:bg-brand-hover cursor-pointer"
            >
              Try again
            </button>
            <Link
              href="/investigate"
              className="inline-flex items-center gap-2 rounded-xl border border-border-default bg-surface-card px-4 py-2 text-xs font-semibold text-foreground transition-all hover:bg-surface-soft"
            >
              <ArrowLeft className="h-4 w-4" /> Go back
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const status = data?.status;

  return (
    <div className="space-y-6 font-sans">
      {/* Top Navigation */}
      <div className="flex items-center justify-between border-b border-border-default pb-4 select-none">
        <Link
          href="/investigate"
          className="inline-flex items-center gap-2 text-sm font-semibold text-muted hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Back to workspace
        </Link>
        {data && (
          <span
            className={`text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded border ${
              status === "complete"
                ? "bg-emerald-50 text-signal-success border-emerald-200"
                : status === "processing" || status === "pending"
                ? "bg-indigo-50 text-brand-primary border-indigo-200 animate-pulse"
                : "bg-red-50 text-signal-danger border-red-200"
            }`}
          >
            {status === "complete" ? "Complete" : status === "processing" || status === "pending" ? "Examines..." : "Error"}
          </span>
        )}
      </div>

      {/* Render the workbook immediately */}
      {data && (
        <ResultContainer
          data={data}
          thinkingData={thinkingData}
          onRetry={handleRetry}
        />
      )}
    </div>
  );
}
