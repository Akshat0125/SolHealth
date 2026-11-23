"use client";

import React, { useEffect } from "react";
import { formatShortAddress } from "@/lib/format";
import { StepRow } from "@/components/StepRow";
import { ExternalLink } from "lucide-react";

export interface StepItem {
  name: string;
  status: "idle" | "running" | "done" | "error";
  detail?: string;
}

interface StepStatusProps {
  steps: StepItem[];
  currentStepIndex?: number;
  txSignature?: string | null;
  errorMessage?: string | null;
  successMessage?: string | null;
  onClear?: () => void;
}

export function getExplorerCluster(): "local" | "devnet" {
  return (process.env.NEXT_PUBLIC_CLUSTER as "local" | "devnet") || "local";
}

export function makeExplorerUrl(txSig: string, type: "tx" | "address" = "tx"): string {
  const cluster = getExplorerCluster();
  if (cluster === "devnet") {
    return `https://explorer.solana.com/${type}/${txSig}?cluster=devnet`;
  }
  const rpcUrl = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || "http://127.0.0.1:8899";
  return `https://explorer.solana.com/${type}/${txSig}?cluster=custom&customUrl=${encodeURIComponent(rpcUrl)}`;
}

export function StepStatusArea({
  steps,
  txSignature,
  errorMessage,
  successMessage,
  onClear,
}: StepStatusProps) {
  // Auto-dismiss success toast after 5s
  useEffect(() => {
    if (successMessage && onClear) {
      const timer = setTimeout(() => {
        onClear();
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [successMessage, onClear]);

  if (steps.length === 0 && !txSignature && !errorMessage && !successMessage) {
    return null;
  }

  const isAnyRunning = steps.some((s) => s.status === "running");

  return (
    <div className="soft-card mb-8">
      <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#DCEEF2]">
        <div className="flex items-center gap-2">
          <span className="text-xs font-headline font-bold uppercase tracking-wider text-[#64748B]">
            Progress & Status
          </span>
          {isAnyRunning && (
            <span className="inline-flex items-center text-xs font-headline font-bold text-[#075985]">
              Processing
              <span className="dot-pulse">
                <span />
                <span />
                <span />
              </span>
            </span>
          )}
        </div>
        {onClear && !isAnyRunning && (
          <button
            data-ui="btn"
            onClick={onClear}
            className="text-xs font-headline font-semibold text-[#64748B] hover:text-[#040B1A] px-3 py-1 rounded-full hover:bg-slate-100 transition-colors"
          >
            Dismiss
          </button>
        )}
      </div>

      {/* Numbered Step List */}
      {steps.length > 0 && (
        <div className="space-y-1 mb-4">
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
                helper={step.detail}
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

      {/* Error Message Box: soft red rounded block */}
      {errorMessage && (
        <div className="rounded-xl bg-[#FEE2E2] border border-[#FCA5A5] p-4 text-xs mb-3">
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2 h-2 rounded-full bg-[#991B1B]" />
            <span className="font-headline font-bold uppercase tracking-wider text-[#991B1B]">
              Action Failed
            </span>
          </div>
          <div className="text-xs font-medium text-[#040B1A]">{errorMessage}</div>
        </div>
      )}

      {/* Success Message & Tx Signature: mint-aqua rounded block */}
      {successMessage && (
        <div className="rounded-xl bg-[#E6FBF8] border border-[#99F0E4] p-4 text-xs mb-3">
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2 h-2 rounded-full bg-[#065F6B]" />
            <span className="font-headline font-bold uppercase tracking-wider text-[#065F6B]">
              Success
            </span>
          </div>
          <div className="text-xs font-medium text-[#040B1A]">{successMessage}</div>
          {txSignature && (
            <div className="mt-3 pt-2.5 border-t border-[#99F0E4]/60 flex flex-wrap items-center gap-2">
              <span className="font-mono text-xs font-semibold text-[#065F6B]">
                Transaction:
              </span>
              <a
                data-ui="btn"
                href={makeExplorerUrl(txSignature)}
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono text-xs font-medium text-[#040B1A] bg-[#FFFFFF] px-3 py-1 rounded-full border border-[#DCEEF2] shadow-xs hover:border-[#00B8D9] inline-flex items-center gap-1.5"
              >
                <span>{formatShortAddress(txSignature, 8)}</span>
                <ExternalLink className="w-3 h-3 text-[#64748B]" />
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function ExplorerTxBadge({ txSignature }: { txSignature: string }) {
  const cluster = getExplorerCluster();
  return (
    <a
      data-ui="pill"
      href={makeExplorerUrl(txSignature)}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1.5 font-mono text-xs font-medium text-[#040B1A] bg-white px-2.5 py-1 rounded-full border border-[#DCEEF2] shadow-xs hover:border-[#00B8D9]"
      title={`View transaction on Solana Explorer (${cluster === "devnet" ? "devnet" : "localhost"})`}
    >
      <span>{formatShortAddress(txSignature, 6)}</span>
      <ExternalLink className="w-3 h-3 text-[#64748B]" />
    </a>
  );
}