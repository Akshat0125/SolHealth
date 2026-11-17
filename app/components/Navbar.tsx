"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSolhealth } from "@/lib/solhealth-context";
import { CLUSTER, makeExplorerUrl } from "@/lib/config";
import { formatShortAddress } from "@/lib/format";

export function Navbar() {
  const {
    mounted,
    connected,
    publicKey,
    shortAddress,
    balance,
    lowBalance,
    openWalletModal,
    disconnectWallet,
    isPublisher,
    isDoctor,
    isPatient,
    requestAirdrop,
    airdropLoading,
    airdropRateLimited,
    rpcOnline,
    programDeployed,
    demoEnabled,
    useDemo,
    setUseDemo,
    demoRole,
    setDemoRole,
  } = useSolhealth();

  const pathname = usePathname();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [airdropMessage, setAirdropMessage] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const copyAddress = async () => {
    if (!publicKey) return;
    try {
      await navigator.clipboard.writeText(publicKey.toBase58());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  };

  const handleGetSol = async () => {
    const res = await requestAirdrop();
    setAirdropMessage(res.message);
    setTimeout(() => setAirdropMessage(null), 5000);
  };

  const navLinks = [
    { href: "/", label: "Home" },
    { href: "/publisher", label: "Publisher" },
    { href: "/patient", label: "Patient" },
    { href: "/doctor", label: "Doctor" },
    { href: "/audit", label: "Audit" },
  ];

  return (
    <>
      <header className="sticky top-0 z-40 bg-[#ffffff]/85 backdrop-blur-md rounded-b-[24px] border-b border-[rgba(27,31,42,0.06)] shadow-[0_4px_20px_rgba(27,31,42,0.03)]">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-3.5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            {/* Left: Wordmark & Navigation Links */}
            <div className="flex items-center space-x-6">
              <Link href="/" className="flex items-center space-x-2 text-decoration-none">
                <span className="font-headline text-2xl font-extrabold tracking-tight text-[#1b1f2a]">
                  SolHealth
                </span>
              </Link>

              <nav className="hidden md:flex items-center space-x-1.5">
                {navLinks.map((link) => {
                  const isActive =
                    link.href === "/"
                      ? pathname === "/"
                      : pathname.startsWith(link.href);
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      className={`text-xs font-semibold px-3 py-1.5 rounded-full transition-colors ${
                        isActive
                          ? "bg-[#fff1cc] text-[#8a5a00] font-bold"
                          : "text-[#6b7280] hover:text-[#1b1f2a] hover:bg-black/5"
                      }`}
                    >
                      {link.label}
                    </Link>
                  );
                })}
              </nav>
            </div>

            {/* Right: Demo switcher (if active) & Single Wallet Button */}
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              {/* Demo Mode switcher chip when demo is enabled */}
              {demoEnabled && useDemo && (
                <div className="flex items-center bg-[#fff8d6] border border-[#fde293] px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full text-xs font-medium text-[#8a5a00] gap-1 sm:gap-1.5 shrink-0">
                  <span className="font-bold">Demo:</span>
                  <select
                    value={demoRole}
                    onChange={(e) => setDemoRole(e.target.value as any)}
                    className="bg-transparent border-none text-xs font-bold text-[#1b1f2a] focus:outline-hidden cursor-pointer"
                  >
                    <option value="patient">Patient</option>
                    <option value="doctor">Doctor</option>
                    <option value="issuer">Publisher</option>
                  </select>
                </div>
              )}

              {/* Wallet Button */}
              {!mounted ? (
                <div className="w-28 h-9 rounded-full bg-black/5 animate-pulse" />
              ) : !connected || !publicKey ? (
                <button
                  type="button"
                  data-ui="btn"
                  onClick={openWalletModal}
                  className="px-4 py-2 rounded-full bg-[#f9c933] text-[#1b1f2a] font-headline font-bold text-xs shadow-xs hover:bg-[#ebd052] transition-all hover:scale-102 active:scale-98"
                >
                  Connect wallet
                </button>
              ) : (
                <div className="relative" ref={dropdownRef}>
                  {/* Connected Wallet Pill */}
                  <button
                    type="button"
                    data-ui="btn"
                    onClick={() => setDropdownOpen((prev) => !prev)}
                    className="flex items-center gap-[10px] px-3.5 py-1.5 rounded-full bg-white border border-[rgba(27,31,42,0.08)] shadow-[0_2px_8px_rgba(27,31,42,0.04)] hover:border-[#f9c933] transition-all text-xs font-medium text-[#1b1f2a]"
                  >
                    <span className="w-3 h-3 min-w-3 min-h-3 rounded-full bg-[#17803d] shrink-0" />
                    <span className="font-mono font-bold truncate max-w-[120px] sm:max-w-none">{shortAddress}</span>
                    <span className="hidden sm:inline text-xs text-[#6b7280] whitespace-nowrap">
                      {balance.toFixed(2)} SOL
                    </span>
                    <span className="text-[10px] text-[#6b7280]">▼</span>
                  </button>

                  {/* Connected Wallet Dropdown */}
                  {dropdownOpen && (
                    <div
                      className="absolute right-0 mt-2 w-[300px] rounded-[22px] bg-[#fffdf6]/98 border border-[rgba(27,31,42,0.08)] shadow-[0_16px_36px_rgba(27,31,42,0.12)] p-4 space-y-3 z-50 text-xs animate-in fade-in duration-100"
                      style={{ backdropFilter: "blur(18px)" }}
                    >
                      {/* Address & Copy */}
                      <div className="space-y-1">
                        <div className="text-[11px] font-mono uppercase text-[#6b7280]">
                          Connected Address
                        </div>
                        <div className="flex items-center justify-between p-2 rounded-[14px] bg-white border border-[rgba(27,31,42,0.06)]">
                          <span className="font-mono text-[11px] text-[#1b1f2a] truncate max-w-[200px]">
                            {publicKey.toBase58()}
                          </span>
                          <button
                            type="button"
                            data-ui="btn"
                            onClick={copyAddress}
                            className="font-headline font-bold text-[10px] text-[#8a5a00] hover:bg-[#fff1cc] px-1.5 py-0.5 rounded-md transition-colors"
                          >
                            {copied ? "COPIED" : "COPY"}
                          </button>
                        </div>
                      </div>

                      {/* Balance */}
                      <div className="flex items-center justify-between px-1">
                        <span className="text-[#6b7280]">Balance</span>
                        <div className="flex items-center gap-1.5 font-bold font-mono text-[#1b1f2a]">
                          <span>{balance.toFixed(4)} SOL</span>
                          {lowBalance && (
                            <span data-ui="pill" className="text-[10px] text-[#b42318] bg-[#fde8e6] px-1.5 py-0.2 rounded-full">
                              Low SOL
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Role Badges */}
                      <div className="space-y-1 pt-1 border-t border-[rgba(27,31,42,0.06)]">
                        <div className="text-[11px] font-mono uppercase text-[#6b7280]">
                          Detected Roles
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {isPublisher && (
                            <span data-ui="pill" className="px-2 py-0.5 rounded-full bg-[#fff1cc] text-[#8a5a00] font-bold text-[11px]">
                              Publisher
                            </span>
                          )}
                          {isDoctor && (
                            <span data-ui="pill" className="px-2 py-0.5 rounded-full bg-[#e3f6e9] text-[#17803d] font-bold text-[11px]">
                              Doctor
                            </span>
                          )}
                          {isPatient && (
                            <span data-ui="pill" className="px-2 py-0.5 rounded-full bg-white border border-[rgba(27,31,42,0.08)] text-[#1b1f2a] font-medium text-[11px]">
                              Patient
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="space-y-1.5 pt-2 border-t border-[rgba(27,31,42,0.06)]">
                        <a
                          data-ui="btn"
                          href={makeExplorerUrl(publicKey.toBase58(), "address")}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-full flex items-center justify-between px-3 py-1.5 rounded-[12px] bg-white hover:bg-black/5 text-[#1b1f2a] transition-colors"
                        >
                          <span>View on Explorer</span>
                          <span className="text-[#6b7280]">↗</span>
                        </a>

                        <button
                          type="button"
                          data-ui="btn"
                          onClick={handleGetSol}
                          disabled={airdropLoading}
                          className="w-full flex items-center justify-between px-3 py-1.5 rounded-[12px] bg-[#fff9e6] hover:bg-[#fff1cc] text-[#8a5a00] font-semibold transition-colors disabled:opacity-50"
                        >
                          <span>{airdropLoading ? "Requesting..." : "Get Devnet SOL"}</span>
                          <span>+ SOL</span>
                        </button>

                        {airdropRateLimited && (
                          <div className="p-2 rounded-[12px] bg-[#fde8e6] border border-[#fbd0cb] text-[11px] text-[#b42318] space-y-1">
                            <div>The public faucet is rate limited.</div>
                            <a
                              data-ui="btn"
                              href="https://faucet.solana.com"
                              target="_blank"
                              rel="noopener noreferrer"
                              className="font-bold underline"
                            >
                              Open faucet.solana.com ↗
                            </a>
                          </div>
                        )}

                        {airdropMessage && !airdropRateLimited && (
                          <div className="text-[11px] text-[#17803d] px-1 font-medium">
                            {airdropMessage}
                          </div>
                        )}

                        <button
                          type="button"
                          data-ui="btn"
                          onClick={async () => {
                            setDropdownOpen(false);
                            await disconnectWallet();
                          }}
                          className="w-full text-left px-3 py-1.5 rounded-[12px] text-[#b42318] hover:bg-[#fde8e6] transition-colors"
                        >
                          Disconnect
                        </button>
                      </div>

                      {/* Bottom disclaimer */}
                      <div className="pt-2 border-t border-[rgba(27,31,42,0.06)] text-[10.5px] text-[#6b7280] text-center">
                        Solana {CLUSTER === "devnet" ? "Devnet" : "Localnet"}: test network, no real money
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Network & Health Banners */}
      {mounted && rpcOnline === false && (
        <div className="bg-[#fde8e6] border-b border-[#fbd0cb] px-4 py-2 text-center text-xs font-semibold text-[#b42318]">
          Solana RPC endpoint ({CLUSTER}) is unreachable. Check your network or local validator.
        </div>
      )}

      {mounted && rpcOnline === true && programDeployed === false && (
        <div className="bg-[#fff8d6] border-b border-[#fde293] px-4 py-2 text-center text-xs font-bold text-[#8a5a00]">
          SolHealth program is not deployed on this network. Run npm run demo:reset in a terminal.
        </div>
      )}
    </>
  );
}
