"use client";

import React, { useEffect } from "react";
import { formatShortAddress } from "@/lib/format";
import { StepRow } from "@/components/StepRow";

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
      <div className="flex items-center justify-between pb-3 mb-4 border-b border-[rgba(27,31,42,0.08)]">
        <div className="flex items-center gap-2">
          <span className="text-xs font-headline font-bold uppercase tracking-wider text-[#6b7280]">
            Progress & Status
          </span>
          {isAnyRunning && (
            <span className="inline-flex items-center text-xs font-headline font-bold text-[#8a5a00]">
              Working
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
            className="text-xs font-headline font-semibold text-[#6b7280] hover:text-[#1b1f2a] px-3 py-1 rounded-full hover:bg-gray-100 transition-colors"
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
            let pillClass = "bg-gray-100 text-[#6b7280]";
            let pillText = "Waiting";

            if (step.status === "running") {
              stepStatus = "active";
              pillClass = "status-pill-warn";
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
        <div className="rounded-[16px] bg-[#fde8e6] border border-[#fbd0cb] p-4 text-sm mb-3">
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2 h-2 rounded-full bg-[#b42318]" />
            <span className="font-headline font-bold text-xs uppercase tracking-wider text-[#b42318]">
              Action Failed
            </span>
          </div>
          <div className="text-sm font-medium text-[#1b1f2a]">{errorMessage}</div>
        </div>
      )}

      {/* Success Message & Tx Signature: soft green rounded block */}
      {successMessage && (
        <div className="rounded-[16px] bg-[#e3f6e9] border border-[#c6edd1] p-4 text-sm mb-3">
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2 h-2 rounded-full bg-[#17803d]" />
            <span className="font-headline font-bold text-xs uppercase tracking-wider text-[#17803d]">
              Success
            </span>
          </div>
          <div className="text-sm font-medium text-[#1b1f2a]">{successMessage}</div>
          {txSignature && (
            <div className="mt-3 pt-2.5 border-t border-[#17803d]/20 flex flex-wrap items-center gap-2">
              <span className="font-mono text-xs font-semibold text-[#17803d]">
                Transaction:
              </span>
              <a
                data-ui="btn"
                href={makeExplorerUrl(txSignature)}
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono text-xs font-medium text-[#1b1f2a] bg-white px-3 py-1 rounded-full border border-[rgba(27,31,42,0.08)] shadow-xs hover:border-[#f9c933]"
              >
                {formatShortAddress(txSignature, 8)} (Explorer ↗)
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
      className="inline-flex items-center gap-1 font-mono text-xs font-medium text-[#1b1f2a] bg-white px-2.5 py-1 rounded-full border border-[rgba(27,31,42,0.08)] shadow-xs hover:border-[#f9c933]"
      title={`View transaction on Solana Explorer (${cluster === "devnet" ? "devnet" : "localhost"})`}
    >
      <span>{formatShortAddress(txSignature, 6)}</span>
      <span className="text-[#6b7280]">↗</span>
    </a>
  );
}
