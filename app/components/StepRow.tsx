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
  let markerBg = "bg-[#f3f4f6] text-[#6b7280]";
  let markerContent = number;

  if (status === "done") {
    markerBg = "bg-[var(--status-ok-bg)] text-[var(--status-ok-text)]";
    markerContent = "✓";
  } else if (status === "active") {
    markerBg = "bg-[var(--primary)] text-[var(--ink)]";
  }

  return (
    <div
      data-ui="step-row"
      className={`border-b border-[rgba(27,31,42,0.08)] last:border-b-0 py-[12px] min-h-[52px] flex flex-col justify-center ${className}`}
    >
      <div className="grid grid-cols-[28px_1fr_auto] items-start gap-x-[14px]">
        {/* Column 1: 28px Circle Marker, centered with the first line of the label */}
        <div className="flex items-center justify-center">
          <div
            data-ui="marker"
            className={`w-[28px] h-[28px] min-w-[28px] min-h-[28px] rounded-full grid place-items-center text-[13px] font-bold tabular-nums leading-none select-none -mt-[5.6px] ${markerBg}`}
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
        <div className="flex items-start min-w-0">
          <span
            data-ui="step-label"
            className="font-headline font-semibold text-sm text-[#1b1f2a] leading-[1.2]"
          >
            {label}
          </span>
        </div>

        {/* Column 3: Status Pills or Action Buttons (vertically centered in row) */}
        <div className="flex items-center justify-end justify-self-end self-center">
          {right}
        </div>
      </div>

      {/* Error or Helper Block below label, indented by marker width (28px) + gap (14px) = 42px */}
      {(error || helper) && (
        <div className="ml-[42px] mt-2 space-y-1.5">
          {error && (
            <div className="p-2.5 rounded-[12px] bg-[#fde8e6] border border-[#fbd0cb] text-[11px] text-[#b42318] leading-relaxed">
              {error}
            </div>
          )}
          {helper && (
            <div className="text-xs text-[#6b7280] leading-relaxed">
              {helper}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
