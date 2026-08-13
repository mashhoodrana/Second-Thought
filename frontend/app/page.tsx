"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  Search,
  ShieldCheck,
  Compass,
  AlertCircle,
  ArrowRight,
  HelpCircle,
  CheckCircle2,
  Lock
} from "lucide-react";

export default function HomePage() {
  return (
    <div className="bg-background text-foreground min-h-screen select-none font-sans">
      {/* Background Accent */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden z-0">
        <div className="absolute -top-48 left-1/2 h-[600px] w-[600px] -translate-x-1/2 rounded-full bg-brand-primary/5 blur-[120px]" />
      </div>

      {/* Hero Section */}
      <section className="relative z-10 mx-auto max-w-5xl px-6 pb-20 pt-20 text-center md:pt-28 space-y-10">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="space-y-6 max-w-3xl mx-auto"
        >
          <h1 className="text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl md:text-6.5xl text-foreground font-serif">
            Think Before You Trust.
            <br />
            <span className="text-brand-primary italic font-medium">Learn Before You Share.</span>
          </h1>
          
          <p className="text-lg md:text-xl text-muted max-w-2xl mx-auto leading-relaxed font-sans font-light">
            Second Thought is not an AI that tells you what to believe. It is a guided critical-thinking environment designed to help you slow down, investigate context, and make your own ethical judgments.
          </p>
        </motion.div>

        {/* Action Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.15 }}
          className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center"
        >
          <Link
            href="/register"
            id="hero-get-started-btn"
            className="group flex items-center gap-2.5 rounded-xl bg-brand-primary hover:bg-brand-hover px-8 py-4 text-sm font-bold text-white shadow-md transition-all duration-200 cursor-pointer"
          >
            Start your first investigation
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Link>
          <Link
            href="#why-it-matters"
            className="rounded-xl border border-border-default bg-surface-card px-8 py-4 text-sm font-bold text-muted hover:text-foreground hover:bg-surface-soft transition-all duration-200 shadow-sm"
          >
            See how it works
          </Link>
        </motion.div>
      </section>

      {/* Visual Comparison Section (Impulsive vs Critical Thinking) */}
      <section id="why-it-matters" className="relative z-10 border-t border-border-default bg-surface-card py-24">
        <div className="mx-auto max-w-5xl px-6 space-y-16">
          <div className="text-center space-y-4">
            <h2 className="text-3xl font-bold tracking-tight text-foreground font-serif sm:text-4xl">
              Information moves faster than reflection.
            </h2>
            <p className="text-sm font-semibold uppercase tracking-wider text-muted max-w-md mx-auto">
              How do you process what you see online?
            </p>
          </div>

          {/* Interactive Contrast Flow */}
          <div className="grid md:grid-cols-2 gap-10 max-w-4xl mx-auto pt-4">
            
            {/* The Fast Impulse Loop */}
            <div className="bg-background border border-border-default rounded-2xl p-8 flex flex-col justify-between space-y-8 shadow-sm">
              <div className="space-y-3">
                <div className="inline-flex items-center gap-2 rounded-full bg-signal-danger/10 border border-signal-danger/25 px-3 py-1 text-[11px] font-bold tracking-wider text-signal-danger uppercase">
                  The Impulse Loop
                </div>
                <h3 className="text-lg font-bold text-foreground">Immediate sharing by default</h3>
                <p className="text-sm text-muted leading-relaxed">
                  Sensational headlines trigger immediate emotional responses. Without a pause, false claims spread instantly.
                </p>
              </div>
              <div className="flex items-center justify-center gap-3 pt-6 border-t border-border-default/50 text-xs font-mono text-muted">
                <span className="bg-surface-card border border-border-default px-3 py-2 rounded-lg text-foreground font-semibold">1. SEE</span>
                <ArrowRight className="h-4.5 w-4.5 text-muted/40" />
                <span className="bg-surface-card border border-border-default px-3 py-2 rounded-lg text-foreground font-semibold">2. FEEL</span>
                <ArrowRight className="h-4.5 w-4.5 text-muted/40" />
                <span className="bg-signal-danger text-white px-3 py-2 rounded-lg font-bold">3. SHARE</span>
              </div>
            </div>

            {/* The Second Thought Guided Path */}
            <div className="bg-background border border-brand-primary/20 rounded-2xl p-8 flex flex-col justify-between space-y-8 shadow-md relative">
              <div className="space-y-3">
                <div className="inline-flex items-center gap-2 rounded-full bg-brand-primary/10 border border-brand-primary/20 px-3 py-1 text-[11px] font-bold tracking-wider text-brand-primary uppercase">
                  The Second Thought Path
                </div>
                <h3 className="text-lg font-bold text-foreground">Slowing down to examine</h3>
                <p className="text-sm text-muted leading-relaxed">
                  By introducing critical milestones, you learn to spot logical flaws, verify sources, and evaluate context before sharing.
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-2 pt-6 border-t border-border-default/50 text-xs font-mono text-muted">
                <span className="bg-surface-card border border-border-default px-2.5 py-1.5 rounded text-foreground font-medium">Claim</span>
                <ArrowRight className="h-3.5 w-3.5 text-muted/40" />
                <span className="bg-brand-primary text-white px-2.5 py-1.5 rounded font-bold">Pause</span>
                <ArrowRight className="h-3.5 w-3.5 text-muted/40" />
                <span className="bg-surface-card border border-border-default px-2.5 py-1.5 rounded text-foreground font-medium">Examine</span>
                <ArrowRight className="h-3.5 w-3.5 text-muted/40" />
                <span className="bg-brand-primary text-white px-2.5 py-1.5 rounded font-bold">Reflect</span>
                <ArrowRight className="h-3.5 w-3.5 text-muted/40" />
                <span className="bg-signal-success text-white px-2.5 py-1.5 rounded font-bold">Decide</span>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Editorial Process Visualization */}
      <section id="how-it-works" className="py-24 border-t border-border-default bg-background relative overflow-hidden">
        <div className="mx-auto max-w-5xl px-6">
          <div className="max-w-xl mx-auto text-center space-y-4 mb-16">
            <h2 className="text-3xl font-bold tracking-tight text-foreground font-serif sm:text-4xl">
              How Second Thought Works
            </h2>
            <p className="text-sm text-muted leading-relaxed">
              We guide you through a deliberate, structured sequence designed to interrupt impulse sharing.
            </p>
          </div>
          
          <div className="relative flex flex-col md:flex-row items-center justify-between gap-8 md:gap-4 max-w-4xl mx-auto py-8">
            {/* Connected path line behind */}
            <div className="absolute top-1/2 left-6 right-6 h-0.5 bg-border-default/70 -translate-y-1/2 hidden md:block z-0" />
            
            {[
              { num: "1", label: "SEE", desc: "Encounter a post, claim, or image" },
              { num: "2", label: "PAUSE", desc: "Capture your first reaction" },
              { num: "3", label: "EXAMINE", desc: "Explore sources, timeline & tone" },
              { num: "4", label: "REFLECT", desc: "Notice details, compare reactions" },
              { num: "5", label: "DECIDE", desc: "Commit to your sharing choice" }
            ].map((step, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: idx * 0.1 }}
                className="relative z-10 flex flex-col items-center text-center space-y-3 bg-surface-card border border-border-default px-5 py-6 rounded-2xl w-44 shadow-sm hover:border-brand-primary/20 transition-all group"
              >
                {/* Visual Typographic Circle Marker */}
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-background border border-border-default text-brand-primary font-mono font-bold text-sm shadow-2xs group-hover:bg-brand-primary group-hover:text-white group-hover:border-brand-primary transition-all duration-300">
                  {step.num}
                </div>
                <div className="space-y-1">
                  <span className="block text-xs font-bold tracking-wider text-foreground font-sans uppercase">
                    {step.label}
                  </span>
                  <span className="block text-[11px] text-muted leading-snug">
                    {step.desc}
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Realistic Product Showcase */}
      <section className="py-24 border-t border-border-default">
        <div className="mx-auto max-w-5xl px-6 space-y-16">
          <div className="text-center space-y-4 max-w-xl mx-auto">
            <h2 className="text-3xl font-bold tracking-tight text-foreground font-serif sm:text-4xl">
              Step inside the critical thinking room
            </h2>
            <p className="text-sm text-muted leading-relaxed">
              Second Thought guides you through a structured sequence. We don't judge the truth; we provide the lenses.
            </p>
          </div>

          {/* Interactive Workspace Preview */}
          <div className="border border-border-default bg-surface-card rounded-2xl p-6 md:p-8 shadow-lg max-w-2xl mx-auto space-y-8">
            <div className="flex items-center justify-between border-b border-border-default pb-4">
              <div className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-full bg-red-400" />
                <span className="h-3 w-3 rounded-full bg-yellow-400" />
                <span className="h-3 w-3 rounded-full bg-green-400" />
              </div>
              <span className="text-[10px] font-bold text-brand-primary uppercase tracking-widest bg-brand-primary/5 border border-brand-primary/10 px-2.5 py-1 rounded">
                Interactive Walkthrough Preview
              </span>
            </div>

            {/* Step 1: Claim */}
            <div className="space-y-2">
              <span className="text-[10px] font-bold tracking-wider text-muted uppercase">1. Under Examination</span>
              <div className="bg-background rounded-xl p-4 border border-border-default">
                <p className="text-sm font-medium italic border-l-2 border-brand-primary pl-3 text-foreground leading-relaxed">
                  "Officials claim a newly found deep-sea trench has ancient ruins showing warning signals of rapid thermal shift."
                </p>
              </div>
            </div>

            {/* Step 2: Reactions */}
            <div className="space-y-3">
              <span className="text-[10px] font-bold tracking-wider text-brand-primary uppercase block">2. First Reaction captured</span>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-3 border border-brand-primary/20 bg-brand-primary/5 text-brand-primary rounded-xl font-semibold text-center uppercase tracking-wider">
                  I Doubted It
                </div>
                <div className="p-3 border border-border-default bg-[#FAF8F5] text-muted/50 rounded-xl font-semibold text-center uppercase tracking-wider line-through">
                  I Believed It
                </div>
              </div>
              <p className="text-xs text-muted leading-relaxed">
                Rationale: <span className="italic text-foreground">"The claim sounds like a clickbait sci-fi headline designed to grab clicks."</span>
              </p>
            </div>

            {/* Step 3: Lenses */}
            <div className="space-y-3">
              <span className="text-[10px] font-bold tracking-wider text-muted uppercase">3. What you inspect together</span>
              
              <div className="space-y-2">
                {/* Source */}
                <div className="bg-background border border-border-default rounded-xl p-4 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                      <Search className="h-3.5 w-3.5 text-brand-primary" /> Source Lens
                    </span>
                    <span className="text-[10px] text-brand-primary font-mono font-bold bg-brand-primary/5 px-2 py-0.5 rounded border border-brand-primary/10">
                      Editorial Reputation Evaluated
                    </span>
                  </div>
                  <p className="text-xs text-muted leading-relaxed">
                    Look for the publisher details. We search for known scientific publishers vs fringe outlets.
                  </p>
                </div>

                {/* Emotion */}
                <div className="bg-background border border-border-default rounded-xl p-4 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                      <AlertCircle className="h-3.5 w-3.5 text-brand-primary" /> Emotion Lens
                    </span>
                    <span className="text-[10px] text-signal-warning font-mono font-bold bg-amber-50 px-2 py-0.5 rounded border border-signal-warning/10">
                      High Sensationalism Detected
                    </span>
                  </div>
                  <p className="text-xs text-muted leading-relaxed">
                    Check if words push you to feel scared or excited instead of presenting clinical facts.
                  </p>
                </div>
              </div>
            </div>

            {/* Step 4: Replay comparison */}
            <div className="border-t border-border-default pt-4 space-y-2">
              <span className="text-[10px] font-bold tracking-wider text-brand-primary uppercase block">4. Reflection Payoff</span>
              <div className="bg-surface-soft/40 border border-brand-primary/10 rounded-xl p-4 flex justify-between items-center">
                <div className="text-center flex-1">
                  <span className="text-[9px] uppercase tracking-wider text-muted block">First Reaction</span>
                  <span className="text-xs font-bold text-foreground">Doubted It</span>
                </div>
                <ArrowRight className="h-4 w-4 text-brand-primary shrink-0" />
                <div className="text-center flex-1">
                  <span className="text-[9px] uppercase tracking-wider text-muted block">Thinking Now</span>
                  <span className="text-xs font-bold text-brand-primary">Less Confident (Confirmed Gaps)</span>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Method details */}
      <section className="py-24 border-t border-border-default bg-surface-card">
        <div className="mx-auto max-w-5xl px-6 space-y-16">
          <div className="text-center space-y-4 max-w-xl mx-auto">
            <h2 className="text-3xl font-bold tracking-tight text-foreground font-serif sm:text-4xl">
              Five structured perspectives
            </h2>
            <p className="text-sm text-muted leading-relaxed">
              Critical evaluation requires shifting viewpoints. We isolate these to prevent cognitive overwhelm.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-5 max-w-5xl mx-auto">
            {[
              { icon: Search, name: "Source", sub: "Inspect the origin", desc: "Evaluate who published the claim and verify their domain credentials." },
              { icon: ShieldCheck, name: "Evidence", sub: "Analyze backing", desc: "Compare supporting and contradicting statements from web consensus." },
              { icon: AlertCircle, name: "Emotion", sub: "Check the volume", desc: "Observe sensational phrasing and click-inducement patterns." },
              { icon: Compass, name: "Context", sub: "Examine scope", desc: "Understand missing geographic, political, and temporal aspects." },
              { icon: HelpCircle, name: "Reasoning & Logic", sub: "Spot logic traps", desc: "Examine arguments for cognitive biases or complete false binaries." }
            ].map((lens, idx) => {
              const Icon = lens.icon;
              return (
                <div key={idx} className="bg-background border border-border-default rounded-xl p-5 space-y-4 flex flex-col justify-between shadow-sm">
                  <div className="space-y-2">
                    <div className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-brand-primary/5 text-brand-primary border border-brand-primary/10">
                      <Icon className="h-4.5 w-4.5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">{lens.name}</h4>
                      <span className="text-[10px] font-semibold text-brand-primary block pt-0.5">{lens.sub}</span>
                    </div>
                  </div>
                  <p className="text-xs text-muted leading-relaxed">{lens.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* MIL Philosophy Callout */}
      <section className="py-24 border-t border-border-default">
        <div className="mx-auto max-w-4xl px-6 space-y-10">
          <div className="text-center space-y-4">
            <h2 className="text-3xl font-bold tracking-tight text-foreground font-serif">
              An Educational Workbook, Not a Verdict
            </h2>
            <p className="text-sm text-muted max-w-xl mx-auto leading-relaxed">
              We align with global Media and Information Literacy frameworks. In a world where AI algorithms decide what you see, Second Thought gives you the control back to decide how you think.
            </p>
          </div>

          <div className="bg-surface-card border border-border-default rounded-2xl p-8 max-w-2xl mx-auto space-y-6 shadow-sm">
            <h3 className="text-sm font-bold uppercase tracking-wider text-center text-foreground border-b border-border-default pb-4">
              Our Core Rules
            </h3>
            <div className="grid gap-6 sm:grid-cols-2 text-xs leading-relaxed text-muted">
              <div className="space-y-1">
                <span className="font-bold text-foreground block">No Binary Verdicts</span>
                <p>We will never label a claim as simply "True" or "Fake" or assign a truth percentage.</p>
              </div>
              <div className="space-y-1">
                <span className="font-bold text-foreground block">Human-in-the-Loop</span>
                <p>We retrieve context and search results, but you make the final decision to trust or share.</p>
              </div>
              <div className="space-y-1">
                <span className="font-bold text-foreground block">Structured Slow Down</span>
                <p>By forcing interactive reflection, the system interrupts immediate sharing reflexes.</p>
              </div>
              <div className="space-y-1">
                <span className="font-bold text-foreground block">Traceable Citations</span>
                <p>Every claim made by the platform traces back to a retrieved document and publisher.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA Strip */}
      <section className="mx-auto max-w-4xl px-6 pb-28 pt-8">
        <div className="relative overflow-hidden rounded-2xl border border-border-default bg-surface-card p-12 text-center shadow-sm">
          <h2 className="text-2xl font-bold text-foreground font-serif">
            Slow down. Verify first.
          </h2>
          <p className="mt-3 text-xs text-muted max-w-sm mx-auto leading-relaxed">
            Create a workspace account to submit claims, explore analytical lenses, and build critical checking habits.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row justify-center gap-3">
            <Link
              href="/register"
              id="cta-get-started-btn"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-primary hover:bg-brand-hover px-8 py-3.5 text-xs font-bold text-white shadow-sm transition-all duration-200 cursor-pointer"
            >
              Get started free
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-border-default bg-background px-8 py-3.5 text-xs font-semibold text-muted hover:text-foreground hover:bg-surface-soft transition-all duration-200"
            >
              <Lock className="h-3.5 w-3.5" /> Sign in to workspace
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
