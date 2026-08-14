"use client";

import { useState, useEffect } from "react";
import {
  BookOpen,
  Search,
  AlertTriangle,
  ExternalLink,
  CheckCircle2,
  HelpCircle,
  AlertCircle,
  Compass,
  ShieldCheck,
  ArrowRight,
  ArrowLeft,
  Loader2,
  RefreshCw
} from "lucide-react";
import type { InvestigationDetailResponse, ThinkingResponse } from "@/lib/types";
import { getThinkingData, submitReflection, submitShareDecision } from "@/lib/api-client";

interface ResultContainerProps {
  data: InvestigationDetailResponse;
  thinkingData: ThinkingResponse | null;
  onRetry?: () => void;
}

export function ResultContainer({ data, thinkingData, onRetry }: ResultContainerProps) {
  // Client-side guided flow state (steps 1 to 9)
  const [activeStep, setActiveStep] = useState<number>(1);

  // States for user interactive selections (MCQ answers & written thoughts)
  const [initialReaction, setInitialReaction] = useState<string | null>(null);
  const [initialExplanation, setInitialExplanation] = useState<string>("");
  const [pauseResponse, setPauseResponse] = useState<string>("");

  const [sourceContextMCQ, setSourceContextMCQ] = useState<string | null>(null);
  const [evidenceMCQ, setEvidenceMCQ] = useState<string | null>(null);
  const [reasoningMCQ, setReasoningMCQ] = useState<string | null>(null);
  const [emotionMCQ, setEmotionMCQ] = useState<string | null>(null);
  const [emotionWritten, setEmotionWritten] = useState<string>("");

  const [postReaction, setPostReaction] = useState<string | null>(null);
  const [reflectionText, setReflectionText] = useState("");
  const [reflectionSubmitted, setReflectionSubmitted] = useState(false);

  const [shareDecision, setShareDecision] = useState<string | null>(null);
  const [shareDecisionSubmitted, setShareDecisionSubmitted] = useState(false);
  const [shareVerificationText, setShareVerificationText] = useState("");

  const [evidenceExpanded, setEvidenceExpanded] = useState(false);
  const [initializedFromThinking, setInitializedFromThinking] = useState(false);
  const [activeSourceDetails, setActiveSourceDetails] = useState<Record<string, boolean>>({});

  const handleToggleSourceDetails = (sourceId: string) => {
    setActiveSourceDetails(prev => ({
      ...prev,
      [sourceId]: !prev[sourceId]
    }));
  };

  const findings = data.findings || {};
  const { synthesis, source, emotion, evidence } = findings;

  // Sync state to localStorage for session persistence
  const saveState = (key: string, value: string) => {
    try {
      localStorage.setItem(`st_${key}_${data.session_id}`, value);
    } catch (e) {
      console.warn("localStorage write failed", e);
    }
  };

  // Restore states on load
  useEffect(() => {
    if (!thinkingData || initializedFromThinking) return;

    // If database already contains a completed reflection & share decision, jump straight to Summary Replay (step 9)
    if (
      thinkingData.reflection &&
      thinkingData.reflection.post_analysis_reaction &&
      thinkingData.reflection.share_decision
    ) {
      setInitialReaction(thinkingData.reflection.initial_reaction || null);
      setPostReaction(thinkingData.reflection.post_analysis_reaction || null);
      setReflectionText(thinkingData.reflection.what_changed || "");
      setShareDecision(thinkingData.reflection.share_decision);
      setReflectionSubmitted(true);
      setShareDecisionSubmitted(true);
      setActiveStep(9);
      setInitializedFromThinking(true);
    } else {
      try {
        const savedStep = localStorage.getItem(`st_step_${data.session_id}`);
        const savedInitReact = localStorage.getItem(`st_init_react_${data.session_id}`);
        const savedInitExpl = localStorage.getItem(`st_init_expl_${data.session_id}`);
        const savedPause = localStorage.getItem(`st_pause_${data.session_id}`);
        
        const savedSrcCtxMCQ = localStorage.getItem(`st_src_ctx_mcq_${data.session_id}`);
        const savedEvMCQ = localStorage.getItem(`st_ev_mcq_${data.session_id}`);
        const savedReasMCQ = localStorage.getItem(`st_reas_mcq_${data.session_id}`);
        const savedEmMCQ = localStorage.getItem(`st_em_mcq_${data.session_id}`);
        const savedEmWritten = localStorage.getItem(`st_em_written_${data.session_id}`);

        const savedPostReact = localStorage.getItem(`st_post_react_${data.session_id}`);
        const savedReflectText = localStorage.getItem(`st_reflect_text_${data.session_id}`);
        const savedShareVerif = localStorage.getItem(`st_share_verif_${data.session_id}`);
        const savedShareDecision = localStorage.getItem(`st_share_decision_${data.session_id}`);

        if (savedStep) setActiveStep(parseInt(savedStep, 10));

        if (savedInitReact) setInitialReaction(savedInitReact);
        else if (thinkingData.reflection?.initial_reaction) setInitialReaction(thinkingData.reflection.initial_reaction);

        if (savedInitExpl) setInitialExplanation(savedInitExpl);
        if (savedPause) setPauseResponse(savedPause);

        if (savedSrcCtxMCQ) setSourceContextMCQ(savedSrcCtxMCQ);
        if (savedEvMCQ) setEvidenceMCQ(savedEvMCQ);
        if (savedReasMCQ) setReasoningMCQ(savedReasMCQ);
        if (savedEmMCQ) setEmotionMCQ(savedEmMCQ);
        if (savedEmWritten) setEmotionWritten(savedEmWritten);

        if (savedPostReact) setPostReaction(savedPostReact);
        else if (thinkingData.reflection?.post_analysis_reaction) setPostReaction(thinkingData.reflection.post_analysis_reaction);

        if (savedReflectText) setReflectionText(savedReflectText);
        else if (thinkingData.reflection?.what_changed) setReflectionText(thinkingData.reflection.what_changed);

        if (savedShareVerif) setShareVerificationText(savedShareVerif);

        if (savedShareDecision) {
          setShareDecision(savedShareDecision);
          setShareDecisionSubmitted(true);
        } else if (thinkingData.reflection?.share_decision) {
          setShareDecision(thinkingData.reflection.share_decision);
          setShareDecisionSubmitted(true);
        }
      } catch (e) {
        console.warn("Could not restore state from localStorage", e);
      }
      setInitializedFromThinking(true);
    }
  }, [thinkingData, data.session_id, initializedFromThinking]);

  const handleStepNavigation = (step: number) => {
    setActiveStep(step);
    saveState("step", step.toString());
  };

  // Submit Initial Reaction
  const handleInitialReaction = async (reaction: "believe" | "doubt" | "unsure" | "share") => {
    setInitialReaction(reaction);
    saveState("init_react", reaction);
    try {
      await submitReflection(data.session_id, reaction);
    } catch (err) {
      console.error("Failed to save initial reaction:", err);
    }
  };

  // Submit Reflection (Step 7)
  const handleReflectionSubmit = async () => {
    if (!postReaction || !reflectionText.trim()) return;
    try {
      await submitReflection(data.session_id, undefined, postReaction, reflectionText);
      setReflectionSubmitted(true);
      saveState("post_react", postReaction);
      saveState("reflect_text", reflectionText);
      handleStepNavigation(8); // Move to Share Decision
    } catch (err) {
      console.error("Failed to save reflection:", err);
    }
  };

  // Submit Share Decision (Step 8)
  const handleShareDecisionSubmit = async (decision: string) => {
    try {
      await submitShareDecision(data.session_id, decision);
      setShareDecision(decision);
      setShareDecisionSubmitted(true);
      saveState("share_decision", decision);
      if (shareVerificationText) {
        saveState("share_verif", shareVerificationText);
      }
      handleStepNavigation(9); // Move to Summary Replay
    } catch (err) {
      console.error("Failed to save share decision:", err);
    }
  };

  const handleSourceContextMCQ = (val: string) => {
    setSourceContextMCQ(val);
    saveState("src_ctx_mcq", val);
  };

  const handleEvidenceMCQ = (val: string) => {
    setEvidenceMCQ(val);
    saveState("ev_mcq", val);
  };

  const handleReasoningMCQ = (val: string) => {
    setReasoningMCQ(val);
    saveState("reas_mcq", val);
  };

  const handleEmotionMCQ = (val: string) => {
    setEmotionMCQ(val);
    saveState("em_mcq", val);
  };

  // Click-to-scroll to source badge
  const scrollToSource = (sourceId: string) => {
    const cleanId = sourceId.replace("src_", "src-");
    const element = document.getElementById(cleanId);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "center" });
      element.classList.add("ring-2", "ring-brand-primary/40");
      setTimeout(() => {
        element.classList.remove("ring-2", "ring-brand-primary/40");
      }, 2000);
    }
  };

  // Render text citations as badges
  const renderCitations = (text: string) => {
    if (!text) return null;
    const parts = text.split(/(\[src_\d{3}\])/g);
    return parts.map((part, idx) => {
      const match = part.match(/^\[(src_\d{3})\]$/);
      if (match) {
        const sourceId = match[1];
        return (
          <button
            key={idx}
            onClick={() => scrollToSource(sourceId)}
            className="mx-1 inline-flex items-center gap-1.5 rounded bg-brand-primary/10 border border-brand-primary/20 px-2 py-0.5 font-mono text-[13px] font-bold text-brand-primary hover:bg-brand-primary/20 transition-all cursor-pointer"
          >
            {sourceId}
          </button>
        );
      }
      return <span key={idx}>{part}</span>;
    });
  };

  // Pick the pause question
  const getSelectedQuestion = () => {
    if (thinkingData?.thinking_questions && thinkingData.thinking_questions.length > 0) {
      return thinkingData.thinking_questions[0];
    }
    return {
      question_text: "What evidence would change your mind about this claim?",
      category: "Evidence Evaluation",
      rationale: "Considering alternative evidence prevents verification bias."
    };
  };

  const selectedQuestion = getSelectedQuestion();

  // Reaction formatting helper
  const getReactionLabel = (react: string | null, type?: "initial" | "post" | "decision") => {
    if (!react) return "";
    if (react === "share") {
      if (type === "initial") return "I wanted to share it";
      return "I would share";
    }
    if (react === "still_unsure") {
      if (type === "decision") return "I'm still unsure";
      return "Still unsure";
    }
    const mapping: Record<string, string> = {
      believe: "I believed it",
      doubt: "I doubted it",
      unsure: "I wasn't sure",
      more_confident: "More confident in it",
      less_confident: "Less confident in it",
      need_evidence: "I need more evidence",
      wait_and_verify: "Wait and verify",
      share_with_context: "Share with context",
      not_share: "I would not share"
    };
    return mapping[react] || react;
  };

  // Inferred evidence mappings
  const getSourceSignalAndContext = (sourceId: string) => {
    const claims = evidence?.claims || [];
    const matchingClaim = claims.find((c) => c.citation_source_id === sourceId);
    const relationship = matchingClaim?.relationship;

    let signal = "CONTEXTUALIZES";
    if (relationship === "corroborates") signal = "CORROBORATES";
    else if (relationship === "contradicts") signal = "CONTRADICTS";
    else if (relationship === "unverified") signal = "UNCERTAIN";

    let surfacedReason = "This source provides background context and temporal setting related to the claim.";
    if (relationship === "corroborates") {
      surfacedReason = "This source contains statements supporting the claim's core assertions.";
    } else if (relationship === "contradicts") {
      surfacedReason = "This source contains statements challenging or contradicting parts of the claim.";
    }

    return { signal, surfacedReason };
  };

  const inferSourceType = (publisher: string, url: string) => {
    const pub = publisher.toLowerCase();
    const u = url.toLowerCase();
    if (u.includes(".gov") || pub.includes("official") || pub.includes("government")) return "OFFICIAL RECORD";
    if (u.includes(".edu") || pub.includes("university") || pub.includes("education")) return "ACADEMIC SOURCE";
    if (pub.includes("factcheck") || pub.includes("snopes") || pub.includes("politifact")) return "FACT CHECK";
    if (
      pub.includes("news") ||
      pub.includes("reuters") ||
      pub.includes("ap") ||
      pub.includes("bbc") ||
      pub.includes("times") ||
      pub.includes("cnn") ||
      pub.includes("post")
    ) {
      return "NEWS OUTLET";
    }
    return "WEB RECORD";
  };

  // Supported / Challenged / Uncertain helpers
  const getConsensusHighlights = () => {
    const claims = evidence?.claims || [];
    const sources = evidence?.sources || [];

    const supportedClaim = claims.find((c) => c.relationship === "corroborates");
    const challengedClaim = claims.find((c) => c.relationship === "contradicts");

    const getSourceText = (citationId: string) => {
      const src = sources.find((s) => s.source_id === citationId);
      return src ? `${src.title} (${src.publisher})` : citationId;
    };

    return {
      supported: supportedClaim
        ? `Supported by: ${getSourceText(supportedClaim.citation_source_id)}`
        : "No direct supporting source found.",
      challenged: challengedClaim
        ? `Challenged by: ${getSourceText(challengedClaim.citation_source_id)}`
        : "No direct contradicting source found.",
      uncertain: synthesis?.what_remains_uncertain || "Some specific details remain unverified."
    };
  };

  const consensusHighlights = getConsensusHighlights();

  // Navigation button renderer
  const renderNavButtons = (
    prevStep: number | null,
    nextStep: number | null,
    nextDisabled = false,
    onNextClick?: () => void
  ) => {
    return (
      <div className="flex items-center justify-between pt-6 border-t border-border-default mt-8 select-none">
        {prevStep !== null ? (
          <button
            onClick={() => handleStepNavigation(prevStep)}
            className="inline-flex items-center gap-2 rounded-xl border border-border-default bg-surface-card hover:bg-surface-soft px-5 py-2.5 text-[14px] font-bold text-foreground transition-all cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
        ) : (
          <div />
        )}
        {nextStep !== null ? (
          <button
            disabled={nextDisabled}
            onClick={() => {
              if (onNextClick) {
                onNextClick();
              } else {
                handleStepNavigation(nextStep);
              }
            }}
            className="inline-flex items-center gap-2 rounded-xl bg-brand-primary hover:bg-brand-hover px-6 py-2.5 text-[14px] font-bold text-white shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            Continue
            <ArrowRight className="h-4 w-4" />
          </button>
        ) : (
          <div />
        )}
      </div>
    );
  };

  return (
    <div className="space-y-8 max-w-3xl mx-auto pb-16 font-sans select-none">
      {/* Sticky/Header Reference of the Claim */}
      <div className="space-y-2">
        <span className="text-[13px] font-bold uppercase tracking-wider text-muted">Claim Under Examination</span>
        <div className="rounded-2xl border border-border-default bg-surface-card p-6 shadow-sm">
          {(() => {
            const raw = data.input?.raw_text || "";
            let displayText = raw;
            let hasImage = false;

            if (raw.includes("|||")) {
              const [textPart, imgPart] = raw.split("|||", 2);
              displayText = textPart.trim();
              if (imgPart && imgPart.trim().startsWith("data:image/")) {
                hasImage = true;
              }
            } else if (raw.startsWith("data:image/")) {
              displayText = data.input?.sanitized_text || "Attached Image Claim";
              hasImage = true;
            }

            if (!displayText && hasImage) {
              displayText = "Attached Image Claim";
            }

            return (
              <>
                <blockquote className="text-[16px] md:text-[17px] font-serif italic border-l-3 border-brand-primary pl-4 text-foreground leading-relaxed">
                  "{displayText}"
                </blockquote>
                {hasImage && (
                  <div className="mt-3 pl-4 flex items-center gap-1.5">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-brand-primary/10 border border-brand-primary/20 text-[11px] font-bold text-brand-primary">
                      📷 Attached Image Analyzed
                    </span>
                  </div>
                )}
              </>
            );
          })()}
        </div>
      </div>

      {/* Sleek Progress Timeline Header */}
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-border-default pb-3">
          {[
            { label: "PAUSE", steps: [1, 2] },
            { label: "EXAMINE", steps: [3, 4, 5] },
            { label: "REFLECT", steps: [6, 7] },
            { label: "DECIDE", steps: [8, 9] }
          ].map((stage, idx, arr) => {
            const isCompleted = stage.steps.every((s) => activeStep > s);
            const isActive = stage.steps.includes(activeStep);
            return (
              <div key={stage.label} className="flex items-center flex-1 last:flex-initial">
                <div className="flex items-center gap-2">
                  <div
                    className={`h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-bold transition-all ${
                      isCompleted
                        ? "bg-emerald-600 text-white"
                        : isActive
                        ? "bg-brand-primary text-white ring-2 ring-brand-primary/20"
                        : "bg-border-default text-muted"
                    }`}
                  >
                    {isCompleted ? "✓" : idx + 1}
                  </div>
                  <span
                    className={`text-[11px] font-bold uppercase tracking-wider hidden sm:inline transition-all ${
                      isActive ? "text-brand-primary font-extrabold" : "text-muted font-medium"
                    }`}
                  >
                    {stage.label}
                  </span>
                </div>
                {idx < arr.length - 1 && (
                  <div
                    className={`h-[2px] flex-1 mx-4 transition-all ${
                      isCompleted ? "bg-emerald-600" : "bg-border-default"
                    }`}
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* Dynamic Momemt Label */}
        <div className="text-center bg-surface-card border border-border-default/50 rounded-xl py-2 px-4 shadow-sm">
          <p className="text-[11px] font-bold uppercase tracking-widest text-brand-primary">
            {activeStep === 1 && "PAUSE MOMENT 1 OF 2: YOUR FIRST REACTION"}
            {activeStep === 2 && "PAUSE MOMENT 2 OF 2: PAUSE"}
            {activeStep === 3 && "THINKING MOMENT 1 OF 3: SOURCE + CONTEXT"}
            {activeStep === 4 && "THINKING MOMENT 2 OF 3: EVIDENCE + REASONING"}
            {activeStep === 5 && "THINKING MOMENT 3 OF 3: EMOTION + FRAMING"}
            {activeStep === 6 && "REFLECT MOMENT 1 OF 2: TAKE A SECOND LOOK"}
            {activeStep === 7 && "REFLECT MOMENT 2 OF 2: YOUR THINKING NOW"}
            {activeStep === 8 && "DECIDE MOMENT 1 OF 2: WHAT WILL YOU DO?"}
            {activeStep === 9 && "DECIDE MOMENT 2 OF 2: THINKING REPLAY"}
          </p>
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────────────────────── */}
      {/* ── STEP 1: Your First Reaction ────────────────────────────────────────────── */}
      {/* ───────────────────────────────────────────────────────────────────────────── */}
      {activeStep === 1 && (
        <div className="rounded-2xl border border-border-default bg-surface-card p-6 md:p-8 shadow-sm space-y-6 animate-in fade-in duration-300">
          <div className="space-y-4">
            <h2 className="text-[18px] md:text-[20px] font-medium text-foreground">
              What was your very first response when you read this claim?
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {[
                { key: "believe", label: "I believed it" },
                { key: "unsure", label: "I wasn't sure" },
                { key: "doubt", label: "I doubted it" },
                { key: "share", label: "I wanted to share it" }
              ].map((opt) => (
                <button
                  key={opt.key}
                  onClick={() => handleInitialReaction(opt.key as any)}
                  className={`py-3 px-4 rounded-xl border text-[13px] font-bold uppercase tracking-wider transition-all duration-200 cursor-pointer ${
                    initialReaction === opt.key
                      ? "bg-brand-primary border-brand-primary text-white shadow-sm"
                      : "bg-background border-border-default text-muted hover:border-brand-primary/30"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {initialReaction && (
              <div className="space-y-3 pt-3 animate-in fade-in duration-300">
                <label htmlFor="first-reaction-expl" className="block text-[14px] font-semibold text-foreground">
                  What made you feel that way? <span className="text-[12px] font-normal text-muted">(Optional explanation)</span>
                </label>
                <textarea
                  id="first-reaction-expl"
                  rows={3}
                  value={initialExplanation}
                  onChange={(e) => {
                    setInitialExplanation(e.target.value);
                    saveState("init_expl", e.target.value);
                  }}
                  placeholder="E.g., It matches stories I've heard, the wording seemed sensational, there were no source links..."
                  className="w-full resize-none rounded-xl border border-border-default bg-[#FAF8F5] px-4 py-3 text-[16px] text-foreground placeholder-muted/40 outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary/20"
                />
              </div>
            )}
          </div>
          {renderNavButtons(null, 2, !initialReaction)}
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────────────────────── */}
      {/* ── STEP 2: Pause ──────────────────────────────────────────────────────────── */}
      {/* ───────────────────────────────────────────────────────────────────────────── */}
      {activeStep === 2 && (
        <div className="rounded-2xl border border-border-default bg-surface-card p-6 md:p-8 shadow-sm space-y-6 animate-in fade-in duration-300">
          <div className="space-y-4">
            <span className="text-[13px] font-bold uppercase tracking-widest text-brand-primary bg-brand-primary/5 px-2.5 py-1 rounded border border-brand-primary/10 inline-block">
              Before we look closer, pause for a moment
            </span>
            <p className="text-[18px] md:text-[20px] font-serif italic text-foreground leading-relaxed pt-2">
              "{selectedQuestion.question_text}"
            </p>

            <textarea
              rows={3}
              value={pauseResponse}
              onChange={(e) => {
                setPauseResponse(e.target.value);
                saveState("pause", e.target.value);
              }}
              placeholder="Take a moment to write your thoughts here before revealing our findings (optional)..."
              className="w-full resize-none rounded-xl border border-border-default bg-[#FAF8F5] px-4 py-3 text-[16px] text-foreground placeholder-muted/40 outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary/20"
            />
            <p className="text-[13px] text-muted">{selectedQuestion.rationale}</p>
          </div>
          {renderNavButtons(1, 3, false)}
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────────────────────── */}
      {/* ── STEP 3: Moment 1 — Source + Context ─────────────────────────────────────── */}
      {/* ───────────────────────────────────────────────────────────────────────────── */}
      {activeStep === 3 && (
        <div className="rounded-2xl border border-border-default bg-surface-card p-6 md:p-8 shadow-sm space-y-6 animate-in fade-in duration-300">
          <div className="space-y-5">
            <div className="flex items-center gap-3 border-b border-border-default pb-4">
              <div className="h-7 w-7 rounded bg-brand-primary/5 border border-brand-primary/10 flex items-center justify-center text-brand-primary">
                <Search className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-[20px] font-bold text-foreground font-serif">Moment 1: Source & Context</h3>
                <span className="text-[13px] text-muted">Examine the publisher credentials and environmental details</span>
              </div>
            </div>

            <p className="text-[18px] md:text-[20px] font-medium text-foreground">
              Before we look closer, what would make you trust this claim?
            </p>

            <div className="grid gap-2">
              {[
                "An official source",
                "Several independent reports",
                "Evidence from people involved",
                "I'm not sure yet"
              ].map((opt) => (
                <button
                  key={opt}
                  onClick={() => handleSourceContextMCQ(opt)}
                  className={`py-3 px-4 rounded-xl border text-[14px] font-semibold text-left transition-all duration-200 cursor-pointer ${
                    sourceContextMCQ === opt
                      ? "bg-brand-primary border-brand-primary text-white shadow-sm"
                      : "bg-[#FAF8F5] border-border-default text-muted hover:border-brand-primary/30"
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>

            {sourceContextMCQ && (
              <div className="space-y-4 pt-6 border-t border-border-default/50 animate-in fade-in duration-500">
                <span className="block text-[13px] font-bold text-brand-primary uppercase tracking-wider">
                  What we found
                </span>

                {!source ? (
                  <div className="flex items-center gap-2.5 py-4 text-muted text-[14px]">
                    <Loader2 className="h-4.5 w-4.5 animate-spin text-brand-primary" />
                    <span>Looking for the original source and context...</span>
                  </div>
                ) : (
                  <div className="space-y-4 text-[16px] leading-relaxed text-muted font-serif">
                    <p>
                      We looked closer at the origin of this claim. It was published or shared via{" "}
                      <span className="font-sans font-semibold text-foreground font-mono">{source?.domains?.[0]?.domain || "an unidentified source"}</span>.
                    </p>
                    
                    {source?.domains?.[0] && (
                      <p>
                        This domain is classified as:{" "}
                        <span className="font-sans font-bold text-brand-primary capitalize">
                          {(() => {
                            const signals = source.domains[0].reliability_signals || [];
                            if (signals.some(s => s.includes("gov") || s.includes("official") || s.includes("government"))) {
                              return "Official government source";
                            }
                            if (signals.some(s => s.includes("edu") || s.includes("academic") || s.includes("science") || s.includes("university"))) {
                              return "Primary research / Academic source";
                            }
                            if (signals.some(s => s.includes("news") || s.includes("established_news") || s.includes("press"))) {
                              return "Independent reporting / News outlet";
                            }
                            if (signals.some(s => s.includes("blog") || s.includes("personal") || s.includes("opinion"))) {
                              return "Opinion piece / Personal blog";
                            }
                            return "General secondary source";
                          })()}
                        </span>.
                      </p>
                    )}

                    <p>
                      Timeline &amp; Setting: The events are tied to{" "}
                      <span className="font-sans font-semibold text-foreground">
                        {thinkingData?.context?.temporal_context || "an unspecified timeframe"}
                      </span>
                      {thinkingData?.context?.geographic_context && (
                        <>
                          {" "}located in{" "}
                          <span className="font-sans font-semibold text-foreground">
                            {thinkingData.context.geographic_context}
                          </span>
                        </>
                      )}.
                    </p>

                    {thinkingData?.context?.missing_context && thinkingData.context.missing_context !== "None" && (
                      <p className="bg-indigo-50/40 border border-brand-primary/10 rounded-xl p-4 text-[15px] font-sans text-muted leading-relaxed">
                        <span className="font-bold text-brand-primary block mb-1">Contextual Gaps Noted</span>
                        {thinkingData.context.missing_context}
                      </p>
                    )}

                    <p className="text-[14px] text-muted font-sans border-t border-border-default/50 pt-3 mt-4">
                      <span className="font-semibold text-foreground">Why this matters:</span>{" "}
                      {thinkingData?.context?.misleading_wording_analysis &&
                      thinkingData.context.misleading_wording_analysis !== "None"
                        ? thinkingData.context.misleading_wording_analysis
                        : "Establishing publisher identity and timeline prevents sharing out-of-context claims."}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
          {renderNavButtons(2, 4, !sourceContextMCQ)}
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────────────────────── */}
      {/* ── STEP 4: Moment 2 — Evidence + Reasoning ─────────────────────────────────── */}
      {/* ───────────────────────────────────────────────────────────────────────────── */}
      {activeStep === 4 && (
        <div className="rounded-2xl border border-border-default bg-surface-card p-6 md:p-8 shadow-sm space-y-6 animate-in fade-in duration-300">
          <div className="space-y-5">
            <div className="flex items-center gap-3 border-b border-border-default pb-4">
              <div className="h-7 w-7 rounded bg-brand-primary/5 border border-brand-primary/10 flex items-center justify-center text-brand-primary">
                <ShieldCheck className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-[20px] font-bold text-foreground font-serif">Moment 2: Evidence & Reasoning</h3>
                <span className="text-[13px] text-muted">Compare details against web consensus and logic traps</span>
              </div>
            </div>

            {/* MCQ 1 */}
            <div className="space-y-3">
              <p className="text-[18px] md:text-[20px] font-medium text-foreground">
                What would make you more confident in this claim?
              </p>
              <div className="grid gap-2">
                {[
                  "Seeing multiple independent sources corroborating it",
                  "Finding official records or primary research",
                  "Knowing if credible experts have checked it",
                  "I'm not sure yet"
                ].map((opt) => (
                  <button
                    key={opt}
                    onClick={() => handleEvidenceMCQ(opt)}
                    className={`py-3 px-4 rounded-xl border text-[14px] font-semibold text-left transition-all duration-200 cursor-pointer ${
                      evidenceMCQ === opt
                        ? "bg-brand-primary border-brand-primary text-white shadow-sm"
                        : "bg-[#FAF8F5] border-border-default text-muted hover:border-brand-primary/30"
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>

            {/* Reveal findings */}
            {evidenceMCQ && (
              <div className="space-y-5 pt-6 border-t border-border-default/50 animate-in fade-in duration-500">
                <span className="block text-[13px] font-bold text-brand-primary uppercase tracking-wider">
                  What we found
                </span>

                {!evidence ? (
                  <div className="flex items-center gap-2.5 py-4 text-muted text-[14px]">
                    <Loader2 className="h-4.5 w-4.5 animate-spin text-brand-primary" />
                    <span>Checking what evidence exists and analyzing reasoning...</span>
                  </div>
                ) : (
                  <>
                    {/* Compact Narrative Evidence Blocks */}
                    <div className="space-y-4 font-serif">
                      <div className="space-y-4 text-[16px] text-muted leading-relaxed">
                        <div>
                          <span className="font-sans font-bold text-foreground block text-[13px] uppercase tracking-wider mb-1 text-emerald-700">
                            Supported evidence
                          </span>
                          <p>
                            {(() => {
                              const claims = evidence?.claims || [];
                              const supportedClaim = claims.find((c) => c.relationship === "corroborates");
                              return supportedClaim
                                ? supportedClaim.claim_text
                                : "No direct supporting evidence has been found in the retrieved web consensus.";
                            })()}
                          </p>
                        </div>

                        <div className="border-t border-border-default/30 pt-3">
                          <span className="font-sans font-bold text-foreground block text-[13px] uppercase tracking-wider mb-1 text-amber-700">
                            Challenged assertions
                          </span>
                          <p>
                            {(() => {
                              const claims = evidence?.claims || [];
                              const challengedClaim = claims.find((c) => c.relationship === "contradicts");
                              return challengedClaim
                                ? challengedClaim.claim_text
                                : "No direct contradicting evidence has been found in the retrieved web consensus.";
                            })()}
                          </p>
                        </div>

                        <div className="border-t border-border-default/30 pt-3">
                          <span className="font-sans font-bold text-foreground block text-[13px] uppercase tracking-wider mb-1 text-indigo-700">
                            Uncertain details
                          </span>
                          <p>
                            {synthesis?.what_remains_uncertain || "No major unverified details were noted in the retrieved sources."}
                          </p>
                        </div>

                        <div className="border-t border-border-default/30 pt-3">
                          <span className="font-sans font-bold text-foreground block text-[13px] uppercase tracking-wider mb-1 text-slate-700">
                            Missing context
                          </span>
                          <p>
                            {thinkingData?.context?.missing_context && thinkingData.context.missing_context !== "None"
                              ? thinkingData.context.missing_context
                              : "No critical geographic or temporal context was identified as missing."}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Strongest Sources */}
                    {evidence.sources && evidence.sources.length > 0 && (
                      <div className="space-y-4 border-t border-border-default/50 pt-5">
                        <span className="block text-[13px] uppercase font-bold text-muted tracking-wider">
                          Strongest Sources
                        </span>
                        <div className="grid gap-3">
                          {evidence.sources
                            .slice(0, 3) // Top 1-3 sources initially
                            .map((src) => {
                              const { signal, surfacedReason } = getSourceSignalAndContext(src.source_id);
                              let domain = "";
                              try {
                                domain = new URL(src.url).hostname.replace("www.", "");
                              } catch {
                                domain = "source link";
                              }
                              
                              let sourceClassification = "Secondary source";
                              const pub = src.publisher.toLowerCase();
                              const u = src.url.toLowerCase();
                              if (u.includes(".gov") || pub.includes("official") || pub.includes("government")) {
                                sourceClassification = "Official government source";
                              } else if (u.includes(".edu") || pub.includes("university") || pub.includes("science") || pub.includes("research")) {
                                sourceClassification = "Primary source / Academic research";
                              } else if (pub.includes("news") || pub.includes("reuters") || pub.includes("ap") || pub.includes("bbc") || pub.includes("times") || pub.includes("press")) {
                                sourceClassification = "Independent reporting";
                              }
                              
                              const isToggled = activeSourceDetails[src.source_id];

                              return (
                                <div
                                  key={src.source_id}
                                  id={src.source_id.replace("src_", "src-")}
                                  className="bg-white border border-border-default rounded-xl p-4 space-y-2 transition-all shadow-xs"
                                >
                                  <div className="flex justify-between items-start gap-4">
                                    <div className="space-y-1">
                                      <div className="flex flex-wrap items-center gap-2 text-[12px]">
                                        <span className="bg-brand-primary/10 text-brand-primary font-mono font-bold px-1.5 py-0.5 rounded">
                                          {src.source_id}
                                        </span>
                                        <span className="font-semibold text-foreground">
                                          {src.publisher}
                                        </span>
                                        <span className="text-muted">•</span>
                                        <span className="text-muted font-mono">{domain}</span>
                                        <span className="text-muted">•</span>
                                        <span className="font-semibold text-brand-primary">
                                          {sourceClassification}
                                        </span>
                                      </div>
                                      <h4 className="font-serif font-bold text-foreground text-[16px] leading-snug">
                                        {src.title}
                                      </h4>
                                    </div>
                                    <span
                                      className={`text-[11px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${
                                        signal === "CORROBORATES"
                                          ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                                          : signal === "CONTRADICTS"
                                          ? "bg-red-50 text-red-700 border-red-100"
                                          : "bg-slate-50 text-muted border-slate-100"
                                      }`}
                                    >
                                      {signal === "CORROBORATES" ? "Corroborates" : signal === "CONTRADICTS" ? "Contradicts" : "Context"}
                                    </span>
                                  </div>

                                  <p className="text-[14px] text-muted leading-relaxed">
                                    <span className="font-semibold text-foreground">Why it matters:</span> {surfacedReason}
                                  </p>

                                  {isToggled && (
                                    <div className="mt-3 pt-3 border-t border-border-default/45 space-y-3 animate-in fade-in duration-200">
                                      <p className="text-[14px] leading-relaxed text-muted italic border-l-2 border-border-default pl-3 font-serif bg-surface-soft/20 py-2 pr-2 rounded-r-lg">
                                        "{src.snippet}"
                                      </p>
                                      <div className="flex justify-between items-center text-[13px] font-sans">
                                        <span className="text-muted">Verification link:</span>
                                        <a
                                          href={src.url}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="inline-flex items-center gap-1 text-brand-primary hover:underline font-semibold"
                                        >
                                          Open original source <ExternalLink className="h-3.5 w-3.5" />
                                        </a>
                                      </div>
                                    </div>
                                  )}

                                  <div className="pt-1">
                                    <button
                                      onClick={() => handleToggleSourceDetails(src.source_id)}
                                      className="text-[13px] font-bold text-brand-primary hover:underline cursor-pointer"
                                    >
                                      {isToggled ? "Hide source details" : "See source details"}
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                        </div>
                      </div>
                    )}

                    {/* Reasoning fallacies */}
                    {thinkingData?.ai_lens?.reasoning_patterns && thinkingData.ai_lens.reasoning_patterns.length > 0 && (
                      <div className="space-y-3 pt-4 border-t border-border-default/50">
                        <span className="block text-[13px] uppercase font-bold text-muted tracking-wider">
                          Reasoning Patterns Identified
                        </span>
                        <div className="grid gap-4 md:grid-cols-2 font-serif text-[15px]">
                          {thinkingData.ai_lens.reasoning_patterns.map((pattern, idx) => (
                            <div key={idx} className="bg-white border border-border-default rounded-xl p-4 space-y-2">
                              <span className="inline-block text-[11px] font-sans font-bold text-brand-primary uppercase tracking-wider bg-indigo-50 border border-brand-primary/10 px-2 py-0.5 rounded">
                                {pattern.pattern_type}
                              </span>
                              <p className="text-[15px] font-bold text-foreground leading-snug">
                                {pattern.description}
                              </p>
                              <p className="text-[13px] text-muted leading-relaxed italic border-l border-border-default pl-2">
                                Potential concern: {pattern.potential_issue}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
          {renderNavButtons(3, 5, !evidenceMCQ)}
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────────────────────── */}
      {/* ── STEP 5: Moment 3 — Emotion + Framing ────────────────────────────────────── */}
      {/* ───────────────────────────────────────────────────────────────────────────── */}
      {activeStep === 5 && (
        <div className="rounded-2xl border border-border-default bg-surface-card p-6 md:p-8 shadow-sm space-y-6 animate-in fade-in duration-300">
          <div className="space-y-5">
            <div className="flex items-center gap-3 border-b border-border-default pb-4">
              <div className="h-7 w-7 rounded bg-brand-primary/5 border border-brand-primary/10 flex items-center justify-center text-brand-primary">
                <AlertCircle className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-[20px] font-bold text-foreground font-serif">Moment 3: Emotion & Framing</h3>
                <span className="text-[13px] text-muted">Detect emotional load and phrasing techniques</span>
              </div>
            </div>

            <p className="text-[18px] md:text-[20px] font-medium text-foreground">
              What stands out about the way this claim is written?
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {[
                { key: "fear", label: "Fear" },
                { key: "anger", label: "Anger" },
                { key: "excitement", label: "Excitement" },
                { key: "urgency", label: "Urgency" },
                { key: "certainty", label: "Certainty" },
                { key: "nothing", label: "Nothing unusual" },
                { key: "not_sure", label: "I'm not sure" }
              ].map((opt) => (
                <button
                  key={opt.key}
                  onClick={() => handleEmotionMCQ(opt.key)}
                  className={`py-3 px-4 rounded-xl border text-[13px] font-bold uppercase tracking-wider transition-all duration-200 cursor-pointer ${
                    emotionMCQ === opt.key
                      ? "bg-brand-primary border-brand-primary text-white shadow-sm"
                      : "bg-[#FAF8F5] border-border-default text-muted hover:border-brand-primary/30"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {emotionMCQ && (
              <div className="space-y-4 pt-4 border-t border-border-default/50 animate-in fade-in duration-300">
                <label htmlFor="emotion-written" className="block text-[14px] font-semibold text-foreground">
                  Any words or phrases that stood out to you? <span className="text-[12px] font-normal text-muted">(Optional)</span>
                </label>
                <input
                  id="emotion-written"
                  type="text"
                  value={emotionWritten}
                  onChange={(e) => {
                    setEmotionWritten(e.target.value);
                    saveState("em_written", e.target.value);
                  }}
                  placeholder="E.g., Words like 'breakout', 'shocking', 'urgent'..."
                  className="w-full rounded-xl border border-border-default bg-[#FAF8F5] px-4 py-2.5 text-[16px] text-foreground placeholder-muted/40 outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary/20"
                />

                <div className="space-y-4 pt-6 border-t border-border-default/50 animate-in fade-in duration-500">
                  <span className="block text-[13px] font-bold text-brand-primary uppercase tracking-wider">
                    What we noticed
                  </span>

                  {!emotion ? (
                    <div className="flex items-center gap-2.5 py-4 text-muted text-[14px]">
                      <Loader2 className="h-4.5 w-4.5 animate-spin text-brand-primary" />
                      <span>Analyzing the wording and emotional tone...</span>
                    </div>
                  ) : (
                    <div className="space-y-4 text-[16px] leading-relaxed text-muted font-serif">
                      <p>
                        The language of the claim has been examined for phrasing techniques designed to bypass verification.
                      </p>

                      <p>
                        Tone: <span className="font-sans font-bold text-foreground capitalize">{emotion.sentiment}</span>.{" "}
                        {emotion.sensationalism_score > 0.5 ? (
                          <span>
                            The text uses high emotional volume or sensational framing (estimated around{" "}
                            <span className="font-sans font-semibold text-foreground">
                              {Math.round(emotion.sensationalism_score * 100)}%
                            </span>{" "}
                            loaded terms) intended to provoke excitement, fear, or outrage.
                          </span>
                        ) : (
                          <span>
                            The wording is relatively calibrated and direct, presenting details without extra rhetorical inflation.
                          </span>
                        )}
                      </p>

                      <p>
                        Tactics:{" "}
                        {emotion.manipulative_language_detected ? (
                          <span className="font-sans font-semibold text-amber-700">
                            Urgency or sensational pressure was detected in the wording.
                          </span>
                        ) : (
                          <span className="font-sans font-semibold text-emerald-700">
                            Objective presentation style, free of artificial pressure triggers.
                          </span>
                        )}
                      </p>

                      {emotion.emotional_pressure_signals && emotion.emotional_pressure_signals.length > 0 && (
                        <div className="space-y-2 pt-2">
                          <span className="block text-[13px] font-sans font-bold text-muted uppercase tracking-wider">
                            Trigger words identified
                          </span>
                          <div className="flex flex-wrap gap-1.5 font-sans">
                            {emotion.emotional_pressure_signals.map((sig, idx) => (
                              <span
                                key={idx}
                                className="text-[13px] font-mono font-semibold text-red-700 bg-red-50 border border-red-100 px-2 py-0.5 rounded"
                              >
                                "{sig}"
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="bg-indigo-50/40 border border-brand-primary/10 rounded-xl p-4 text-[15px] font-sans">
                        <span className="font-bold text-brand-primary block mb-1">MIL Reflection Tip</span>
                        {emotion.sensationalism_score > 0.5
                          ? "High emotional framing is often a sign to pause—rhetoric is frequently used to override your analytical check."
                          : "Even with a measured tone, prioritizing primary source evidence remains the gold standard."}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
          {renderNavButtons(4, 6, !emotionMCQ)}
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────────────────────── */}
      {/* ── STEP 6: Take a Second Look ──────────────────────────────────────────────── */}
      {/* ───────────────────────────────────────────────────────────────────────────── */}
      {activeStep === 6 && (
        <div className="rounded-2xl border border-border-default bg-surface-card p-6 md:p-8 shadow-sm space-y-6 animate-in fade-in duration-300">
          <div className="space-y-5">
            <h3 className="text-[20px] font-bold text-foreground font-serif">Take a Second Look</h3>
            <span className="text-[13px] text-muted">Consolidated findings synthesized for objective evaluation</span>

            {!synthesis ? (
              <div className="flex items-center gap-2.5 py-4 text-muted text-[14px]">
                <Loader2 className="h-4.5 w-4.5 animate-spin text-brand-primary" />
                <span>Compiling the final research summary...</span>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="space-y-2">
                  <span className="text-[13px] uppercase font-bold text-muted block">Cross-Examination Summary</span>
                  <div className="text-[16px] leading-relaxed text-muted space-y-4 font-serif italic border-l-2 border-brand-primary pl-4 bg-indigo-50/10 py-3 pr-3 rounded-r-xl">
                    <p>{renderCitations(synthesis.what_we_found)}</p>
                  </div>
                </div>

                <div className="grid gap-6 md:grid-cols-2 border-t border-border-default/50 pt-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-1.5 text-amber-600">
                      <AlertTriangle className="h-4 w-4" />
                      <span className="font-bold text-[13px] uppercase tracking-wider text-foreground">
                        Signals to note
                      </span>
                    </div>
                    <p className="text-[16px] leading-relaxed text-muted">{synthesis.signals_to_notice}</p>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-1.5 text-brand-primary">
                      <HelpCircle className="h-4 w-4" />
                      <span className="font-bold text-[13px] uppercase tracking-wider text-foreground">
                        What remains uncertain
                      </span>
                    </div>
                    <p className="text-[16px] leading-relaxed text-muted">{synthesis.what_remains_uncertain}</p>
                  </div>
                </div>

                {/* Self check steps */}
                <div className="bg-[#FAF8F5] border border-border-default rounded-xl p-5 space-y-2">
                  <span className="block text-[13px] uppercase font-bold text-muted tracking-wider">
                    What you can check yourself
                  </span>
                  <p className="text-[16px] leading-relaxed text-muted whitespace-pre-line">
                    {synthesis.what_to_check_yourself}
                  </p>
                </div>
              </div>
            )}
          </div>
          {renderNavButtons(5, 7, false)}
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────────────────────── */}
      {/* ── STEP 7: Your Thinking Now ──────────────────────────────────────────────── */}
      {/* ───────────────────────────────────────────────────────────────────────────── */}
      {activeStep === 7 && (
        <div className="rounded-2xl border border-border-default bg-surface-card p-6 md:p-8 shadow-sm space-y-6 animate-in fade-in duration-300">
          <div className="space-y-5">
            <h3 className="text-[20px] font-bold text-foreground font-serif">Your Thinking Now</h3>
            <span className="text-[13px] text-muted">Compare reactions and explain your critical thoughts</span>

            <div className="space-y-2">
              <label className="block text-[16px] font-bold text-foreground">
                After looking closer, has your thinking changed?
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {[
                  { key: "more_confident", label: "More Confident" },
                  { key: "less_confident", label: "Less Confident" },
                  { key: "still_unsure", label: "Still Unsure" },
                  { key: "need_evidence", label: "Need Evidence" }
                ].map((opt) => (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => setPostReaction(opt.key)}
                    className={`py-3 px-4 rounded-xl border text-[13px] font-bold uppercase tracking-wider transition-all duration-200 cursor-pointer ${
                      postReaction === opt.key
                        ? "bg-brand-primary border-brand-primary text-white shadow-sm"
                        : "bg-background border-border-default text-muted hover:border-brand-primary/30"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="post-reflection-what-changed" className="block text-[14px] font-semibold text-foreground">
                What changed your thinking?
              </label>
              <textarea
                id="post-reflection-what-changed"
                rows={3}
                placeholder="E.g., Seeing that the original source has weak domain indicators, or noticing the urgent framing language..."
                value={reflectionText}
                onChange={(e) => setReflectionText(e.target.value)}
                className="w-full resize-none rounded-xl border border-border-default bg-[#FAF8F5] px-4 py-3 text-[16px] text-foreground placeholder-muted/40 outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary/20"
              />
            </div>

            {/* Before vs After Reaction comparison */}
            {initialReaction && postReaction && (
              <div className="bg-[#FAF8F5] border border-brand-primary/10 rounded-2xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4 select-none">
                <div className="text-center flex-1 space-y-1">
                  <span className="text-[11px] uppercase tracking-wider text-muted font-bold block">First Reaction</span>
                  <span className="text-[16px] font-bold text-foreground uppercase tracking-wide">
                    {getReactionLabel(initialReaction, "initial")}
                  </span>
                </div>
                <div className="h-8 w-8 bg-brand-primary/10 rounded-full flex items-center justify-center text-brand-primary shrink-0">
                  <ArrowRight className="h-4.5 w-4.5" />
                </div>
                <div className="text-center flex-1 space-y-1">
                  <span className="text-[11px] uppercase tracking-wider text-muted font-bold block">Thinking Now</span>
                  <span className="text-[16px] font-bold text-brand-primary uppercase tracking-wide">
                    {getReactionLabel(postReaction, "post")}
                  </span>
                </div>
              </div>
            )}
          </div>
          {renderNavButtons(6, 8, !postReaction || !reflectionText.trim(), handleReflectionSubmit)}
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────────────────────── */}
      {/* ── STEP 8: What Will You Do? ──────────────────────────────────────────────── */}
      {/* ───────────────────────────────────────────────────────────────────────────── */}
      {activeStep === 8 && (
        <div className="rounded-2xl border border-border-default bg-surface-card p-6 md:p-8 shadow-sm space-y-6 animate-in fade-in duration-300">
          <div className="space-y-5">
            <h3 className="text-[20px] font-bold text-foreground font-serif">Commit to a decision</h3>
            <span className="text-[13px] text-muted">What is your sharing response?</span>

            {/* Reminders checklist */}
            {thinkingData?.reminders && thinkingData.reminders.length > 0 && (
              <div className="space-y-2">
                <span className="block text-[11px] font-bold text-muted uppercase">Key Indicators Reminder</span>
                {thinkingData.reminders.map((reminder, idx) => {
                  const isWarning = reminder.type === "warning";
                  return (
                    <div
                      key={idx}
                      className={`flex gap-2.5 p-3 rounded-xl border text-[13px] leading-relaxed ${
                        isWarning
                          ? "border-amber-200 bg-amber-50/50 text-foreground"
                          : "border-emerald-200 bg-emerald-50/50 text-foreground"
                      }`}
                    >
                      {isWarning ? (
                        <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-amber-600" />
                      ) : (
                        <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5 text-emerald-600" />
                      )}
                      <span>{reminder.text}</span>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="space-y-4 pt-3 border-t border-border-default/50">
              <p className="text-[16px] font-bold text-foreground">You've looked closer. What would you do now?</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {[
                  { key: "wait_and_verify", label: "Wait & Verify" },
                  { key: "share_with_context", label: "Share with Context" },
                  { key: "not_share", label: "I would not share" },
                  { key: "still_unsure", label: "I'm still unsure" }
                ].map((opt) => (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => setShareDecision(opt.key)}
                    className={`py-3 px-4 rounded-xl border text-[13px] font-bold uppercase tracking-wider transition-all duration-200 cursor-pointer ${
                      shareDecision === opt.key
                        ? "bg-brand-primary border-brand-primary text-white shadow-sm"
                        : "bg-background border-border-default text-muted hover:border-brand-primary/30"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              {shareDecision && (
                <div className="space-y-3 pt-3 animate-in fade-in duration-300">
                  <label htmlFor="share-verif-text" className="block text-[13px] font-bold text-muted uppercase">
                    What would you want to verify or add before acting?{" "}
                    <span className="font-normal text-muted lowercase">(Optional)</span>
                  </label>
                  <textarea
                    id="share-verif-text"
                    rows={2}
                    value={shareVerificationText}
                    onChange={(e) => setShareVerificationText(e.target.value)}
                    placeholder="E.g., I want to check for primary studies on this topic, wait for official confirmations..."
                    className="w-full resize-none rounded-xl border border-border-default bg-[#FAF8F5] px-4 py-3 text-[16px] text-foreground placeholder-muted/40 outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary/20"
                  />
                </div>
              )}
            </div>
          </div>
          {renderNavButtons(7, 9, !shareDecision, () => {
            if (shareDecision) handleShareDecisionSubmit(shareDecision);
          })}
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────────────────────── */}
      {/* ── STEP 9: Thinking Replay & Summary ──────────────────────────────────────── */}
      {/* ───────────────────────────────────────────────────────────────────────────── */}
      {activeStep === 9 && (
        <div className="space-y-8 animate-in fade-in duration-700">
          <div className="rounded-2xl border border-border-default bg-surface-card p-6 md:p-8 shadow-sm space-y-6 relative">
            <div className="flex items-center gap-3 border-b border-border-default pb-4">
              <div className="h-7 w-7 rounded bg-brand-primary/5 border border-brand-primary/10 flex items-center justify-center text-brand-primary">
                <BookOpen className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-[20px] font-bold text-foreground font-serif">Your Learning Record</h3>
                <span className="text-[13px] text-muted">Summary replay of your critical thinking journey</span>
              </div>
            </div>

            <div className="space-y-6 pl-4 relative border-l border-border-default/80">
              {/* Step 1 Replay */}
              <div className="space-y-1 relative animate-in fade-in duration-300">
                <div className="absolute -left-[23px] top-1 h-3 w-3 rounded-full bg-emerald-600 border-2 border-white" />
                <span className="text-[11px] font-bold uppercase tracking-wider text-muted block">You Started</span>
                <p className="text-[16px] text-foreground leading-relaxed">
                  You read the claim and initially felt:{" "}
                  <span className="font-bold text-brand-primary">{getReactionLabel(initialReaction, "initial")}</span>
                </p>
                {initialExplanation && <p className="text-[15px] text-muted italic">"{initialExplanation}"</p>}
              </div>

              {/* Step 2 Replay */}
              <div className="space-y-1 relative animate-in fade-in duration-300 delay-100">
                <div className="absolute -left-[23px] top-1 h-3 w-3 rounded-full bg-emerald-600 border-2 border-white" />
                <span className="text-[11px] font-bold uppercase tracking-wider text-muted block">You Paused</span>
                <p className="text-[16px] text-foreground leading-relaxed">
                  You paused and reflected on alternative explanations:
                </p>
                <p className="text-[15px] text-muted italic">"{pauseResponse || "Reflected quietly."}"</p>
              </div>

              {/* Step 3, 4, 5 Replay */}
              <div className="space-y-1 relative animate-in fade-in duration-300 delay-200">
                <div className="absolute -left-[23px] top-1 h-3 w-3 rounded-full bg-emerald-600 border-2 border-white" />
                <span className="text-[11px] font-bold uppercase tracking-wider text-muted block">You Examined</span>
                <p className="text-[16px] text-foreground leading-relaxed">
                  You investigated the source context, evidence, and emotional wording signals.
                </p>
                <ul className="text-[14px] text-muted space-y-1 list-disc pl-4 pt-1">
                  <li>
                    Publisher:{" "}
                    <span className="font-semibold text-foreground">
                      {source?.domains?.[0]?.domain || "Not specified"}
                    </span>
                  </li>
                  <li>
                    Evidence base: {evidence?.sources?.length || 0} retrieved document consensus statements checked.
                  </li>
                  <li>
                    Wording style:{" "}
                    {emotion?.sensationalism_score
                      ? (emotion.sensationalism_score > 0.5 ? "Urgent / loaded phrasing style" : "Objective phrasing style")
                      : "Checked tone"}
                  </li>
                </ul>
              </div>

              {/* Step 7 Replay */}
              <div className="space-y-1 relative animate-in fade-in duration-300 delay-300">
                <div className="absolute -left-[23px] top-1 h-3 w-3 rounded-full bg-emerald-600 border-2 border-white" />
                <span className="text-[11px] font-bold uppercase tracking-wider text-muted block">You Reconsidered</span>
                <p className="text-[16px] text-foreground leading-relaxed">
                  After exploring the detailed evidence, you felt:{" "}
                  <span className="font-bold text-brand-primary">{getReactionLabel(postReaction, "post")}</span>
                </p>
                {reflectionText && <p className="text-[15px] text-muted italic">"{reflectionText}"</p>}
              </div>

              {/* Step 8 Replay */}
              <div className="space-y-1 relative animate-in fade-in duration-300 delay-400">
                <div className="absolute -left-[23px] top-1 h-3 w-3 rounded-full bg-emerald-600 border-2 border-white" />
                <span className="text-[11px] font-bold uppercase tracking-wider text-muted block">You Decided</span>
                <p className="text-[16px] text-foreground leading-relaxed font-bold text-emerald-700">
                  Sharing action: {getReactionLabel(shareDecision, "decision")}
                </p>
                {shareVerificationText && (
                  <p className="text-[15px] text-muted italic">"{shareVerificationText}"</p>
                )}
              </div>
            </div>
          </div>

          {/* Thinking questions */}
          {thinkingData?.thinking_questions && thinkingData.thinking_questions.length > 1 && (
            <div className="space-y-3">
              <span className="text-[13px] font-bold uppercase tracking-wider text-muted">Keep thinking</span>
              <div className="grid gap-4 sm:grid-cols-2">
                {thinkingData.thinking_questions.slice(1).map((q, idx) => (
                  <div
                    key={idx}
                    className="bg-surface-card border border-border-default rounded-2xl p-5 space-y-3 shadow-xs flex flex-col justify-between"
                  >
                    <div className="space-y-1.5">
                      <span className="inline-block text-[11px] uppercase font-bold tracking-widest text-brand-primary bg-indigo-50 px-2 py-0.5 rounded">
                        {q.category}
                      </span>
                      <p className="text-[16px] font-bold text-foreground leading-snug font-serif">
                        "{q.question_text}"
                      </p>
                    </div>
                    <p className="text-[13px] text-muted leading-relaxed pt-2 border-t border-border-default/50 mt-3">
                      {q.rationale}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Restart workbook */}
          <div className="text-center pt-4 select-none">
            <button
              onClick={() => {
                if (window.confirm("Do you want to clear your responses and restart this thinking workbook?")) {
                  try {
                    localStorage.removeItem(`st_step_${data.session_id}`);
                    localStorage.removeItem(`st_init_react_${data.session_id}`);
                    localStorage.removeItem(`st_init_expl_${data.session_id}`);
                    localStorage.removeItem(`st_pause_${data.session_id}`);

                    localStorage.removeItem(`st_src_ctx_mcq_${data.session_id}`);
                    localStorage.removeItem(`st_ev_mcq_${data.session_id}`);
                    localStorage.removeItem(`st_reas_mcq_${data.session_id}`);
                    localStorage.removeItem(`st_em_mcq_${data.session_id}`);
                    localStorage.removeItem(`st_em_written_${data.session_id}`);

                    localStorage.removeItem(`st_post_react_${data.session_id}`);
                    localStorage.removeItem(`st_reflect_text_${data.session_id}`);
                    localStorage.removeItem(`st_share_verif_${data.session_id}`);
                    localStorage.removeItem(`st_share_decision_${data.session_id}`);
                  } catch {}
                  setInitialReaction(null);
                  setInitialExplanation("");
                  setPauseResponse("");

                  setSourceContextMCQ(null);
                  setEvidenceMCQ(null);
                  setReasoningMCQ(null);
                  setEmotionMCQ(null);
                  setEmotionWritten("");

                  setPostReaction(null);
                  setReflectionText("");
                  setShareDecision(null);
                  setReflectionSubmitted(false);
                  setShareDecisionSubmitted(false);
                  setShareVerificationText("");
                  setEvidenceExpanded(false);
                  setActiveStep(1);
                }
              }}
              className="inline-flex items-center gap-2 text-[14px] font-semibold text-muted hover:text-foreground transition-colors cursor-pointer"
            >
              <RefreshCw className="h-3.5 w-3.5" /> Restart thinking exercises
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
