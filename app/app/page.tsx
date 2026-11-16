"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSolhealth } from "@/lib/solhealth-context";
import { CLUSTER } from "@/lib/config";
import { GlassButton } from "@/components/GlassButton";

export default function HomePage() {
  const {
    mounted,
    connected,
    publicKey,
    shortAddress,
    wallets,
    selectWallet,
    encryptionStatus,
    activateEncryption,
    encryptionError,
    isPublisher,
    isDoctor,
    configState,
    rpcOnline,
    demoEnabled,
    useDemo,
    setUseDemo,
    demoRole,
    setDemoRole,
  } = useSolhealth();

  const router = useRouter();
  const [activating, setActivating] = useState(false);

  const handleActivate = async () => {
    setActivating(true);
    await activateEncryption();
    setActivating(false);
  };

  const handleSelectRole = (path: string) => {
    router.push(path);
  };

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
          {/* LEFT HALF: BRAND & HOW IT WORKS                           */}
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
                  <span>Connect wallet and activate deterministic encryption.</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[#8a5a00] font-bold">02</span>
                  <span>Encrypt health files locally in memory (AES-256-GCM).</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[#8a5a00] font-bold">03</span>
                  <span>Pin ciphertext on IPFS and register on Solana.</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[#8a5a00] font-bold">04</span>
                  <span>Grant, expire, or revoke doctor access on-chain.</span>
                </div>
              </div>

              {/* Status / Features summary */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 text-xs">
                <div className="rounded-[18px] bg-white/80 border border-white/90 p-3.5 space-y-1 shadow-xs">
                  <div className="font-headline font-bold text-[#17803d] uppercase tracking-wider text-[11px]">
                    Zero Key Exposure
                  </div>
                  <p className="text-[#6b7280]">
                    Private keys never leave your device. Encryption keys derive from wallet signatures.
                  </p>
                </div>
                <div className="rounded-[18px] bg-white/80 border border-white/90 p-3.5 space-y-1 shadow-xs">
                  <div className="font-headline font-bold text-[#8a5a00] uppercase tracking-wider text-[11px]">
                    Auditable Access
                  </div>
                  <p className="text-[#6b7280]">
                    Every doctor access emits an immutable on-chain event inspectable in the audit log.
                  </p>
                </div>
              </div>
            </div>

            <div className="pt-6 text-xs font-mono text-[#6b7280]">
              Network: Solana {CLUSTER === "devnet" ? "Devnet" : "Localnet"}
            </div>
          </div>

          {/* ======================================================== */}
          {/* RIGHT HALF: CONNECT WALLET OR GET STARTED CHECKLIST      */}
          {/* ======================================================== */}
          <div className="p-8 sm:p-10 lg:p-12 flex flex-col justify-center bg-white">
            <div className="max-w-[420px] w-full mx-auto space-y-6">
              {!mounted ? (
                <div className="space-y-4 py-8 animate-pulse">
                  <div className="h-8 bg-black/5 rounded-lg w-3/4 mx-auto" />
                  <div className="h-12 bg-black/5 rounded-2xl" />
                  <div className="h-12 bg-black/5 rounded-2xl" />
                </div>
              ) : !connected || !publicKey ? (
                /* STATE 1: DISCONNECTED -> CONNECT YOUR WALLET */
                <div className="space-y-6">
                  <div className="text-center space-y-1.5">
                    <h2 className="font-headline text-3xl font-extrabold text-[#1b1f2a] tracking-tight">
                      Connect your wallet
                    </h2>
                    <p className="text-sm font-body text-[#6b7280]">
                      Connect a Solana wallet to get started with SolHealth
                    </p>
                  </div>

                  {/* List of detected wallets */}
                  <div className="space-y-2.5">
                    {wallets.length > 0 ? (
                      wallets
                        .filter(
                          (w) =>
                            w.readyState === "Installed" ||
                            w.readyState === "Loadable"
                        )
                        .map((w) => (
                          <button
                            key={w.adapter.name}
                            type="button"
                            onClick={() => selectWallet(w.adapter.name)}
                            className="w-full flex items-center justify-between px-4 py-3.5 rounded-[20px] bg-[#fffdf6] border border-[rgba(27,31,42,0.08)] shadow-xs hover:border-[#f9c933] hover:bg-[#fff9e6] transition-all group"
                          >
                            <div className="flex items-center gap-3">
                              {w.adapter.icon && (
                                <Image
                                  src={w.adapter.icon}
                                  alt={w.adapter.name}
                                  width={30}
                                  height={30}
                                  className="rounded-full"
                                  unoptimized
                                />
                              )}
                              <span className="font-headline font-bold text-sm text-[#1b1f2a] group-hover:text-[#8a5a00]">
                                {w.adapter.name}
                              </span>
                            </div>
                            <span className="text-xs font-mono font-medium text-[#17803d] bg-[#e3f6e9] px-2.5 py-0.5 rounded-full">
                              Connect
                            </span>
                          </button>
                        ))
                    ) : null}

                    {/* Fallback Install Phantom link */}
                    <div className="p-4 text-center rounded-[20px] bg-[#fff8d6] border border-[#fde293] space-y-2">
                      <p className="text-xs font-medium text-[#8a5a00]">
                        Don’t have a Solana wallet yet?
                      </p>
                      <a
                        href="https://phantom.app/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-[#f9c933] text-[#1b1f2a] font-headline font-bold text-xs shadow-xs hover:bg-[#ebd052] transition-colors"
                      >
                        Install Phantom ↗
                      </a>
                    </div>
                  </div>

                  {/* Demo toggle (only if ENABLE_DEMO is true) */}
                  {demoEnabled && (
                    <div className="pt-4 border-t border-[rgba(27,31,42,0.08)]">
                      <label className="flex items-center justify-between p-3 rounded-[16px] bg-[#fffdf6] border border-[rgba(27,31,42,0.06)] cursor-pointer">
                        <div className="space-y-0.5">
                          <div className="text-xs font-headline font-bold text-[#1b1f2a]">
                            Use demo identities
                          </div>
                          <div className="text-[11px] text-[#6b7280]">
                            Simulate roles with in-browser keypairs
                          </div>
                        </div>
                        <input
                          type="checkbox"
                          checked={useDemo}
                          onChange={(e) => setUseDemo(e.target.checked)}
                          className="w-4 h-4 accent-[#f9c933] cursor-pointer"
                        />
                      </label>
                    </div>
                  )}
                </div>
              ) : (
                /* STATE 2: CONNECTED -> GET STARTED CHECKLIST & ROLE CARDS */
                <div className="space-y-6">
                  <div className="text-center space-y-1">
                    <h2 className="font-headline text-2xl sm:text-3xl font-extrabold text-[#1b1f2a] tracking-tight">
                      Get started
                    </h2>
                    <p className="text-xs font-mono text-[#6b7280]">
                      Connected: {shortAddress}
                    </p>
                  </div>

                  {/* 3-Step Checklist */}
                  <div className="p-4 rounded-[22px] bg-[#fffdf6] border border-[rgba(27,31,42,0.08)] space-y-2.5">
                    {/* Step 1: Wallet connected */}
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 font-medium text-[#1b1f2a]">
                        <span className="w-5 h-5 rounded-full bg-[#e3f6e9] text-[#17803d] font-bold flex items-center justify-center text-[10px]">
                          ✓
                        </span>
                        <span>1. Wallet connected</span>
                      </div>
                      <span className="font-mono text-[#17803d] font-semibold text-[11px]">
                        Ready
                      </span>
                    </div>

                    {/* Step 2: Encryption activated */}
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 font-medium text-[#1b1f2a]">
                        {encryptionStatus === "ready" ? (
                          <span className="w-5 h-5 rounded-full bg-[#e3f6e9] text-[#17803d] font-bold flex items-center justify-center text-[10px]">
                            ✓
                          </span>
                        ) : (
                          <span className="w-5 h-5 rounded-full bg-[#fff1cc] text-[#8a5a00] font-bold flex items-center justify-center text-[10px]">
                            2
                          </span>
                        )}
                        <span>2. Encryption session</span>
                      </div>

                      {encryptionStatus === "ready" ? (
                        <span className="font-mono text-[#17803d] font-semibold text-[11px]">
                          Active
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={handleActivate}
                          disabled={activating}
                          className="px-2.5 py-1 rounded-full bg-[#f9c933] text-[#1b1f2a] font-headline font-bold text-[11px] shadow-xs hover:bg-[#ebd052] disabled:opacity-50"
                        >
                          {activating ? "Activating..." : "Activate"}
                        </button>
                      )}
                    </div>

                    {encryptionError && (
                      <div className="p-2.5 rounded-[12px] bg-[#fde8e6] border border-[#fbd0cb] text-[11px] text-[#b42318] leading-relaxed">
                        {encryptionError}
                      </div>
                    )}

                    {/* Step 3: Choose your role */}
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 font-medium text-[#1b1f2a]">
                        <span className="w-5 h-5 rounded-full bg-black/5 text-[#6b7280] font-bold flex items-center justify-center text-[10px]">
                          3
                        </span>
                        <span>3. Choose your role</span>
                      </div>
                      <span className="text-[#6b7280] text-[11px]">Select below</span>
                    </div>
                  </div>

                  {/* Three Role Cards with eligibility text and single-blink hover */}
                  <div className="space-y-4">
                    {/* Role 1: Publisher */}
                    <div className="space-y-1">
                      <button
                        type="button"
                        onClick={() => handleSelectRole("/publisher")}
                        className="home-role-pill"
                      >
                        <span>Enter as Publisher</span>
                      </button>
                      <p className="text-xs text-center text-[#6b7280]">
                        {isPublisher
                          ? "Authority recognized • Can verify doctors"
                          : configState?.exists
                          ? "Requires registry authority wallet"
                          : "Registry not initialized yet • Ready to set up"}
                      </p>
                    </div>

                    {/* Role 2: Patient */}
                    <div className="space-y-1">
                      <button
                        type="button"
                        onClick={() => handleSelectRole("/patient")}
                        className="home-role-pill"
                      >
                        <span>Enter as Patient</span>
                      </button>
                      <p className="text-xs text-center text-[#6b7280]">
                        Ready to upload, encrypt, and share records
                      </p>
                    </div>

                    {/* Role 3: Doctor */}
                    <div className="space-y-1">
                      <button
                        type="button"
                        onClick={() => handleSelectRole("/doctor")}
                        className="home-role-pill"
                      >
                        <span>Enter as Doctor</span>
                      </button>
                      <p className="text-xs text-center text-[#6b7280]">
                        {isDoctor
                          ? "Active medical credential recognized"
                          : "Verification needed from Publisher authority"}
                      </p>
                    </div>
                  </div>

                  {/* Demo toggle when enabled */}
                  {demoEnabled && (
                    <div className="pt-3 border-t border-[rgba(27,31,42,0.06)]">
                      <label className="flex items-center justify-between text-xs text-[#6b7280] cursor-pointer">
                        <span>Use demo identities</span>
                        <input
                          type="checkbox"
                          checked={useDemo}
                          onChange={(e) => setUseDemo(e.target.checked)}
                          className="w-4 h-4 accent-[#f9c933] cursor-pointer"
                        />
                      </label>
                    </div>
                  )}
                </div>
              )}

              {/* Network status */}
              <div className="pt-2 border-t border-[rgba(27,31,42,0.08)] flex items-center justify-center gap-2 font-mono text-xs text-[#1b1f2a]">
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
                <span className="font-medium">
                  Solana {CLUSTER === "devnet" ? "Devnet" : "Localnet"}
                </span>
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
  );
}
