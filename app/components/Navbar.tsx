"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useRole, Role } from "@/lib/roles";
import { formatShortAddress } from "@/lib/format";

export function Navbar() {
  const {
    role,
    setRole,
    activeKeypair,
    balances,
    fundAll,
    loading,
    ready,
    rpcOnline,
  } = useRole();

  const pathname = usePathname();
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const [funding, setFunding] = useState(false);
  const [fundToast, setFundToast] = useState<{ type: "ok" | "err"; message: string } | null>(null);

  const address = ready && activeKeypair ? activeKeypair.publicKey.toBase58() : null;
  const shortAddress = ready && address ? formatShortAddress(address, 4) : "----";
  const balanceVal = ready ? balances[role] ?? 0 : null;

  const copyAddress = async () => {
    if (!address) return;
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // fallback
    }
  };

  const handleFundWallets = async () => {
    if (!ready || funding || loading) return;
    setFunding(true);
    setFundToast(null);
    try {
      await fundAll(5);
      setFundToast({ type: "ok", message: "Successfully airdropped 5 SOL to all 3 role wallets." });
      setTimeout(() => setFundToast(null), 4000);
    } catch (err: any) {
      setFundToast({ type: "err", message: err?.message || "Failed to fund wallets. Check local validator." });
      setTimeout(() => setFundToast(null), 5000);
    } finally {
      setFunding(false);
    }
  };

  const handleRoleSelect = (newRole: Role) => {
    setRole(newRole);
    if (newRole === "issuer") router.push("/issuer");
    else if (newRole === "patient") router.push("/patient");
    else if (newRole === "doctor") router.push("/doctor");
  };

  const rolesList: { id: Role; label: string }[] = [
    { id: "issuer", label: "Issuer" },
    { id: "patient", label: "Patient" },
    { id: "doctor", label: "Doctor" },
  ];

  const isHomePage = pathname === "/";

  return (
    <>
      <header className="sticky top-0 z-50 bg-[#ffffff]/80 backdrop-blur-md rounded-b-[24px] border-b border-[rgba(27,31,42,0.06)] shadow-[0_4px_20px_rgba(27,31,42,0.03)]">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-3.5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            
            {/* Left: Wordmark & Navigation Links */}
            <div className="flex items-center space-x-6">
              <Link href="/" className="flex items-center space-x-2 text-decoration-none">
                <span className="font-headline text-2xl font-extrabold tracking-tight text-[#1b1f2a]">
                  SolHealth
                </span>
              </Link>

              <nav className="flex items-center space-x-2">
                <Link
                  href="/"
                  className={`text-xs font-semibold px-3 py-1.5 rounded-full transition-colors ${
                    isHomePage
                      ? "bg-[#fff1cc] text-[#8a5a00] font-bold"
                      : "text-[#6b7280] hover:text-[#1b1f2a] hover:bg-black/5"
                  }`}
                >
                  Home
                </Link>
                <Link
                  href="/audit"
                  className={`text-xs font-semibold px-3 py-1.5 rounded-full transition-colors ${
                    pathname === "/audit"
                      ? "bg-[#fff1cc] text-[#8a5a00] font-bold"
                      : "text-[#6b7280] hover:text-[#1b1f2a] hover:bg-black/5"
                  }`}
                >
                  Audit
                </Link>
              </nav>
            </div>

            {/* Center: Role Switcher (Hidden on home page since home is the role chooser) */}
            {!isHomePage && (
              <div className="flex items-center bg-[#fff8d6] p-1 rounded-full border border-[rgba(27,31,42,0.08)]">
                {rolesList.map((r) => {
                  const isActive = ready && role === r.id;
                  return (
                    <button
                      key={r.id}
                      onClick={() => handleRoleSelect(r.id)}
                      className={`flex items-center space-x-2 px-3.5 py-1 text-xs font-semibold rounded-full transition-all ${
                        isActive
                          ? "bg-white text-[#1b1f2a] font-bold shadow-[0_2px_8px_rgba(27,31,42,0.08)]"
                          : "text-[#6b7280] hover:text-[#1b1f2a]"
                      }`}
                    >
                      <span
                        className={`role-dot ${isActive ? "role-dot-active" : "role-dot-inactive"}`}
                      />
                      <span>{r.label}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Right: Connected Wallet Chip & Fund Wallets Button */}
            <div className="flex items-center space-x-3">
              {/* Connected Wallet Display */}
              <div className="flex items-center bg-white border border-[rgba(27,31,42,0.08)] shadow-[0_2px_8px_rgba(27,31,42,0.04)] px-3.5 py-1.5 rounded-full text-xs font-medium text-[#1b1f2a] gap-3">
                <div className="flex items-center space-x-1.5">
                  <span className={`role-dot ${ready ? "role-dot-active" : "role-dot-inactive"}`} />
                  <span className="font-bold">
                    {ready ? role.charAt(0).toUpperCase() + role.slice(1) : "----"}
                  </span>
                </div>

                <div className="h-3 w-[1px] bg-[rgba(27,31,42,0.12)]" />

                <div className="flex items-center space-x-1">
                  <span className="font-mono text-xs text-[#6b7280]">{shortAddress}</span>
                  <button
                    onClick={copyAddress}
                    disabled={!ready || !address}
                    className="font-bold uppercase text-[10px] text-[#1b1f2a] hover:bg-[#fff1cc] px-1.5 py-0.5 rounded-md disabled:opacity-40"
                  >
                    {copied ? "COPIED" : "COPY"}
                  </button>
                </div>

                <div className="h-3 w-[1px] bg-[rgba(27,31,42,0.12)]" />

                <div className="font-semibold text-xs">
                  {balanceVal !== null ? `${balanceVal.toFixed(2)} SOL` : "----"}
                </div>
              </div>

              {/* Restored FUND WALLETS Button */}
              <button
                onClick={handleFundWallets}
                disabled={!ready || funding || loading}
                className="btn-secondary btn-sm"
              >
                {funding ? (
                  <span className="flex items-center">
                    Funding
                    <span className="dot-pulse">
                      <span />
                      <span />
                      <span />
                    </span>
                  </span>
                ) : (
                  "Fund Wallets"
                )}
              </button>
            </div>

          </div>
        </div>
      </header>

      {/* Toast feedback for Fund Wallets */}
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

      {/* Unreachable RPC Banner on every page when validator is not responding */}
      {rpcOnline === false && (
        <div className="bg-[#fde8e6] text-[#b42318] px-4 py-2.5 text-center text-xs font-medium border-b border-[#fca5a5]">
          Local validator not reachable. Run <code className="font-mono bg-white/70 px-1.5 py-0.5 rounded">solana-test-validator</code> in a terminal.
        </div>
      )}
    </>
  );
}
