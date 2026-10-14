"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRole, Role } from "@/lib/roles";
import { formatShortAddress } from "@/lib/format";
import { GlassButton } from "@/components/GlassButton";
import { makeExplorerUrl, StepItem } from "@/components/StepStatus";

export interface ChecklistStep {
  number: string;
  label: string;
  status: "done" | "next" | "waiting";
  targetCardId: string;
}

export interface RolePageProps {
  role: Role | "audit";
  roleTitle: string;
  breadcrumbLabel: string;
  titleQuestion: string;
  whatYouCanDo: string;
  checklist: ChecklistStep[];
  nextStepText: string;
  roleDescription: string;
  children: React.ReactNode;
}

export function RolePage({
  role,
  roleTitle,
  breadcrumbLabel,
  titleQuestion,
  whatYouCanDo,
  checklist,
  nextStepText,
  roleDescription,
  children,
}: RolePageProps) {
  const { keypairs, activeKeypair, balances, fundAll, loading, ready } = useRole();

  const [copied, setCopied] = useState(false);
  const [funding, setFunding] = useState(false);
  const [fundToast, setFundToast] = useState<{ type: "ok" | "err"; message: string } | null>(null);

  const address = ready && activeKeypair ? activeKeypair.publicKey.toBase58() : null;
  const shortAddress = ready && address ? formatShortAddress(address, 4) : "----";
  const balanceVal = ready && role !== "audit" ? balances[role as Role] ?? 0 : null;

  const handleCopy = async () => {
    if (!address) return;
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // fallback
    }
  };

  const handleFund = async () => {
    if (!ready || funding || loading) return;
    setFunding(true);
    setFundToast(null);
    try {
      await fundAll(5);
      setFundToast({ type: "ok", message: "Airdropped 5 SOL to role wallets." });
      setTimeout(() => setFundToast(null), 4000);
    } catch (err: any) {
      setFundToast({ type: "err", message: err?.message || "Failed to fund wallets." });
      setTimeout(() => setFundToast(null), 5000);
    } finally {
      setFunding(false);
    }
  };

  const handleScrollToCard = (targetId: string) => {
    const el = document.getElementById(targetId);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <div className="relative min-h-[calc(100vh-65px)] bg-[#fffdf6] py-8 px-4 sm:px-6 lg:px-8 overflow-hidden">
      {/* 3 Fixed Decorative Blurred Blobs (inner routes only) */}
      <div
        aria-hidden="true"
        className="fixed pointer-events-none select-none z-0 top-[-60px] left-[-60px] w-[460px] h-[460px] bg-[#fff1a8] opacity-55 rounded-full blur-[90px]"
      />
      <div
        aria-hidden="true"
        className="fixed pointer-events-none select-none z-0 top-[25%] right-[-80px] w-[500px] h-[500px] bg-[#ffe3ee] opacity-50 rounded-full blur-[90px]"
      />
      <div
        aria-hidden="true"
        className="fixed pointer-events-none select-none z-0 bottom-[-40px] left-[20%] w-[480px] h-[480px] bg-[#fff8d6] opacity-65 rounded-full blur-[90px]"
      />

      <div className="relative z-10 max-w-[1140px] mx-auto space-y-8">
        
        {/* ======================================================== */}
        {/* HEADER                                                   */}
        {/* ======================================================== */}
        <header className="space-y-4">
          {/* Pill Breadcrumb */}
          <nav aria-label="Breadcrumb">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white border border-[rgba(27,31,42,0.08)] shadow-xs text-xs font-headline font-semibold text-[#6b7280]">
              <Link href="/" className="hover:text-[#1b1f2a]">
                Home
              </Link>
              <span className="text-[#9ca3af]">/</span>
              <span className="text-[#1b1f2a] font-bold">{breadcrumbLabel}</span>
            </div>
          </nav>

          {/* Title as a plain question + one line helper */}
          <div className="space-y-1.5 max-w-3xl">
            <h1 className="font-headline text-3xl sm:text-4xl lg:text-5xl font-extrabold text-[#1b1f2a] tracking-tight leading-[1.05]">
              {titleQuestion}
            </h1>
            <p className="text-sm sm:text-base text-[#6b7280] font-body leading-relaxed">
              <span className="font-semibold text-[#1b1f2a]">What you can do here: </span>
              {whatYouCanDo}
            </p>
          </div>

          {/* Progress Checklist (Horizontal row of step chips, wraps on mobile) */}
          <div className="pt-2">
            <div className="flex flex-wrap items-center gap-2.5">
              {checklist.map((step) => {
                let statusClasses = "bg-white/80 text-[#6b7280] border-[rgba(27,31,42,0.1)]";
                let statusBadge = "Waiting";
                let badgeClass = "bg-gray-100 text-[#6b7280]";

                if (step.status === "done") {
                  statusClasses = "bg-[#e3f6e9] text-[#17803d] border-[#c6edd1]";
                  statusBadge = "Done";
                  badgeClass = "bg-[#17803d] text-white";
                } else if (step.status === "next") {
                  statusClasses = "bg-[#fff1cc] text-[#8a5a00] border-[#fde293] font-bold shadow-xs ring-2 ring-[#f9c933]/40";
                  statusBadge = "Next";
                  badgeClass = "bg-[#f9c933] text-[#1b1f2a]";
                }

                return (
                  <button
                    key={step.number}
                    type="button"
                    onClick={() => handleScrollToCard(step.targetCardId)}
                    className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border text-xs font-headline transition-all cursor-pointer hover:brightness-95 ${statusClasses}`}
                    title={`Click to scroll to step ${step.number}`}
                  >
                    <span className="font-mono font-bold">{step.number}</span>
                    <span>{step.label}</span>
                    <span className={`text-[10px] uppercase font-bold px-1.5 py-0.2 rounded-full ${badgeClass}`}>
                      {statusBadge}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </header>

        {/* ======================================================== */}
        {/* BODY: TWO COLUMNS (Main 2/3, Side 1/3 sticky)            */}
        {/* ======================================================== */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-8 items-start">
          
          {/* Mobile Side Panel: Compact summary displayed first on mobile */}
          <div className="block lg:hidden">
            <div className="soft-card p-4 space-y-3 bg-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`role-dot ${ready ? "role-dot-active" : "role-dot-inactive"}`} />
                  <span className="font-headline font-bold text-sm text-[#1b1f2a]">
                    Acting as {roleTitle}
                  </span>
                </div>
                <div className="font-mono text-xs text-[#6b7280]">
                  {balanceVal !== null ? `${balanceVal.toFixed(2)} SOL` : "----"}
                </div>
              </div>

              <div className="flex items-center justify-between text-xs font-mono text-[#6b7280] bg-[#fffdf6] p-2 rounded-lg border border-[rgba(27,31,42,0.06)]">
                <span>{shortAddress}</span>
                <button
                  onClick={handleCopy}
                  className="font-bold text-[#8a5a00] hover:underline"
                >
                  {copied ? "Copied" : "Copy"}
                </button>
              </div>

              <div className="text-xs bg-[#fff8d6] p-2 rounded-lg border border-[#fde293] text-[#8a5a00]">
                <span className="font-bold">Next: </span>
                {nextStepText}
              </div>

              <GlassButton
                variant="secondary"
                size="sm"
                onClick={handleFund}
                loading={funding}
                className="w-full text-xs"
              >
                Fund Wallets (+5 SOL)
              </GlassButton>
            </div>
          </div>

          {/* MAIN COLUMN: Stack of Step Cards */}
          <main className="space-y-6">
            {children}
          </main>

          {/* DESKTOP SIDE PANEL (Sticky, 24px radius flat white card) */}
          <aside className="hidden lg:block sticky top-[84px] space-y-4">
            <div className="soft-card p-6 space-y-5 bg-white">
              {/* Section 1: You are acting as */}
              <div className="space-y-2">
                <div className="text-[11px] font-headline font-bold uppercase tracking-wider text-[#6b7280]">
                  You are acting as
                </div>
                <div className="flex items-center gap-2.5">
                  <span className={`role-dot ${ready ? "role-dot-active" : "role-dot-inactive"}`} />
                  <h2 className="font-headline text-lg font-bold text-[#1b1f2a]">
                    {roleTitle}
                  </h2>
                </div>
                <p className="text-xs text-[#6b7280] font-body leading-relaxed">
                  {roleDescription}
                </p>
              </div>

              {/* Hairline Divider */}
              <div className="border-t border-[rgba(27,31,42,0.08)]" />

              {/* Section 2: Wallet Details */}
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#6b7280]">Wallet Address</span>
                  <div className="flex items-center gap-1.5 font-mono">
                    <span className="font-bold text-[#1b1f2a]">{shortAddress}</span>
                    <button
                      type="button"
                      onClick={handleCopy}
                      disabled={!ready || !address}
                      className="text-[10px] font-headline font-bold uppercase text-[#8a5a00] hover:text-[#1b1f2a] px-1.5 py-0.5 rounded bg-white border border-[rgba(27,31,42,0.08)] disabled:opacity-40"
                    >
                      {copied ? "Copied" : "Copy"}
                    </button>
                  </div>
                </div>

                {role !== "audit" && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[#6b7280]">Balance</span>
                    <span className="font-headline font-bold text-[#1b1f2a]">
                      {balanceVal !== null ? `${balanceVal.toFixed(2)} SOL` : "----"}
                    </span>
                  </div>
                )}

                <GlassButton
                  variant="secondary"
                  size="sm"
                  onClick={handleFund}
                  loading={funding}
                  className="w-full text-xs"
                >
                  Fund Wallets (+5 SOL)
                </GlassButton>
              </div>

              {/* Hairline Divider */}
              <div className="border-t border-[rgba(27,31,42,0.08)]" />

              {/* Section 3: Next Step Box */}
              <div className="p-3.5 rounded-[16px] bg-[#fff8d6] border border-[#fde293] space-y-1">
                <div className="text-[11px] font-headline font-bold text-[#8a5a00] uppercase tracking-wider">
                  Next step
                </div>
                <p className="text-xs text-[#1b1f2a] font-medium leading-snug">
                  {nextStepText}
                </p>
              </div>
            </div>
          </aside>

        </div>

      </div>

      {/* Toast Feedback for Fund Wallets */}
      {fundToast && (
        <div
          className={`fixed bottom-6 right-6 z-50 p-4 rounded-2xl border shadow-[0_12px_32px_rgba(27,31,42,0.12)] text-xs font-medium flex items-center space-x-2 bg-white ${
            fundToast.type === "ok"
              ? "border-[#17803d]/30 text-[#17803d]"
              : "border-[#b42318]/30 text-[#b42318]"
          }`}
        >
          <span
            className={`w-2 h-2 rounded-full shrink-0 ${
              fundToast.type === "ok" ? "bg-[#17803d]" : "bg-[#b42318]"
            }`}
          />
          <span>{fundToast.message}</span>
        </div>
      )}
    </div>
  );
}

/* ==================================================================== */
/* STEP CARD COMPONENT                                                  */
/* ==================================================================== */
export interface StepCardProps {
  id: string;
  stepNumber: string;
  title: string;
  description: string;
  children: React.ReactNode;
  result?: React.ReactNode;
}

export function StepCard({
  id,
  stepNumber,
  title,
  description,
  children,
  result,
}: StepCardProps) {
  return (
    <section id={id} className="soft-card p-6 sm:p-8 space-y-6 bg-white">
      {/* Header */}
      <div className="flex items-start gap-3.5 pb-4 border-b border-[rgba(27,31,42,0.08)]">
        <span className="w-9 h-9 rounded-full bg-[#f9c933] text-[#1b1f2a] font-headline font-extrabold text-sm flex items-center justify-center shrink-0 shadow-xs">
          {stepNumber}
        </span>
        <div className="space-y-0.5">
          <h2 className="font-headline text-xl sm:text-2xl font-bold text-[#1b1f2a]">
            {title}
          </h2>
          <p className="text-xs sm:text-sm text-[#6b7280] font-body leading-relaxed">
            {description}
          </p>
        </div>
      </div>

      {/* Main Content & Controls */}
      <div className="space-y-4">
        {children}
      </div>

      {/* Inline Result Area at bottom of card */}
      {result && (
        <div className="pt-2">
          {result}
        </div>
      )}
    </section>
  );
}

/* ==================================================================== */
/* INLINE RESULT AREA COMPONENT                                         */
/* ==================================================================== */
export interface InlineResultProps {
  status?: "idle" | "running" | "done" | "error";
  errorMessage?: string | null;
  successMessage?: string | null;
  txSignature?: string | null;
  steps?: StepItem[];
}

export function InlineResultArea({
  status,
  errorMessage,
  successMessage,
  txSignature,
  steps = [],
}: InlineResultProps) {
  if (!errorMessage && !successMessage && steps.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3 pt-3 border-t border-[rgba(27,31,42,0.08)]">
      {/* Multi-step progress list */}
      {steps.length > 0 && (
        <div className="space-y-2">
          {steps.map((step, idx) => {
            let pillClass = "bg-gray-100 text-[#6b7280]";
            let pillText = "Waiting";

            if (step.status === "running") {
              pillClass = "status-pill-warn";
              pillText = "Active";
            } else if (step.status === "done") {
              pillClass = "status-pill-ok";
              pillText = "Done";
            } else if (step.status === "error") {
              pillClass = "status-pill-danger";
              pillText = "Failed";
            }

            return (
              <div
                key={idx}
                className="flex items-center justify-between p-2.5 rounded-[14px] bg-[#fffdf6] border border-[rgba(27,31,42,0.06)] text-xs"
              >
                <div className="font-medium text-[#1b1f2a]">
                  <span className="font-mono text-[#8a5a00] mr-2">
                    {String(idx + 1).padStart(2, "0")}
                  </span>
                  {step.name}
                  {step.detail && (
                    <span className="text-[#6b7280] font-mono ml-2">
                      ({step.detail})
                    </span>
                  )}
                </div>
                <span className={`status-pill ${pillClass}`}>{pillText}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* Error Message: soft red rounded block */}
      {errorMessage && (
        <div className="rounded-[16px] bg-[#fde8e6] border border-[#fbd0cb] p-4 text-xs space-y-1">
          <div className="flex items-center gap-1.5 font-headline font-bold text-[#b42318] uppercase tracking-wider">
            <span className="w-2 h-2 rounded-full bg-[#b42318]" />
            Action Failed
          </div>
          <div className="text-[#1b1f2a] font-medium">{errorMessage}</div>
        </div>
      )}

      {/* Success Message: soft green rounded block */}
      {successMessage && (
        <div className="rounded-[16px] bg-[#e3f6e9] border border-[#c6edd1] p-4 text-xs space-y-2">
          <div className="flex items-center gap-1.5 font-headline font-bold text-[#17803d] uppercase tracking-wider">
            <span className="w-2 h-2 rounded-full bg-[#17803d]" />
            Success
          </div>
          <div className="text-[#1b1f2a] font-medium">{successMessage}</div>

          {txSignature && (
            <TechnicalDetails
              title="Transaction details"
              items={[
                { label: "Signature", value: txSignature, isAddress: true },
                {
                  label: "Explorer",
                  value: txSignature,
                  explorerUrl: makeExplorerUrl(txSignature),
                },
              ]}
            />
          )}
        </div>
      )}
    </div>
  );
}

/* ==================================================================== */
/* TECHNICAL DETAILS (Expandable native <details>)                     */
/* ==================================================================== */
export interface TechnicalItem {
  label: string;
  value: string;
  isAddress?: boolean;
  explorerUrl?: string;
}

export function TechnicalDetails({
  title = "Technical details",
  items,
}: {
  title?: string;
  items: TechnicalItem[];
}) {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const copyVal = async (key: string, val: string) => {
    try {
      await navigator.clipboard.writeText(val);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 1500);
    } catch {}
  };

  return (
    <details className="text-xs group pt-1">
      <summary className="cursor-pointer font-headline font-semibold text-[#6b7280] hover:text-[#1b1f2a] select-none inline-flex items-center gap-1">
        <span>▸</span>
        <span>{title}</span>
      </summary>
      <div className="mt-2 p-3 rounded-[14px] bg-[#fffdf6] border border-[rgba(27,31,42,0.08)] space-y-2 font-mono text-[11px]">
        {items.map((item, idx) => (
          <div key={idx} className="flex flex-wrap items-center justify-between gap-2 border-b border-[rgba(27,31,42,0.04)] last:border-0 pb-1.5 last:pb-0">
            <span className="text-[#6b7280] font-sans font-medium">{item.label}:</span>
            <div className="flex items-center gap-2">
              <span className="text-[#1b1f2a] font-bold break-all">
                {item.isAddress ? formatShortAddress(item.value, 8) : item.value}
              </span>
              <button
                type="button"
                onClick={() => copyVal(item.label, item.value)}
                className="text-[10px] font-sans font-semibold uppercase text-[#8a5a00] hover:underline px-1 py-0.5"
              >
                {copiedKey === item.label ? "Copied" : "Copy"}
              </button>
              {item.explorerUrl && (
                <a
                  href={item.explorerUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[10px] font-sans font-semibold text-[#1b1f2a] underline hover:text-[#8a5a00]"
                >
                  View on Explorer ↗
                </a>
              )}
            </div>
          </div>
        ))}
      </div>
    </details>
  );
}

/* ==================================================================== */
/* DESTRUCTIVE CONFIRMATION (Inline two-button confirmation)             */
/* ==================================================================== */
export interface DestructiveConfirmProps {
  promptText: string;
  confirmLabel: string;
  cancelLabel?: string;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function DestructiveConfirm({
  promptText,
  confirmLabel,
  cancelLabel = "Cancel",
  loading = false,
  onConfirm,
  onCancel,
}: DestructiveConfirmProps) {
  return (
    <div className="p-3.5 rounded-[16px] bg-[#fde8e6] border border-[#fbd0cb] space-y-2.5 text-xs">
      <div className="font-headline font-bold text-[#b42318]">
        {promptText}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <GlassButton
          variant="danger"
          size="sm"
          onClick={onConfirm}
          loading={loading}
          loadingText="Removing..."
        >
          {confirmLabel}
        </GlassButton>
        <GlassButton
          variant="secondary"
          size="sm"
          onClick={onCancel}
          disabled={loading}
        >
          {cancelLabel}
        </GlassButton>
      </div>
    </div>
  );
}

/* ==================================================================== */
/* EMPTY STATE BOX                                                      */
/* ==================================================================== */
export function EmptyStateBox({
  message,
  actionLabel,
  onAction,
}: {
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="rounded-[20px] border border-dashed border-[rgba(27,31,42,0.18)] p-6 sm:p-8 text-center space-y-3 bg-[#fffdf6]">
      <p className="text-xs sm:text-sm text-[#6b7280] font-body max-w-md mx-auto">
        {message}
      </p>
      {actionLabel && onAction && (
        <GlassButton variant="secondary" size="sm" onClick={onAction}>
          {actionLabel}
        </GlassButton>
      )}
    </div>
  );
}
