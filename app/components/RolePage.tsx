"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRole, Role } from "@/lib/roles";
import { formatShortAddress } from "@/lib/format";
import { GlassButton } from "@/components/GlassButton";
import { makeExplorerUrl, StepItem } from "@/components/StepStatus";
import { StepRow } from "@/components/StepRow";
import { Copy, Check, ChevronRight, ExternalLink } from "lucide-react";

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
    <div className="relative min-h-[calc(100vh-100px)] bg-[#FFFFFF] py-6 sm:py-8 px-4 sm:px-6 lg:px-8 overflow-x-clip">
      {/* Decorative Cyan / Mint Ambient Glows */}
      <div
        aria-hidden="true"
        className="fixed pointer-events-none select-none z-0 top-[-60px] left-[-60px] w-[500px] h-[500px] bg-[#E6FBF8] opacity-50 rounded-full blur-[100px]"
      />
      <div
        aria-hidden="true"
        className="fixed pointer-events-none select-none z-0 top-[30%] right-[-80px] w-[520px] h-[520px] bg-[#E8F7FC] opacity-60 rounded-full blur-[100px]"
      />
      <div
        aria-hidden="true"
        className="fixed pointer-events-none select-none z-0 bottom-[-40px] left-[20%] w-[480px] h-[480px] bg-[#F0FDF4] opacity-35 rounded-full blur-[100px]"
      />

      <div className="relative z-10 max-w-[1180px] mx-auto space-y-8">
        
        {/* ======================================================== */}
        {/* HEADER                                                   */}
        {/* ======================================================== */}
        <header className="space-y-4">
          {/* Breadcrumb Pill */}
          <nav aria-label="Breadcrumb">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FFFFFF] border border-[#DCEEF2] shadow-xs text-xs font-headline font-semibold text-[#64748B]">
              <Link href="/" className="hover:text-[#040B1A] transition-colors">
                Home
              </Link>
              <ChevronRight className="w-3 h-3 text-[#94A3B8]" />
              <span className="text-[#040B1A] font-bold">{breadcrumbLabel}</span>
            </div>
          </nav>

          {/* Prototype Devnet Disclaimer Notice */}
          {(role === "issuer" || role === "patient") && (
            <div className="flex items-center gap-2.5 px-3.5 py-2 rounded-xl bg-[#E8F7FC] border border-[#9CE0F5] text-xs text-[#075985] font-headline">
              <span className="w-2 h-2 rounded-full bg-[#14D9C4] animate-pulse shrink-0" />
              <span>
                <strong>Prototype running on Solana Devnet.</strong> Do not upload real medical records.
              </span>
            </div>
          )}

          {/* Title as a plain question + one line helper */}
          <div>
            <h1 className="font-headline text-3xl sm:text-4xl lg:text-5xl font-extrabold text-[#040B1A] tracking-tight leading-[1.1] mb-3">
              {titleQuestion}
            </h1>
            <p className="max-w-[70ch] text-sm sm:text-base text-[#64748B] font-body leading-relaxed">
              <span className="font-semibold text-[#040B1A]">What you can do here: </span>
              {whatYouCanDo}
            </p>
          </div>

          {/* Progress Checklist (Horizontal row of step chips) */}
          <div className="overflow-visible py-1">
            <div className="flex flex-wrap items-center gap-2.5 overflow-visible">
              {checklist.map((step) => {
                let statusClasses = "bg-[#FFFFFF] text-[#64748B] border-[#DCEEF2]";
                let statusBadge = "Waiting";
                let badgeClass = "bg-[#F1F5F9] text-[#64748B] border border-[#E2E8F0]";

                if (step.status === "done") {
                  statusClasses = "bg-[#E6FBF8] text-[#065F6B] border-[#99F0E4]";
                  statusBadge = "Done";
                  badgeClass = "bg-[#14D9C4] text-[#040B1A]";
                } else if (step.status === "next") {
                  statusClasses = "bg-[#E8F7FC] text-[#075985] border-[#9CE0F5] font-bold shadow-xs ring-2 ring-[#00B8D9]/25";
                  statusBadge = "Next";
                  badgeClass = "bg-[#075985] text-white";
                }

                return (
                  <button
                    key={step.number}
                    data-ui="btn"
                    type="button"
                    onClick={() => handleScrollToCard(step.targetCardId)}
                    className={`inline-flex items-center gap-2 h-[38px] px-3.5 rounded-xl border text-xs font-headline transition-all cursor-pointer hover:border-[#00B8D9] select-none shrink-0 leading-none ${statusClasses}`}
                    title={`Click to scroll to step ${step.number}`}
                  >
                    <span className="w-5 h-5 rounded-full bg-black/5 flex items-center justify-center font-mono font-bold text-[11px] leading-none shrink-0">
                      {step.number}
                    </span>
                    <span className="font-semibold">{step.label}</span>
                    <span
                      data-ui="pill"
                      className={`inline-flex items-center justify-center h-[18px] px-2 rounded-full text-[10px] font-bold uppercase leading-none whitespace-nowrap ${badgeClass}`}
                    >
                      {statusBadge}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </header>

        {/* ======================================================== */}
        {/* BODY: TWO COLUMNS (Main, Side 320px sticky)              */}
        {/* ======================================================== */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-8 items-start">
          
          {/* Mobile Side Panel: Compact summary displayed first on mobile */}
          <div className="block lg:hidden">
            <div className="soft-card p-4 space-y-3 bg-[#F7FBFC] border border-[#DCEEF2]">
              <div className="flex items-center justify-between">
                <div className="flex flex-row items-center gap-2.5">
                  <span className={`role-dot ${ready ? "role-dot-active" : "role-dot-inactive"}`} />
                  <span className="font-headline font-bold text-sm text-[#040B1A]">
                    Acting as {roleTitle}
                  </span>
                </div>
                <div className="font-mono text-xs text-[#64748B]">
                  {balanceVal !== null ? `${balanceVal.toFixed(2)} SOL` : "----"}
                </div>
              </div>

              <div className="flex items-center justify-between text-xs font-mono text-[#64748B] bg-[#FFFFFF] p-2 rounded-xl border border-[#DCEEF2]">
                <span className="truncate max-w-[200px]">{shortAddress}</span>
                <button
                  data-ui="btn"
                  onClick={handleCopy}
                  className="font-headline font-bold text-[#075985] hover:underline"
                >
                  {copied ? "Copied" : "Copy"}
                </button>
              </div>

              <div className="text-xs bg-[#E8F7FC] p-2.5 rounded-xl border border-[#9CE0F5] text-[#075985]">
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

          {/* DESKTOP SIDE PANEL (Sticky, 16px radius surface card) */}
          <aside className="hidden lg:block sticky top-[84px] space-y-4">
            <div className="soft-card p-6 space-y-5 bg-[#F7FBFC] border border-[#DCEEF2]">
              {/* Section 1: You are acting as */}
              <div className="space-y-2">
                <div className="text-[10.5px] font-mono font-bold uppercase tracking-wider text-[#64748B]">
                  You are acting as
                </div>
                <div className="flex flex-row items-center gap-2.5">
                  <span className={`role-dot ${ready ? "role-dot-active" : "role-dot-inactive"}`} />
                  <h2 className="font-headline text-lg font-extrabold text-[#040B1A]">
                    {roleTitle}
                  </h2>
                </div>
                <p className="text-xs text-[#64748B] font-body leading-relaxed">
                  {roleDescription}
                </p>
              </div>

              {/* Hairline Divider */}
              <div className="border-t border-[#DCEEF2]" />

              {/* Section 2: Wallet Details */}
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#64748B] font-headline font-medium">Wallet Address</span>
                  <div className="flex items-center gap-1.5 font-mono">
                    <span className="font-bold text-[#040B1A]">{shortAddress}</span>
                    <button
                      type="button"
                      data-ui="btn"
                      onClick={handleCopy}
                      disabled={!ready || !address}
                      className="text-[10px] font-headline font-bold uppercase text-[#075985] hover:text-[#040B1A] px-2 py-0.5 rounded-md bg-[#FFFFFF] border border-[#DCEEF2] disabled:opacity-40 inline-flex items-center gap-1"
                    >
                      {copied ? <Check className="w-3 h-3 text-[#065F6B]" /> : <Copy className="w-3 h-3" />}
                      <span>{copied ? "Copied" : "Copy"}</span>
                    </button>
                  </div>
                </div>

                {role !== "audit" && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[#64748B] font-headline font-medium">Balance</span>
                    <span className="font-mono font-bold text-[#040B1A]">
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
              <div className="border-t border-[#DCEEF2]" />

              {/* Section 3: Next Step Box */}
              <div className="p-3.5 rounded-xl bg-[#E8F7FC] border border-[#9CE0F5] space-y-1">
                <div className="text-[10.5px] font-mono font-bold text-[#075985] uppercase tracking-wider">
                  Next Step
                </div>
                <p className="text-xs text-[#040B1A] font-medium leading-snug">
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
          className={`fixed bottom-6 right-6 z-50 p-4 rounded-xl border shadow-[0_12px_32px_rgba(4,11,26,0.12)] text-xs font-medium flex items-center space-x-2 bg-[#FFFFFF] ${
            fundToast.type === "ok"
              ? "border-[#99F0E4] text-[#065F6B]"
              : "border-[#FCA5A5] text-[#991B1B]"
          }`}
        >
          <span
            className={`w-2 h-2 rounded-full shrink-0 ${
              fundToast.type === "ok" ? "bg-[#14D9C4]" : "bg-[#991B1B]"
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
    <section id={id} className="soft-card p-6 sm:p-8 space-y-6 bg-[#FFFFFF] border border-[#DCEEF2]">
      {/* Header: Badge aligned with title */}
      <div className="grid grid-cols-[40px_1fr] gap-x-4 items-start pb-4 border-b border-[#DCEEF2]">
        <div className="flex items-center justify-center -mt-1">
          <span className="w-10 h-10 min-w-10 min-h-10 rounded-xl bg-[#040B1A] text-white font-headline font-extrabold text-sm sm:text-base grid place-items-center shrink-0 shadow-sm">
            <span className="leading-none">{stepNumber}</span>
          </span>
        </div>
        <div className="space-y-1">
          <h2 className="font-headline text-xl sm:text-2xl font-bold text-[#040B1A] leading-snug">
            {title}
          </h2>
          <p className="text-xs sm:text-sm text-[#64748B] font-body leading-relaxed">
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
  rawError?: string | null;
  successMessage?: string | null;
  txSignature?: string | null;
  steps?: StepItem[];
}

export function InlineResultArea({
  status,
  errorMessage,
  rawError,
  successMessage,
  txSignature,
  steps = [],
}: InlineResultProps) {
  if (!errorMessage && !successMessage && steps.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3 pt-3 border-t border-[#DCEEF2]">
      {/* Multi-step progress list */}
      {steps.length > 0 && (
        <div className="space-y-1">
          {steps.map((step, idx) => {
            let stepStatus: "done" | "active" | "waiting" = "waiting";
            let pillClass = "status-pill-neutral";
            let pillText = "Waiting";

            if (step.status === "running") {
              stepStatus = "active";
              pillClass = "status-pill-info";
              pillText = "Active";
            } else if (step.status === "done") {
              stepStatus = "done";
              pillClass = "status-pill-ok";
              pillText = "Done";
            } else if (step.status === "error") {
              stepStatus = "active";
              pillClass = "status-pill-danger";
              pillText = "Failed";
            }

            const cleanName = step.name.replace(/^\d+\s*/, "");

            return (
              <StepRow
                key={idx}
                status={stepStatus}
                number={idx + 1}
                label={cleanName}
                helper={step.detail && step.status !== "error" ? step.detail : undefined}
                right={
                  <span data-ui="pill" className={`status-pill ${pillClass}`}>
                    {pillText}
                  </span>
                }
              />
            );
          })}
        </div>
      )}

      {/* Error Message: soft red rounded block */}
      {errorMessage && (
        <div className="rounded-xl bg-[#FEE2E2] border border-[#FCA5A5] p-4 text-xs space-y-2">
          <div className="flex items-center gap-1.5 font-headline font-bold text-[#991B1B] uppercase tracking-wider">
            <span className="w-2 h-2 rounded-full bg-[#991B1B]" />
            Action Failed
          </div>
          <div className="text-[#040B1A] font-medium">{errorMessage}</div>
          {rawError && rawError !== errorMessage && (
            <TechnicalDetails
              title="Technical details"
              items={[{ label: "Raw error", value: rawError }]}
            />
          )}
        </div>
      )}

      {/* Success Message: mint-aqua rounded block */}
      {successMessage && (
        <div className="rounded-xl bg-[#E6FBF8] border border-[#99F0E4] p-4 text-xs space-y-2">
          <div className="flex items-center gap-1.5 font-headline font-bold text-[#065F6B] uppercase tracking-wider">
            <span className="w-2 h-2 rounded-full bg-[#065F6B]" />
            Success
          </div>
          <div className="text-[#040B1A] font-medium">{successMessage}</div>

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
      <summary className="cursor-pointer font-headline font-semibold text-[#64748B] hover:text-[#040B1A] select-none inline-flex items-center gap-1.5">
        <span className="group-open:rotate-90 transition-transform">▸</span>
        <span>{title}</span>
      </summary>
      <div className="mt-2 p-3.5 rounded-xl bg-[#F7FBFC] border border-[#DCEEF2] space-y-2 font-mono text-[11px]">
        {items.map((item, idx) => (
          <div key={idx} className="flex flex-wrap items-center justify-between gap-2 border-b border-[#DCEEF2]/50 last:border-0 pb-1.5 last:pb-0">
            <span className="text-[#64748B] font-sans font-medium">{item.label}:</span>
            <div className="flex items-center gap-2">
              <span className="text-[#040B1A] font-bold break-all">
                {item.isAddress ? formatShortAddress(item.value, 8) : item.value}
              </span>
              <button
                type="button"
                data-ui="btn"
                onClick={() => copyVal(item.label, item.value)}
                className="text-[10px] font-sans font-semibold uppercase text-[#075985] hover:underline px-1.5 py-0.5 rounded bg-white border border-[#DCEEF2]"
              >
                {copiedKey === item.label ? "Copied" : "Copy"}
              </button>
              {item.explorerUrl && (
                <a
                  href={item.explorerUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[10px] font-sans font-semibold text-[#075985] hover:text-[#040B1A] underline inline-flex items-center gap-1"
                >
                  <span>Explorer</span>
                  <ExternalLink className="w-2.5 h-2.5" />
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
    <div className="p-3.5 rounded-xl bg-[#FEE2E2] border border-[#FCA5A5] space-y-2.5 text-xs">
      <div className="font-headline font-bold text-[#991B1B]">
        {promptText}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <GlassButton
          variant="danger"
          size="sm"
          onClick={onConfirm}
          loading={loading}
          loadingText="Processing..."
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
    <div className="rounded-xl border border-dashed border-[#DCEEF2] p-8 text-center space-y-3 bg-[#F7FBFC]">
      <p className="text-xs sm:text-sm text-[#64748B] font-body max-w-md mx-auto">
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