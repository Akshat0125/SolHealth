"use client";

import React from "react";

export interface StepRowProps {
  status: "done" | "active" | "waiting";
  number: string | number;
  label: React.ReactNode;
  right?: React.ReactNode;
  error?: React.ReactNode;
  helper?: React.ReactNode;
  className?: string;
}

export function StepRow({
  status,
  number,
  label,
  right,
  error,
  helper,
  className = "",
}: StepRowProps) {
  let markerBg = "bg-[#F1F5F9] text-[#64748B]";
  let markerContent = number;

  if (status === "done") {
    markerBg = "bg-[#E6FBF8] text-[#065F6B] border border-[#99F0E4]";
    markerContent = "✓";
  } else if (status === "active") {
    markerBg = "bg-[#E8F7FC] text-[#075985] border border-[#9CE0F5] font-bold";
  }

  return (
    <div
      data-ui="step-row"
      className={`border-b border-[#DCEEF2] last:border-b-0 py-3 min-h-[50px] flex flex-col justify-center ${className}`}
    >
      <div className="grid grid-cols-[28px_1fr_auto] items-start gap-x-3.5">
        {/* Column 1: 28px Circle Marker */}
        <div className="flex items-center justify-center">
          <div
            data-ui="marker"
            className={`w-7 h-7 min-w-7 min-h-7 rounded-full grid place-items-center text-[12px] font-bold font-mono tabular-nums leading-none select-none -mt-1 shadow-xs ${markerBg}`}
          >
            <span
              data-ui="marker-num"
              className="grid place-items-center leading-none"
            >
              {markerContent}
            </span>
          </div>
        </div>

        {/* Column 2: Label */}
        <div className="flex items-start min-w-0 pt-0.5">
          <span
            data-ui="step-label"
            className="font-headline font-semibold text-sm text-[#040B1A] leading-snug"
          >
            {label}
          </span>
        </div>

        {/* Column 3: Status Pills or Action Buttons */}
        <div className="flex items-center justify-end justify-self-end self-center">
          {right}
        </div>
      </div>

      {/* Error or Helper Block below label */}
      {(error || helper) && (
        <div className="ml-[42px] mt-2 space-y-1.5">
          {error && (
            <div className="p-2.5 rounded-xl bg-[#FEE2E2] border border-[#FCA5A5] text-[11.5px] text-[#991B1B] leading-relaxed">
              {error}
            </div>
          )}
          {helper && (
            <div className="text-xs text-[#64748B] leading-relaxed">
              {helper}
            </div>
          )}
        </div>
      )}
    </div>
  );
}