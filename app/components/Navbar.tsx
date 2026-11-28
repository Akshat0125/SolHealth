"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useSolhealth } from "@/lib/solhealth-context";
import { CLUSTER, makeExplorerUrl } from "@/lib/config";
import { Menu, X, ExternalLink, Copy, Check, ChevronDown } from "lucide-react";

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
    setDemoRole,
    demoRole,
  } = useSolhealth();

  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [activeSection, setActiveSection] = useState<string>("home");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [airdropMessage, setAirdropMessage] = useState<string | null>(null);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const mobileButtonRef = useRef<HTMLButtonElement>(null);

  // Passive window scroll listener for data-scrolled state (window.scrollY > 8)
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 8);
      if (pathname === "/" && window.scrollY < 200) {
        setActiveSection("home");
      }
    };

    // Initialize once on mount so refresh while scrolled is immediately correct
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [pathname]);

  // IntersectionObserver for active section highlight on homepage
  useEffect(() => {
    if (pathname !== "/") return;

    const handleHash = () => {
      const hash = window.location.hash;
      if (hash === "#contact") setActiveSection("contact");
      else if (!hash && window.scrollY < 200) setActiveSection("home");
    };

    handleHash();

    const contactEl = document.getElementById("contact");

    if (!contactEl) return;

    const observer = new IntersectionObserver(
      () => {
        if (window.scrollY < 250) {
          setActiveSection("home");
          return;
        }

        const contactRect = contactEl?.getBoundingClientRect();
        if (contactRect && contactRect.top <= window.innerHeight * 0.65 && contactRect.bottom >= 60) {
          setActiveSection("contact");
          return;
        }
      },
      {
        rootMargin: "-80px 0px -40% 0px",
        threshold: [0, 0.1, 0.3],
      }
    );

    observer.observe(contactEl);
    window.addEventListener("hashchange", handleHash);

    return () => {
      observer.disconnect();
      window.removeEventListener("hashchange", handleHash);
    };
  }, [pathname]);

  // Close connected dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    if (dropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [dropdownOpen]);

  // Close mobile drawer on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  // Close menus on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMobileMenuOpen(false);
        setDropdownOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Close mobile drawer on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        mobileMenuRef.current &&
        !mobileMenuRef.current.contains(e.target as Node) &&
        !mobileButtonRef.current?.contains(e.target as Node)
      ) {
        setMobileMenuOpen(false);
      }
    };
    if (mobileMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [mobileMenuOpen]);

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
    { href: "/#contact", label: "Contact" },
  ];

  const isLinkActive = useCallback(
    (href: string) => {
      const isAnchor = href.startsWith("/#");
      if (pathname === "/") {
        if (isAnchor) {
          if (href === "/#contact" && activeSection === "contact") return true;
          return false;
        }
        return href === "/" && activeSection === "home";
      }

      if (!isAnchor) {
        return href === "/" ? pathname === "/" : pathname.startsWith(href);
      }
      return false;
    },
    [pathname, activeSection]
  );

  const handleNavLinkClick = (href: string) => {
    if (href === "/#contact") setActiveSection("contact");
    else if (href === "/") setActiveSection("home");
    setMobileMenuOpen(false);
  };

  return (
    <>
      {/* Shared Solid Floating Header */}
      <header className="site-header" data-scrolled={scrolled ? "true" : "false"}>
        <div className="site-header__inner">
          
          {/* ==================================================== */}
          {/* 1. LEFT PILL: Brand Logo + Wordmark + VAULT           */}
          {/* ==================================================== */}
          <Link
            href="/"
            onClick={() => handleNavLinkClick("/")}
            aria-label="SolHealth Home"
            className="pill pill--brand group focus-visible:ring-2 focus-visible:ring-[#00B8D9] focus-visible:outline-hidden"
          >
            <div className="w-8 h-8 rounded-xl bg-[#040B1A] flex items-center justify-center p-1.5 shadow-xs group-hover:scale-105 transition-transform shrink-0">
              <Image
                src="/logo.png"
                alt="SolHealth Shield"
                width={32}
                height={32}
                className="object-contain"
                priority
              />
            </div>
            <div className="flex flex-col">
              <span className="font-headline text-base sm:text-lg font-extrabold tracking-tight text-[#040B1A] leading-none">
                SolHealth
              </span>
              <span className="text-[9px] font-mono text-[#64748B] tracking-wider uppercase font-semibold leading-none mt-0.5">
                VAULT
              </span>
            </div>
          </Link>

          {/* ==================================================== */}
          {/* 2. CENTER PILL: Main Navigation Links (Desktop 1024+) */}
          {/* ==================================================== */}
          <nav aria-label="Primary" className="pill pill--nav">
            {navLinks.map((link) => {
              const active = isLinkActive(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  data-active={active ? "true" : "false"}
                  onClick={() => handleNavLinkClick(link.href)}
                  className="nav-link"
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>

          {/* ==================================================== */}
          {/* 3. RIGHT PILL: Devnet Status + Wallet Actions (1024+) */}
          {/* ==================================================== */}
          <div className="pill pill--actions">
            
            {/* Solana Devnet Status Badge */}
            <div
              className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-headline font-semibold shrink-0 whitespace-nowrap transition-colors ${
                rpcOnline === false
                  ? "bg-[#FEE2E2] border-[#FCA5A5] text-[#991B1B]"
                  : rpcOnline === true
                  ? "bg-[#E6FBF8] border-[#99F0E4] text-[#065F6B]"
                  : "bg-[#F7FBFC] border-[#DCEEF2] text-[#64748B]"
              }`}
              title={`Solana ${CLUSTER === "devnet" ? "Devnet" : "Localnet"} Status: ${
                rpcOnline === false ? "Offline" : rpcOnline === true ? "Online (Confirmed)" : "Connecting..."
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full shrink-0 ${
                  rpcOnline === false
                    ? "bg-[#EF4444]"
                    : rpcOnline === true
                    ? "bg-[#14D9C4] animate-pulse"
                    : "bg-[#F59E0B] animate-pulse"
                }`}
                style={{
                  boxShadow:
                    rpcOnline === true
                      ? "0 0 6px rgba(20, 217, 196, 0.8)"
                      : rpcOnline === false
                      ? "0 0 6px rgba(239, 68, 68, 0.8)"
                      : undefined,
                }}
              />
              <span className="text-[11.5px]">
                Solana {CLUSTER === "devnet" ? "Devnet" : "Localnet"}
                {rpcOnline === false ? " (Offline)" : rpcOnline === true ? "" : " (...)"}
              </span>
            </div>

            {/* Demo Mode switcher chip when demo is enabled */}
            {demoEnabled && useDemo && (
              <div className="flex items-center px-2.5 py-1 rounded-full bg-[#E8F7FC] border border-[#9CE0F5] text-xs font-medium text-[#075985] gap-1 shrink-0">
                <span className="font-bold text-[11px]">Demo:</span>
                <select
                  value={demoRole}
                  onChange={(e) => setDemoRole(e.target.value as any)}
                  className="bg-transparent border-none text-xs font-bold text-[#040B1A] focus:outline-hidden cursor-pointer"
                >
                  <option value="patient">Patient</option>
                  <option value="doctor">Doctor</option>
                  <option value="issuer">Publisher</option>
                </select>
              </div>
            )}

            {/* Connect Wallet Button / Connected Dropdown */}
            {!mounted ? (
              <div className="w-28 h-9 rounded-full bg-slate-100 animate-pulse shrink-0" />
            ) : !connected || !publicKey ? (
              <button
                type="button"
                data-ui="btn"
                onClick={openWalletModal}
                className="btn-dark-pill shrink-0 focus-visible:ring-2 focus-visible:ring-[#00B8D9] focus-visible:outline-hidden"
              >
                Connect Wallet
              </button>
            ) : (
              <div className="relative shrink-0" ref={dropdownRef}>
                <button
                  type="button"
                  data-ui="btn"
                  onClick={() => setDropdownOpen((prev) => !prev)}
                  className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#F7FBFC] hover:bg-[#E8F7FC] border border-[#DCEEF2] text-xs font-medium text-[#040B1A] transition-colors focus-visible:ring-2 focus-visible:ring-[#00B8D9] focus-visible:outline-hidden"
                >
                  <span className="w-2.5 h-2.5 rounded-full bg-[#14D9C4] shrink-0" />
                  <span className="font-mono font-bold truncate max-w-[110px]">
                    {shortAddress}
                  </span>
                  <span className="text-xs text-[#64748B] font-mono">
                    {balance.toFixed(2)} SOL
                  </span>
                  <ChevronDown className="w-3.5 h-3.5 text-[#64748B]" />
                </button>

                {/* Connected Wallet Dropdown */}
                {dropdownOpen && (
                  <div
                    className="absolute right-0 mt-2 w-[320px] rounded-2xl bg-[#FFFFFF] border border-[#DCEEF2] shadow-[0_16px_36px_rgba(4,11,26,0.14)] p-4 space-y-3 z-[1010] text-xs animate-in fade-in duration-100 pointer-events-auto"
                  >
                    {/* Address & Copy */}
                    <div className="space-y-1">
                      <div className="text-[10.5px] font-mono uppercase text-[#64748B] tracking-wider">
                        Connected Address
                      </div>
                      <div className="flex items-center justify-between p-2 rounded-xl bg-[#F7FBFC] border border-[#DCEEF2]">
                        <span className="font-mono text-[11px] text-[#040B1A] truncate max-w-[210px]">
                          {publicKey.toBase58()}
                        </span>
                        <button
                          type="button"
                          onClick={copyAddress}
                          className="font-headline font-bold text-[10px] text-[#075985] hover:bg-[#E8F7FC] px-1.5 py-0.5 rounded transition-colors inline-flex items-center gap-1"
                        >
                          {copied ? (
                            <>
                              <Check className="w-3 h-3 text-[#065F6B]" />
                              <span>COPIED</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" />
                              <span>COPY</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Balance */}
                    <div className="flex items-center justify-between px-1">
                      <span className="text-[#64748B] font-headline">Balance</span>
                      <div className="flex items-center gap-1.5 font-bold font-mono text-[#040B1A]">
                        <span>{balance.toFixed(4)} SOL</span>
                        {lowBalance && (
                          <span data-ui="pill" className="text-[10px] text-[#991B1B] bg-[#FEE2E2] px-1.5 py-0.5 rounded-full border border-[#FCA5A5]">
                            Low SOL
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Role Badges */}
                    <div className="space-y-1 pt-2 border-t border-[#DCEEF2]">
                      <div className="text-[10.5px] font-mono uppercase text-[#64748B] tracking-wider">
                        Detected Roles
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {isPublisher && (
                          <span data-ui="pill" className="px-2 py-0.5 rounded-full bg-[#E8F7FC] text-[#075985] border border-[#9CE0F5] font-bold text-[11px]">
                            Publisher
                          </span>
                        )}
                        {isDoctor && (
                          <span data-ui="pill" className="px-2 py-0.5 rounded-full bg-[#E6FBF8] text-[#065F6B] border border-[#99F0E4] font-bold text-[11px]">
                            Doctor
                          </span>
                        )}
                        {isPatient && (
                          <span data-ui="pill" className="px-2 py-0.5 rounded-full bg-[#F7FBFC] border border-[#DCEEF2] text-[#040B1A] font-medium text-[11px]">
                            Patient
                          </span>
                        )}
                        {!isPublisher && !isDoctor && !isPatient && (
                          <span className="text-[11px] text-[#64748B]">New Account</span>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="space-y-1.5 pt-2 border-t border-[#DCEEF2]">
                      <a
                        href={makeExplorerUrl(publicKey.toBase58(), "address")}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-[#F7FBFC] hover:bg-[#E8F7FC] text-[#040B1A] transition-colors"
                      >
                        <span className="font-headline font-semibold">View on Solana Explorer</span>
                        <ExternalLink className="w-3.5 h-3.5 text-[#64748B]" />
                      </a>

                      <button
                        type="button"
                        onClick={handleGetSol}
                        disabled={airdropLoading}
                        className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-[#E6FBF8] hover:bg-[#ccf7f0] text-[#065F6B] font-headline font-bold transition-colors disabled:opacity-50"
                      >
                        <span>{airdropLoading ? "Requesting..." : "Get Devnet SOL"}</span>
                        <span className="font-mono text-xs">+ SOL</span>
                      </button>

                      {airdropRateLimited && (
                        <div className="p-2.5 rounded-xl bg-[#FFF8E6] border border-[#FDE293] text-[11px] text-[#92400E] space-y-1">
                          <div>The public faucet is rate limited.</div>
                          <a
                            href="https://faucet.solana.com"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-bold underline hover:text-[#040B1A] inline-flex items-center gap-1"
                          >
                            <span>Open faucet.solana.com</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      )}

                      {airdropMessage && !airdropRateLimited && (
                        <div className="text-[11px] text-[#065F6B] px-1 font-medium bg-[#E6FBF8] p-1.5 rounded-lg border border-[#99F0E4]">
                          {airdropMessage}
                        </div>
                      )}

                      <button
                        type="button"
                        onClick={async () => {
                          setDropdownOpen(false);
                          await disconnectWallet();
                        }}
                        className="w-full text-left px-3 py-2 rounded-xl text-[#991B1B] hover:bg-[#FEE2E2] transition-colors font-headline font-semibold"
                      >
                        Disconnect
                      </button>
                    </div>

                    {/* Network Disclaimer */}
                    <div className="pt-2 border-t border-[#DCEEF2] text-[10.5px] font-mono text-[#64748B] text-center">
                      Solana {CLUSTER === "devnet" ? "Devnet" : "Localnet"}: test network, no real money
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ==================================================== */}
          {/* Mobile Right Pill (< 1024px): Compact Dot + Hamburger */}
          {/* ==================================================== */}
          <div className="pill pill--mobile-actions">
            {/* Compact Devnet Status Dot */}
            <span
              title={`Solana ${CLUSTER === "devnet" ? "Devnet" : "Localnet"}: ${
                rpcOnline === false ? "Offline" : rpcOnline === true ? "Online (Confirmed)" : "Connecting..."
              }`}
              className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                rpcOnline === false
                  ? "bg-[#EF4444]"
                  : rpcOnline === true
                  ? "bg-[#14D9C4] animate-pulse"
                  : "bg-[#F59E0B] animate-pulse"
              }`}
              style={{
                boxShadow:
                  rpcOnline === true
                    ? "0 0 6px rgba(20, 217, 196, 0.8)"
                    : rpcOnline === false
                    ? "0 0 6px rgba(239, 68, 68, 0.8)"
                    : undefined,
              }}
            />

            {/* Hamburger Toggle Button (min 44x44px target) */}
            <button
              ref={mobileButtonRef}
              type="button"
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full text-[#040B1A] hover:bg-[#F7FBFC] transition-colors focus-visible:ring-2 focus-visible:ring-[#00B8D9] focus-visible:outline-hidden -mr-1"
              aria-label="Toggle navigation menu"
              aria-expanded={mobileMenuOpen}
              aria-controls="mobile-nav-card"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>

        </div>

        {/* ==================================================== */}
        {/* Mobile Floating Card Dropdown Menu (below 1024px)    */}
        {/* ==================================================== */}
        {mobileMenuOpen && (
          <div
            id="mobile-nav-card"
            ref={mobileMenuRef}
            className="mobile-menu-card space-y-3 animate-in fade-in slide-in-from-top-2 duration-150"
          >
            {/* Primary Nav Links */}
            <nav className="flex flex-col space-y-1" aria-label="Mobile Navigation">
              {navLinks.map((link) => {
                const active = isLinkActive(link.href);
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => handleNavLinkClick(link.href)}
                    className={`min-h-[44px] flex items-center px-4 rounded-xl text-sm font-headline font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-[#00B8D9] focus-visible:outline-hidden ${
                      active
                        ? "bg-[#E6FBF8] text-[#065F6B] font-bold border border-[#99F0E4]"
                        : "text-[#1E293B] hover:bg-[#F7FBFC]"
                    }`}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </nav>

            {/* Devnet Status Pill & Demo Role */}
            <div className="pt-2 border-t border-[#DCEEF2] flex flex-col gap-2">
              <div
                className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-full border text-xs font-headline font-semibold w-fit min-h-[40px] transition-colors ${
                  rpcOnline === false
                    ? "bg-[#FEE2E2] border-[#FCA5A5] text-[#991B1B]"
                    : rpcOnline === true
                    ? "bg-[#E6FBF8] border-[#99F0E4] text-[#065F6B]"
                    : "bg-[#F7FBFC] border-[#DCEEF2] text-[#64748B]"
                }`}
                title={`Solana ${CLUSTER === "devnet" ? "Devnet" : "Localnet"} Status`}
              >
                <span
                  className={`w-2 h-2 rounded-full shrink-0 ${
                    rpcOnline === false
                      ? "bg-[#EF4444]"
                      : rpcOnline === true
                      ? "bg-[#14D9C4] animate-pulse"
                      : "bg-[#F59E0B] animate-pulse"
                  }`}
                  style={{
                    boxShadow:
                      rpcOnline === true
                        ? "0 0 6px rgba(20, 217, 196, 0.8)"
                        : rpcOnline === false
                        ? "0 0 6px rgba(239, 68, 68, 0.8)"
                        : undefined,
                  }}
                />
                <span>
                  Solana {CLUSTER === "devnet" ? "Devnet" : "Localnet"}{" "}
                  {rpcOnline === false ? "(Offline)" : rpcOnline === true ? "(Live)" : "(Connecting...)"}
                </span>
              </div>

              {demoEnabled && useDemo && (
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#E8F7FC] border border-[#9CE0F5] text-xs font-headline text-[#075985] min-h-[44px]">
                  <span className="font-bold">Demo Role:</span>
                  <select
                    value={demoRole}
                    onChange={(e) => setDemoRole(e.target.value as any)}
                    className="bg-transparent border-none text-xs font-bold text-[#040B1A] focus:outline-hidden cursor-pointer"
                  >
                    <option value="patient">Patient</option>
                    <option value="doctor">Doctor</option>
                    <option value="issuer">Publisher</option>
                  </select>
                </div>
              )}
            </div>

            {/* Connect Wallet in Mobile Menu */}
            <div className="pt-2 border-t border-[#DCEEF2]">
              {!mounted ? (
                <div className="w-full h-11 rounded-full bg-slate-100 animate-pulse" />
              ) : !connected || !publicKey ? (
                <button
                  type="button"
                  data-ui="btn"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    openWalletModal();
                  }}
                  className="btn-dark-pill w-full justify-center min-h-[44px] text-sm"
                >
                  Connect Wallet
                </button>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#F7FBFC] border border-[#DCEEF2]">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#14D9C4] shrink-0" />
                      <span className="font-mono text-xs font-bold text-[#040B1A]">
                        {shortAddress}
                      </span>
                    </div>
                    <span className="font-mono text-xs text-[#64748B]">
                      {balance.toFixed(2)} SOL
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={async () => {
                      setMobileMenuOpen(false);
                      await disconnectWallet();
                    }}
                    className="w-full min-h-[44px] flex items-center justify-center px-4 py-2 rounded-xl text-xs text-[#991B1B] hover:bg-[#FEE2E2] border border-[#FCA5A5] transition-colors font-headline font-semibold"
                  >
                    Disconnect Wallet
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Network Unreachable Banner */}
        {mounted && rpcOnline === false && (
          <div className="mt-2 max-w-[1280px] mx-auto px-4 pointer-events-auto">
            <div className="bg-[#FEE2E2] border border-[#FCA5A5] px-4 py-2 rounded-xl text-center text-xs font-semibold text-[#991B1B] shadow-sm">
              Solana RPC endpoint ({CLUSTER}) is unreachable. Check your network or local validator.
            </div>
          </div>
        )}

        {/* Program Not Deployed Banner */}
        {mounted && rpcOnline === true && programDeployed === false && (
          <div className="mt-2 max-w-[1280px] mx-auto px-4 pointer-events-auto">
            <div className="bg-[#FFF8E6] border border-[#FDE293] px-4 py-2 rounded-xl text-center text-xs font-bold text-[#92400E] shadow-sm">
              SolHealth program is not deployed on this network. Run npm run demo:reset in a terminal.
            </div>
          </div>
        )}
      </header>
    </>
  );
}
