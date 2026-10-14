"use client";

import React from "react";

export type GlassButtonVariant = "primary" | "secondary" | "danger" | "chip";
export type GlassButtonSize = "sm" | "md";

export interface GlassButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: GlassButtonVariant;
  size?: GlassButtonSize;
  selected?: boolean;
  loading?: boolean;
  loadingText?: string;
  children: React.ReactNode;
}

export function GlassButton({
  variant = "secondary",
  size = "md",
  selected = false,
  loading = false,
  loadingText = "Working...",
  disabled,
  className = "",
  children,
  ...props
}: GlassButtonProps) {
  let variantClass = "glass-btn-secondary";
  if (variant === "primary") {
    variantClass = "glass-btn-primary";
  } else if (variant === "danger") {
    variantClass = "glass-btn-danger";
  } else if (variant === "chip") {
    variantClass = `glass-btn-chip ${selected ? "selected" : ""}`;
  }

  const sizeClass = size === "sm" && variant !== "chip" ? "glass-btn-sm" : "";

  return (
    <button
      {...props}
      disabled={disabled || loading}
      className={`glass-btn ${variantClass} ${sizeClass} ${className}`}
    >
      {loading ? (
        <span className="inline-flex items-center">
          <span>{loadingText}</span>
          <span className="dot-pulse" aria-hidden="true">
            <span />
            <span />
            <span />
          </span>
        </span>
      ) : (
        children
      )}
    </button>
  );
}
