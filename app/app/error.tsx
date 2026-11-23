"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { AlertCircle, RotateCcw, Home } from "lucide-react";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log minimal safe diagnostic without leaking secrets or sensitive payload details
    console.error("SolHealth UI caught runtime error:", error?.message || "Unknown error");
  }, [error]);

  return (
    <div className="relative min-h-[calc(100vh-200px)] flex items-center justify-center px-4 py-16 bg-[#FFFFFF]">
      {/* Ambient background glows */}
      <div
        aria-hidden="true"
        className="fixed pointer-events-none select-none z-0 top-[-100px] right-[-100px] w-[500px] h-[500px] bg-[#FEE2E2] opacity-40 rounded-full blur-[120px]"
      />
      <div
        aria-hidden="true"
        className="fixed pointer-events-none select-none z-0 bottom-[-100px] left-[-100px] w-[500px] h-[500px] bg-[#E8F7FC] opacity-50 rounded-full blur-[120px]"
      />

      <div className="relative z-10 max-w-md w-full text-center space-y-6 p-8 rounded-2xl bg-[#F7FBFC] border border-[#DCEEF2] shadow-sm">
        {/* Error icon */}
        <div className="flex justify-center">
          <div className="w-14 h-14 rounded-2xl bg-[#FEE2E2] border border-[#FCA5A5] flex items-center justify-center text-[#991B1B] shadow-xs">
            <AlertCircle className="w-7 h-7" />
          </div>
        </div>

        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FEE2E2] border border-[#FCA5A5] font-mono text-xs font-bold text-[#991B1B]">
            <span>Application Error</span>
          </div>
          <h1 className="font-headline text-2xl sm:text-3xl font-extrabold text-[#040B1A] tracking-tight">
            Something unexpected occurred
          </h1>
          <p className="text-xs sm:text-sm text-[#64748B] leading-relaxed">
            The application encountered an issue executing this action. Your wallet and client-side encryption keys remain secure in browser memory.
          </p>
        </div>

        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => reset()}
            className="btn-dark-pill w-full sm:w-auto inline-flex items-center justify-center gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Try again</span>
          </button>
          <Link
            href="/"
            className="w-full sm:w-auto px-4 py-2.5 rounded-full bg-white hover:bg-[#F7FBFC] border border-[#DCEEF2] hover:border-[#9CE0F5] text-xs font-headline font-bold text-[#075985] transition-colors inline-flex items-center justify-center gap-2"
          >
            <Home className="w-4 h-4" />
            <span>Back to Home</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
