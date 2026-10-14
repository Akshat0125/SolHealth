"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { useRole, Role } from "@/lib/roles";
import { GlassButton } from "@/components/GlassButton";

export default function HomePage() {
  const { setRole, rpcOnline } = useRole();
  const router = useRouter();

  const handleSelectRole = (r: Role, path: string) => {
    setRole(r);
    router.push(path);
  };

  const implementedFeatures = [
    "Browser AES-256-GCM encryption",
    "Ed25519-to-Curve25519 key wrapping",
    "IPFS ciphertext pinning",
    "Solana PDA access control with expiry",
    "Tamper-evident on-chain hash audit",
  ];

  const futureWorkFeatures = [
    "Multi-party computation (MPC)",
    "Zero-knowledge doctor credential proofs",
    "ABDM / NDHM standard integration",
    "Mobile health wallet SDK",
    "Decentralized storage incentives",
  ];

  return (
    <div className="relative min-h-[calc(100vh-70px)] bg-[#fffdf6] flex items-center justify-center p-4 sm:p-6 lg:p-8 overflow-hidden">
      {/* Faint blush blob behind page */}
      <div
        aria-hidden="true"
        className="absolute pointer-events-none select-none z-0 top-[10%] right-[15%] w-[480px] h-[480px] bg-[#ffe3ee] opacity-60 rounded-full blur-[90px]"
      />

      {/* Main 32px rounded container */}
      <div className="relative z-10 w-full max-w-[1180px] rounded-[32px] overflow-hidden bg-white border border-[rgba(27,31,42,0.08)] shadow-[0_12px_32px_rgba(27,31,42,0.08)]">
        <div className="grid grid-cols-1 lg:grid-cols-[55%_45%]">
          
          {/* ======================================================== */}
          {/* LEFT HALF: YELLOW GRADIENT PANEL                          */}
          {/* ======================================================== */}
          <div
            className="p-8 sm:p-10 lg:p-12 flex flex-col justify-between relative overflow-hidden"
            style={{
              background:
                "linear-gradient(160deg, #fff1a8 0%, #fff8d6 45%, #ffffff 100%)",
            }}
          >
            <div className="space-y-6 relative z-10">
              <div className="space-y-2">
                <h1 className="font-headline text-4xl sm:text-5xl lg:text-6xl font-extrabold text-[#1b1f2a] tracking-tight leading-[1.05]">
                  SolHealth
                </h1>
                <p className="font-headline text-lg sm:text-xl font-bold text-[#1b1f2a] leading-snug">
                  A health record system where the patient decides who reads what, and the blockchain remembers who did.
                </p>
              </div>

              <p className="text-sm sm:text-base text-[#1b1f2a] font-body leading-relaxed">
                Medical files are encrypted in the browser, stored on IPFS, and only a hash plus access rules live on Solana, so records are tamper-evident and access is patient-controlled and auditable.
              </p>

              {/* How it works */}
              <div className="rounded-[16px] bg-white/70 backdrop-blur-sm border border-white/80 p-4 font-mono text-xs text-[#1b1f2a] space-y-1.5 shadow-[0_4px_12px_rgba(27,31,42,0.04)]">
                <div className="font-bold uppercase tracking-wider text-[#6b7280] text-[11px] mb-1">
                  HOW IT WORKS
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[#8a5a00] font-bold">01</span>
                  <span>Encrypt in the browser.</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[#8a5a00] font-bold">02</span>
                  <span>Store ciphertext on IPFS.</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[#8a5a00] font-bold">03</span>
                  <span>Register hash on Solana.</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[#8a5a00] font-bold">04</span>
                  <span>Grant, expire or revoke access.</span>
                </div>
              </div>

              {/* Side-by-side: IMPLEMENTED & FUTURE WORK */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                {/* Implemented */}
                <div className="rounded-[20px] bg-white/80 backdrop-blur-sm border border-white/90 p-4 space-y-2 shadow-[0_4px_12px_rgba(27,31,42,0.04)]">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#17803d]" />
                    <span className="font-headline text-xs font-bold text-[#17803d] uppercase tracking-wider">
                      Implemented
                    </span>
                  </div>
                  <ul className="text-xs text-[#1b1f2a] font-body space-y-1">
                    {implementedFeatures.map((feat, idx) => (
                      <li key={idx} className="flex items-start gap-1.5">
                        <span className="text-[#17803d] font-bold leading-none mt-0.5">•</span>
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Future Work */}
                <div className="rounded-[20px] bg-white/80 backdrop-blur-sm border border-white/90 p-4 space-y-2 shadow-[0_4px_12px_rgba(27,31,42,0.04)]">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#8a5a00]" />
                    <span className="font-headline text-xs font-bold text-[#8a5a00] uppercase tracking-wider">
                      Future Work
                    </span>
                  </div>
                  <ul className="text-xs text-[#6b7280] font-body space-y-1">
                    {futureWorkFeatures.map((feat, idx) => (
                      <li key={idx} className="flex items-start gap-1.5">
                        <span className="text-[#8a5a00] font-bold leading-none mt-0.5">•</span>
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            {/* 3 Floating Mini-Cards (Static, fixed positions, slight rotation 1-2 degrees, no animation) */}
            <div className="pt-6 relative z-10 grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {/* Card 1 */}
              <div
                className="p-3 rounded-[16px] bg-white border border-[rgba(27,31,42,0.08)] transform rotate-[-1.5deg] shadow-[0_8px_20px_rgba(27,31,42,0.06)]"
              >
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="w-2 h-2 rounded-full bg-[#17803d]" />
                  <span className="text-[11px] font-headline font-bold text-[#1b1f2a]">
                    Record encrypted
                  </span>
                </div>
                <div className="text-[11px] font-mono text-[#6b7280]">
                  AES-256-GCM
                </div>
              </div>

              {/* Card 2 */}
              <div
                className="p-3 rounded-[16px] bg-white border border-[rgba(27,31,42,0.08)] transform rotate-[1.5deg] shadow-[0_8px_20px_rgba(27,31,42,0.06)]"
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#f59e0b]" />
                    <span className="text-[11px] font-headline font-bold text-[#1b1f2a]">
                      Access granted
                    </span>
                  </div>
                  {/* Three tiny overlapping plain CSS circles in yellow, pink and white */}
                  <div className="flex items-center -space-x-1.5">
                    <span className="w-3.5 h-3.5 rounded-full bg-[#f9c933] border border-white inline-block shadow-xs" />
                    <span className="w-3.5 h-3.5 rounded-full bg-[#ffc2dc] border border-white inline-block shadow-xs" />
                    <span className="w-3.5 h-3.5 rounded-full bg-[#ffffff] border border-gray-300 inline-block shadow-xs" />
                  </div>
                </div>
                <div className="text-[11px] font-mono text-[#6b7280]">
                  expires in 30 min
                </div>
              </div>

              {/* Card 3 */}
              <div
                className="p-3 rounded-[16px] bg-white border border-[rgba(27,31,42,0.08)] transform rotate-[-1deg] shadow-[0_8px_20px_rgba(27,31,42,0.06)]"
              >
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="w-2 h-2 rounded-full bg-[#17803d]" />
                  <span className="text-[11px] font-headline font-bold text-[#1b1f2a]">
                    Hash check
                  </span>
                </div>
                <div className="text-[11px] font-mono text-[#17803d] font-bold">
                  Match
                </div>
              </div>
            </div>

          </div>

          {/* ======================================================== */}
          {/* RIGHT HALF: SIGN-UP STYLE FORM PANEL                     */}
          {/* ======================================================== */}
          <div className="p-8 sm:p-10 lg:p-12 flex flex-col justify-center bg-white">
            <div className="max-w-[420px] w-full mx-auto space-y-8">
              
              <div className="text-center space-y-1.5">
                <h2 className="font-headline text-3xl font-extrabold text-[#1b1f2a] tracking-tight">
                  Choose how you enter
                </h2>
                <p className="text-sm font-body text-[#6b7280]">
                  Pick a role to continue
                </p>
              </div>

              {/* Three full-width pill buttons stacked with spacing */}
              <div className="space-y-5">
                {/* 1. Issuer */}
                <div className="space-y-1.5">
                  <GlassButton
                    variant="secondary"
                    type="button"
                    onClick={() => handleSelectRole("issuer", "/issuer")}
                    className="w-full justify-between px-6"
                  >
                    <span className="font-bold">Enter as Issuer</span>
                    <span className="role-dot role-dot-inactive" />
                  </GlassButton>
                  <p className="text-xs text-center text-[#6b7280]">
                    Medical council. Verifies doctors.
                  </p>
                </div>

                {/* 2. Patient (Primary yellow pill) */}
                <div className="space-y-1.5">
                  <GlassButton
                    variant="primary"
                    type="button"
                    onClick={() => handleSelectRole("patient", "/patient")}
                    className="w-full justify-between px-6 text-[#1b1f2a]"
                  >
                    <span className="font-bold">Enter as Patient</span>
                    <span className="role-dot role-dot-active" />
                  </GlassButton>
                  <p className="text-xs text-center text-[#6b7280]">
                    Owns records. Grants and revokes access.
                  </p>
                </div>

                {/* 3. Doctor */}
                <div className="space-y-1.5">
                  <GlassButton
                    variant="secondary"
                    type="button"
                    onClick={() => handleSelectRole("doctor", "/doctor")}
                    className="w-full justify-between px-6"
                  >
                    <span className="font-bold">Enter as Doctor</span>
                    <span className="role-dot role-dot-inactive" />
                  </GlassButton>
                  <p className="text-xs text-center text-[#6b7280]">
                    Credentialed clinician. Opens records you were given.
                  </p>
                </div>
              </div>

              {/* Thin divider and Network status */}
              <div className="pt-4 border-t border-[rgba(27,31,42,0.08)] space-y-2">
                <div className="text-center text-[11px] font-headline font-bold text-[#6b7280] uppercase tracking-wider">
                  Network
                </div>
                <div className="flex items-center justify-center gap-2 font-mono text-xs text-[#1b1f2a]">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{
                      backgroundColor:
                        rpcOnline === null
                          ? "#9ca3af"
                          : rpcOnline
                          ? "#17803d"
                          : "#b42318",
                    }}
                  />
                  <span className="font-medium">Local validator</span>
                  <span className="text-[#6b7280]">
                    {rpcOnline === null
                      ? "(checking...)"
                      : rpcOnline
                      ? "(online)"
                      : "(offline)"}
                  </span>
                </div>
              </div>

            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
