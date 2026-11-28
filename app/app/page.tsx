"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSolhealth } from "@/lib/solhealth-context";
import {
  Shield,
  Lock,
  Key,
  HardDrive,
  FileCheck,
  CheckCircle2,
  XCircle,
  ArrowRight,
  ExternalLink,
  ChevronDown,
  Mail,
  Layers,
  Database,
  Cpu,
} from "lucide-react";

// Set to true to restore the About Us / Team grid section on the homepage.
const SHOW_ABOUT = false;

export default function HomePage() {
  const {
    connected,
    openWalletModal,
  } = useSolhealth();

  const router = useRouter();

  // Sandbox state (Section E.4)
  const [activeTab, setActiveTab] = useState<number>(3); // Default to Step 04 for interactive demo
  const [sampleGrantStatus, setSampleGrantStatus] = useState<"active" | "expired" | "revoked">("active");
  const [auditLog, setAuditLog] = useState<Array<{ time: string; event: string; tx: string; status: string }>>([
    {
      time: "10:14:22 UTC",
      event: "GrantAccess(record: #847192, clinician: Attending Physician, window: 24h)",
      tx: "5xK9...8f2a",
      status: "Active · Confirmed",
    },
  ]);

  // Role preview tab (Section E.6)
  const [activeRoleTab, setActiveRoleTab] = useState<"patient" | "doctor" | "publisher" | "audit">("patient");
  const [activeHoverField, setActiveHoverField] = useState<string | null>(null);

  // FAQ accordion state (Section E.9)
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  // Step 4 Sandbox actions (local simulation only)
  const handleGrantAccess = () => {
    setSampleGrantStatus("active");
    const now = new Date().toTimeString().split(" ")[0] + " UTC";
    const randomHex = Math.random().toString(36).substring(2, 6);
    setAuditLog((prev) => [
      {
        time: now,
        event: "GrantAccess(record: #847192, clinician: Attending Physician, window: 24h)",
        tx: `4mB2...${randomHex}`,
        status: "Active · Permitted",
      },
      ...prev.slice(0, 4),
    ]);
  };

  const handleExpireAccess = () => {
    setSampleGrantStatus("expired");
    const now = new Date().toTimeString().split(" ")[0] + " UTC";
    const randomHex = Math.random().toString(36).substring(2, 6);
    setAuditLog((prev) => [
      {
        time: now,
        event: "AccessExpired(record: #847192, clinician: Attending Physician, reason: TimeElapsed)",
        tx: `7aX9...${randomHex}`,
        status: "Expired · Blocked",
      },
      ...prev.slice(0, 4),
    ]);
  };

  const handleRevokeAccess = () => {
    setSampleGrantStatus("revoked");
    const now = new Date().toTimeString().split(" ")[0] + " UTC";
    const randomHex = Math.random().toString(36).substring(2, 6);
    setAuditLog((prev) => [
      {
        time: now,
        event: "RevokeAccess(record: #847192, clinician: Attending Physician, caller: Owner)",
        tx: `9zQ1...${randomHex}`,
        status: "Revoked · Blocked",
      },
      ...prev.slice(0, 4),
    ]);
  };

  const handleEmergencyAccess = () => {
    const now = new Date().toTimeString().split(" ")[0] + " UTC";
    const randomHex = Math.random().toString(36).substring(2, 6);
    setAuditLog((prev) => [
      {
        time: now,
        event: "EmergencyAccessSimulated(record: #847192, scope: TriageSummary, mode: LocalSim)",
        tx: `3eM7...${randomHex}`,
        status: "Simulated · Audit Logged",
      },
      ...prev.slice(0, 4),
    ]);
  };

  return (
    <div className="relative min-h-screen bg-[#FFFFFF] overflow-x-clip">
      
      {/* Ambient background glows */}
      <div
        aria-hidden="true"
        className="fixed pointer-events-none select-none z-0 top-[-100px] right-[-100px] w-[600px] h-[600px] bg-[#E8F7FC] opacity-60 rounded-full blur-[120px]"
      />
      <div
        aria-hidden="true"
        className="fixed pointer-events-none select-none z-0 top-[35%] left-[-120px] w-[600px] h-[600px] bg-[#E6FBF8] opacity-50 rounded-full blur-[120px]"
      />

      <div className="relative z-10 space-y-28 sm:space-y-36 pt-6 sm:pt-8 pb-20 sm:pb-28">

        {/* ======================================================== */}
        {/* E.2 HERO WITH FLOATING STATUS PILLS                      */}
        {/* ======================================================== */}
        <section className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 text-center relative pt-4 sm:pt-10">
          <div className="max-w-4xl mx-auto space-y-7">
            
            {/* Eyebrow badge */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#E6FBF8] border border-[#99F0E4] text-[#065F6B] text-xs font-headline font-bold shadow-xs">
              <span className="w-2 h-2 rounded-full bg-[#14D9C4] animate-pulse" />
              <span>Confidential Medical Vault · Solana Devnet</span>
            </div>

            {/* Headline */}
            <h1 className="font-headline text-4xl sm:text-6xl lg:text-[64px] font-extrabold text-[#040B1A] tracking-tight leading-[1.06]">
              Medical records for people{" "}
              <span className="text-transparent bg-clip-text bg-[linear-gradient(135deg,#00B8D9_0%,#0084C2_100%)]">
                who can&apos;t afford exposure.
              </span>
            </h1>

            {/* Subheadline */}
            <p className="max-w-2xl mx-auto text-base sm:text-xl text-[#1E293B] font-body leading-relaxed">
              A patient-sovereign vault for executives, public officials and service members. Encrypted in your browser, pinned on IPFS, and governed by an immutable audit trail on Solana. You decide who reads what, and the ledger records who did.
            </p>

            {/* CTAs */}
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3.5 sm:gap-4">
              {connected ? (
                <Link
                  href="/patient"
                  className="w-full sm:w-auto glass-btn glass-btn-primary !min-h-[46px] !px-7 text-sm font-headline font-bold shadow-md inline-flex items-center justify-center gap-2"
                >
                  <span>Open Patient Vault</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={openWalletModal}
                  className="w-full sm:w-auto btn-dark-pill !min-h-[46px] !px-7 text-sm font-headline font-bold shadow-md inline-flex items-center justify-center gap-2"
                >
                  <Lock className="w-4 h-4 text-[#14D9C4]" />
                  <span>Connect Wallet / Open Vault</span>
                </button>
              )}

              <a
                href="#sandbox"
                className="w-full sm:w-auto glass-btn glass-btn-secondary !min-h-[46px] !px-7 text-sm font-headline font-semibold inline-flex items-center justify-center gap-2"
              >
                <span>See a record, protected</span>
                <ChevronDown className="w-4 h-4 text-[#64748B]" />
              </a>
            </div>

            {/* Honest Devnet Prototype Line */}
            <p className="text-xs font-mono text-[#64748B] max-w-xl mx-auto">
              Prototype running on Solana Devnet. Test network, no real money. Do not upload real medical data.
            </p>

            {/* 5 Floating Micro-Status Cards */}
            <div className="pt-8 sm:pt-12">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 max-w-5xl mx-auto">
                {/* 1. Encrypted locally */}
                <div className="p-3.5 rounded-xl bg-[#E6FBF8] border border-[#99F0E4] text-[#065F6B] text-left space-y-1 shadow-xs animate-float-1">
                  <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#065F6B]/80 flex items-center justify-between">
                    <span>Client Cryptography</span>
                    <Lock className="w-3 h-3" />
                  </div>
                  <div className="font-mono font-bold text-xs text-[#040B1A]">
                    Encrypted locally · AES-256-GCM
                  </div>
                </div>

                {/* 2. Ciphertext pinned */}
                <div className="p-3.5 rounded-xl bg-[#E8F7FC] border border-[#9CE0F5] text-[#075985] text-left space-y-1 shadow-xs animate-float-2">
                  <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#075985]/80 flex items-center justify-between">
                    <span>Encrypted Storage</span>
                    <HardDrive className="w-3 h-3" />
                  </div>
                  <div className="font-mono font-bold text-xs text-[#040B1A]">
                    Ciphertext pinned · IPFS CID verified
                  </div>
                </div>

                {/* 3. Access granted */}
                <div className="p-3.5 rounded-xl bg-[#E6FBF8] border border-[#99F0E4] text-[#065F6B] text-left space-y-1 shadow-xs animate-float-1">
                  <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#065F6B]/80 flex items-center justify-between">
                    <span>Need-to-Know</span>
                    <Key className="w-3 h-3" />
                  </div>
                  <div className="font-mono font-bold text-xs text-[#040B1A]">
                    Access granted · Attending physician · 24h window
                  </div>
                </div>

                {/* 4. Revoked on-chain */}
                <div className="p-3.5 rounded-xl bg-[#E8F7FC] border border-[#9CE0F5] text-[#075985] text-left space-y-1 shadow-xs animate-float-2">
                  <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#075985]/80 flex items-center justify-between">
                    <span>Restricted Access</span>
                    <Shield className="w-3 h-3" />
                  </div>
                  <div className="font-mono font-bold text-xs text-[#040B1A]">
                    Revoked on-chain · Instant
                  </div>
                </div>

                {/* 5. Audit logged */}
                <div className="p-3.5 rounded-xl bg-[#E6FBF8] border border-[#99F0E4] text-[#065F6B] text-left space-y-1 shadow-xs sm:col-span-2 lg:col-span-1 animate-float-1">
                  <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#065F6B]/80 flex items-center justify-between">
                    <span>Audit Trail</span>
                    <FileCheck className="w-3 h-3" />
                  </div>
                  <div className="font-mono font-bold text-xs text-[#040B1A]">
                    Audit logged · Every read
                  </div>
                </div>
              </div>
            </div>

          </div>
        </section>

        {/* ======================================================== */}
        {/* E.3 PROBLEM NARRATIVE STRIP ("Who has seen your file?")  */}
        {/* ======================================================== */}
        <section className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="rounded-2xl bg-[#F7FBFC] border border-[#DCEEF2] p-6 sm:p-10 space-y-8">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
              <div className="space-y-1.5">
                <div className="text-xs font-mono font-bold uppercase tracking-wider text-[#00B8D9]">
                  Exposure Surface
                </div>
                <h2 className="font-headline text-2xl sm:text-3xl font-extrabold text-[#040B1A] tracking-tight">
                  Who has seen your file?
                </h2>
              </div>
              <p className="text-xs sm:text-sm text-[#64748B] max-w-md">
                Centralized clinical portals store sensitive records across administrative servers, external vendors, and unlogged backups—creating unnecessary exposure.
              </p>
            </div>

            {/* 4-beat progression */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 relative">
              {/* Beat 1 */}
              <div className="p-5 rounded-xl bg-[#FFFFFF] border border-[#DCEEF2] space-y-2 relative shadow-xs">
                <div className="text-xs font-mono font-extrabold text-[#94A3B8]">01</div>
                <h3 className="font-headline font-bold text-base text-[#040B1A]">
                  At the hospital
                </h3>
                <p className="text-xs text-[#64748B] leading-relaxed">
                  Administrators and staff can open any chart held in central clinical databases.
                </p>
              </div>

              {/* Beat 2 */}
              <div className="p-5 rounded-xl bg-[#FFFFFF] border border-[#DCEEF2] space-y-2 relative shadow-xs">
                <div className="text-xs font-mono font-extrabold text-[#94A3B8]">02</div>
                <h3 className="font-headline font-bold text-base text-[#040B1A]">
                  Shared with vendors
                </h3>
                <p className="text-xs text-[#64748B] leading-relaxed">
                  Billing processors, insurers, and IT contractors hold copies across external systems.
                </p>
              </div>

              {/* Beat 3 */}
              <div className="p-5 rounded-xl bg-[#FFFFFF] border border-[#DCEEF2] space-y-2 relative shadow-xs">
                <div className="text-xs font-mono font-extrabold text-[#94A3B8]">03</div>
                <h3 className="font-headline font-bold text-base text-[#040B1A]">
                  Copied across systems
                </h3>
                <p className="text-xs text-[#64748B] leading-relaxed">
                  Records replicate across portals, laboratories, and archives with no way to recall a file.
                </p>
              </div>

              {/* Beat 4 */}
              <div className="p-5 rounded-xl bg-[#FFFFFF] border border-[#DCEEF2] space-y-2 relative shadow-xs">
                <div className="text-xs font-mono font-extrabold text-[#00B8D9]">04</div>
                <h3 className="font-headline font-bold text-base text-[#040B1A]">
                  No proof
                </h3>
                <p className="text-xs text-[#64748B] leading-relaxed">
                  No independent record exists of who read a file, when it was opened, or who retained a copy.
                </p>
              </div>
            </div>

            {/* Bottom Solution Arrow Banner */}
            <div className="p-4 rounded-xl bg-[#E6FBF8] border border-[#99F0E4] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#065F6B]">
              <div className="flex items-center gap-2.5 font-headline font-bold text-sm">
                <span className="w-2.5 h-2.5 rounded-full bg-[#14D9C4] shrink-0" />
                <span>SolHealth limits exposure: files stay encrypted in your browser, while Solana stores only hashes and access rules—never medical content.</span>
              </div>
              <a href="#sandbox" className="font-bold underline hover:text-[#040B1A] shrink-0">
                Test the mechanism →
              </a>
            </div>
          </div>
        </section>

        {/* ======================================================== */}
        {/* E.3B BUILT FOR (VVIP / DEFENCE / GOVERNMENT)             */}
        {/* ======================================================== */}
        <section className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="space-y-8">
            <div className="text-center space-y-2 max-w-2xl mx-auto">
              <div className="text-xs font-mono font-bold uppercase tracking-wider text-[#00B8D9]">
                Need-to-Know Custody
              </div>
              <h2 className="font-headline text-3xl sm:text-4xl font-extrabold text-[#040B1A] tracking-tight">
                Built for
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Card 1 */}
              <div className="p-6 sm:p-7 rounded-2xl bg-white border border-[#DCEEF2] space-y-3 shadow-xs flex flex-col justify-between">
                <div className="space-y-3">
                  <span className="inline-block font-mono text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-md bg-[#E6FBF8] text-[#065F6B] border border-[#99F0E4]">
                    Restricted Access
                  </span>
                  <h3 className="font-headline font-bold text-lg text-[#040B1A]">
                    High-profile individuals.
                  </h3>
                  <p className="text-xs sm:text-sm text-[#64748B] leading-relaxed">
                    A medical history that cannot leak to staff, vendors or the press. Share only with the physician you choose, only for as long as you choose.
                  </p>
                </div>
              </div>

              {/* Card 2 */}
              <div className="p-6 sm:p-7 rounded-2xl bg-white border border-[#DCEEF2] space-y-3 shadow-xs flex flex-col justify-between">
                <div className="space-y-3">
                  <span className="inline-block font-mono text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-md bg-[#E8F7FC] text-[#075985] border border-[#9CE0F5]">
                    Portable Custody
                  </span>
                  <h3 className="font-headline font-bold text-lg text-[#040B1A]">
                    Defence and service personnel.
                  </h3>
                  <p className="text-xs sm:text-sm text-[#64748B] leading-relaxed">
                    A record that follows you across postings, with time-bound access for each treating clinician and a tamper-evident log of every read.
                  </p>
                </div>
              </div>

              {/* Card 3 */}
              <div className="p-6 sm:p-7 rounded-2xl bg-white border border-[#DCEEF2] space-y-3 shadow-xs flex flex-col justify-between">
                <div className="space-y-3">
                  <span className="inline-block font-mono text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-md bg-[#E6FBF8] text-[#065F6B] border border-[#99F0E4]">
                    Need-to-Know
                  </span>
                  <h3 className="font-headline font-bold text-lg text-[#040B1A]">
                    Government and public officials.
                  </h3>
                  <p className="text-xs sm:text-sm text-[#64748B] leading-relaxed">
                    Compartmentalised, need-to-know disclosure with an independent audit trail for accountability.
                  </p>
                </div>
              </div>
            </div>

            <p className="text-center text-xs font-mono text-[#64748B] max-w-2xl mx-auto">
              Designed for these needs. This is a prototype and is not certified for regulated or classified data.
            </p>
          </div>
        </section>

        {/* ======================================================== */}
        {/* E.4 INTERACTIVE 4-STEP MECHANISM SANDBOX                  */}
        {/* ======================================================== */}
        <section id="sandbox" className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 scroll-mt-[104px]">
          <div className="space-y-6">
            <div className="text-center space-y-2 max-w-2xl mx-auto">
              <div className="text-xs font-mono font-bold uppercase tracking-wider text-[#00B8D9]">
                Interactive Architecture Sandbox
              </div>
              <h2 className="font-headline text-3xl sm:text-4xl font-extrabold text-[#040B1A] tracking-tight">
                Inspect how a record gets protected
              </h2>
              <p className="text-sm text-[#64748B]">
                Walk through the four cryptographic layers from your local browser memory to decentralized IPFS and the Solana blockchain.
              </p>
            </div>

            {/* Browser-Window Style Card */}
            <div className="rounded-2xl bg-[#FFFFFF] border border-[#DCEEF2] shadow-[0_12px_32px_rgba(4,11,26,0.06)] overflow-hidden">
              
              {/* Window Titlebar */}
              <div className="px-5 py-3.5 bg-[#F7FBFC] border-b border-[#DCEEF2] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-[#E2E8F0] border border-[#CBD5E1]" />
                  <span className="w-3 h-3 rounded-full bg-[#E2E8F0] border border-[#CBD5E1]" />
                  <span className="w-3 h-3 rounded-full bg-[#E2E8F0] border border-[#CBD5E1]" />
                  <span className="font-mono text-xs text-[#64748B] ml-2">
                    solhealth.protocol/vault-sandbox
                  </span>
                </div>
                <div className="font-mono text-[11px] text-[#00B8D9] font-bold">
                  TEST BENCH · INTERACTIVE
                </div>
              </div>

              {/* 4 Tabs */}
              <div
                role="tablist"
                aria-label="Mechanism Walkthrough Tabs"
                className="flex border-b border-[#DCEEF2] bg-[#FFFFFF] overflow-x-auto no-scrollbar"
              >
                {[
                  { id: 0, num: "01", label: "Wallet & Key" },
                  { id: 1, num: "02", label: "Encrypt Locally" },
                  { id: 2, num: "03", label: "Pin & Register" },
                  { id: 3, num: "04", label: "Patient Access Gate" },
                ].map((t) => (
                  <button
                    key={t.id}
                    role="tab"
                    id={`tab-${t.id}`}
                    aria-selected={activeTab === t.id}
                    aria-controls={`tabpanel-${t.id}`}
                    onClick={() => setActiveTab(t.id)}
                    className={`flex-1 min-w-[160px] py-3.5 px-4 text-xs font-headline font-bold flex items-center justify-center gap-2 border-b-2 transition-all ${
                      activeTab === t.id
                        ? "border-[#00B8D9] text-[#075985] bg-[#F7FBFC]"
                        : "border-transparent text-[#64748B] hover:text-[#040B1A] hover:bg-[#F7FBFC]"
                    }`}
                  >
                    <span className="font-mono text-[11px] px-1.5 py-0.5 rounded bg-slate-100 text-[#040B1A]">
                      {t.num}
                    </span>
                    <span>{t.label}</span>
                  </button>
                ))}
              </div>

              {/* Tab Content Panels */}
              <div className="p-6 sm:p-10">
                {activeTab === 0 && (
                  <div id="tabpanel-0" role="tabpanel" aria-labelledby="tab-0" className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                      <div className="space-y-4">
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#E8F7FC] text-[#075985] border border-[#9CE0F5] font-mono text-[11px] font-bold">
                          Step 01 · Client Key Derivation
                        </div>
                        <h3 className="font-headline text-2xl font-bold text-[#040B1A]">
                          Zero Private Key Exposure
                        </h3>
                        <p className="text-sm text-[#1E293B] leading-relaxed">
                          SolHealth uses deterministic signature derivation. When you connect, your wallet signs a standard challenge message in memory.
                          From that signature, an X25519 encryption keypair is derived client-side.
                        </p>
                        <ul className="space-y-2 text-xs text-[#64748B]">
                          <li className="flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-[#00B8D9]" />
                            <span>Your seed phrase and private keys never leave your browser hardware.</span>
                          </li>
                          <li className="flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-[#00B8D9]" />
                            <span>The derived X25519 public key is registered on Solana for key exchange.</span>
                          </li>
                        </ul>
                      </div>

                      <div className="p-5 rounded-xl bg-[#F7FBFC] border border-[#DCEEF2] font-mono text-xs space-y-3">
                        <div className="text-[#64748B] text-[11px] uppercase tracking-wider font-bold">
                          Simulated Derivation Flow
                        </div>
                        <div className="p-3 rounded-lg bg-white border border-[#DCEEF2] space-y-1">
                          <span className="text-[#64748B]">Wallet Address:</span>
                          <div className="font-bold text-[#040B1A]">8vXw2k...9L3k (Ed25519)</div>
                        </div>
                        <div className="text-center text-[#00B8D9] font-bold">↓ Sign challenge hash in memory</div>
                        <div className="p-3 rounded-lg bg-[#E6FBF8] border border-[#99F0E4] space-y-1 text-[#065F6B]">
                          <span className="font-semibold">Derived X25519 Encryption Key:</span>
                          <div className="font-bold">x25519:3qP8zK...v7M2 (In-Memory Only)</div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 1 && (
                  <div id="tabpanel-1" role="tabpanel" aria-labelledby="tab-1" className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                      <div className="space-y-4">
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#E6FBF8] text-[#065F6B] border border-[#99F0E4] font-mono text-[11px] font-bold">
                          Step 02 · AES-256-GCM Encryption
                        </div>
                        <h3 className="font-headline text-2xl font-bold text-[#040B1A]">
                          In-Browser File Cipher
                        </h3>
                        <p className="text-sm text-[#1E293B] leading-relaxed">
                          Clinical summaries, diagnostic reports, and imaging files are encrypted directly inside your browser via the Web Crypto API using AES-256-GCM.
                        </p>
                        <ul className="space-y-2 text-xs text-[#64748B]">
                          <li className="flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-[#00B8D9]" />
                            <span>A fresh 256-bit symmetric key is generated per document.</span>
                          </li>
                          <li className="flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-[#00B8D9]" />
                            <span>12-byte random initialization vector (IV) ensures unique ciphertext per encryption.</span>
                          </li>
                        </ul>
                      </div>

                      <div className="p-5 rounded-xl bg-[#F7FBFC] border border-[#DCEEF2] font-mono text-xs space-y-3">
                        <div className="text-[#64748B] text-[11px] uppercase tracking-wider font-bold">
                          Client-Side Encryption Transform
                        </div>
                        <div className="p-3 rounded-lg bg-white border border-[#DCEEF2] space-y-1">
                          <span className="text-[#64748B]">Original File:</span>
                          <div className="font-bold text-[#040B1A]">Executive_Health_Review_2026.pdf (1.4 MB)</div>
                        </div>
                        <div className="text-center text-[#00B8D9] font-bold">↓ AES-256-GCM WebCrypto in Memory</div>
                        <div className="p-3 rounded-lg bg-[#E8F7FC] border border-[#9CE0F5] space-y-1 text-[#075985]">
                          <span className="font-semibold">Ciphertext Output:</span>
                          <div className="font-bold truncate">7f8c41d9a20b9c3f4e18... (Opaque Blob)</div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 2 && (
                  <div id="tabpanel-2" role="tabpanel" aria-labelledby="tab-2" className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                      <div className="space-y-4">
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#E8F7FC] text-[#075985] border border-[#9CE0F5] font-mono text-[11px] font-bold">
                          Step 03 · Decentralized Storage & Anchor
                        </div>
                        <h3 className="font-headline text-2xl font-bold text-[#040B1A]">
                          Pinning and On-Chain Registration
                        </h3>
                        <p className="text-sm text-[#1E293B] leading-relaxed">
                          Only the encrypted ciphertext is pinned to IPFS, producing a content identifier (CID).
                          Then, an instruction is submitted to the SolHealth Anchor program on Solana.
                        </p>
                        <ul className="space-y-2 text-xs text-[#64748B]">
                          <li className="flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-[#00B8D9]" />
                            <span>Solana stores only the SHA-256 file hash and access rules—never medical content.</span>
                          </li>
                          <li className="flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-[#00B8D9]" />
                            <span>Any byte alteration invalidates the on-chain SHA-256 hash and GCM tag.</span>
                          </li>
                        </ul>
                      </div>

                      <div className="p-5 rounded-xl bg-[#F7FBFC] border border-[#DCEEF2] font-mono text-xs space-y-3">
                        <div className="text-[#64748B] text-[11px] uppercase tracking-wider font-bold">
                          Solana Account State
                        </div>
                        <div className="p-3 rounded-lg bg-white border border-[#DCEEF2] space-y-1 text-[11.5px]">
                          <div><strong className="text-[#040B1A]">IPFS CID:</strong> bafybeigdyrzt5sfp7...</div>
                          <div><strong className="text-[#040B1A]">SHA-256:</strong> e3b0c44298fc1c14...</div>
                          <div><strong className="text-[#040B1A]">Owner PDA:</strong> 4z8K...2L1p</div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 3 && (
                  <div id="tabpanel-3" role="tabpanel" aria-labelledby="tab-3" className="space-y-6">
                    <div className="space-y-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="space-y-1.5">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#E6FBF8] text-[#065F6B] border border-[#99F0E4] font-mono text-[11px] font-bold">
                              Step 04 Interactive Simulation
                            </span>
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#FFF8E6] text-[#92400E] border border-[#FDE293] font-mono text-[10.5px] font-semibold">
                              Simulated demo. No real transaction.
                            </span>
                          </div>
                          <h3 className="font-headline text-2xl font-bold text-[#040B1A]">
                            Live Access Gate Demo
                          </h3>
                        </div>

                        {/* Interactive Status Badge */}
                        <div>
                          {sampleGrantStatus === "active" && (
                            <span data-ui="pill" className="status-pill status-pill-ok !h-8 !px-3 font-headline font-bold text-xs">
                              Active · Permitted
                            </span>
                          )}
                          {sampleGrantStatus === "expired" && (
                            <span data-ui="pill" className="status-pill status-pill-warn !h-8 !px-3 font-headline font-bold text-xs">
                              Expired · Blocked
                            </span>
                          )}
                          {sampleGrantStatus === "revoked" && (
                            <span data-ui="pill" className="status-pill status-pill-neutral !h-8 !px-3 font-headline font-bold text-xs">
                              Revoked · Blocked
                            </span>
                          )}
                        </div>
                      </div>

                      <p className="text-xs sm:text-sm text-[#64748B]">
                        Click the controls below to trigger simulated on-chain state changes. Notice how the badge and the Solana audit trail respond immediately.
                      </p>

                      {/* Interactive Record Card */}
                      <div className="p-5 rounded-xl bg-[#F7FBFC] border border-[#DCEEF2] space-y-4">
                        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#DCEEF2]">
                          <div>
                            <div className="font-headline font-bold text-sm text-[#040B1A]">
                              Annual Executive Health Review · PDF
                            </div>
                            <div className="text-xs font-mono text-[#64748B]">
                              Record #847192 · Subject 8vXw...9L3k
                            </div>
                          </div>
                          <div className="text-xs font-mono text-[#075985]">
                            Clinician: Attending Physician (Sample · 4mB2...1p9q)
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex flex-wrap items-center gap-2.5">
                          <button
                            type="button"
                            onClick={handleGrantAccess}
                            className="glass-btn glass-btn-primary !min-h-[36px] text-xs font-bold"
                          >
                            Grant 24h Access
                          </button>
                          <button
                            type="button"
                            onClick={handleExpireAccess}
                            className="glass-btn glass-btn-secondary !min-h-[36px] text-xs font-semibold"
                          >
                            Simulate Expiry
                          </button>
                          <button
                            type="button"
                            onClick={handleRevokeAccess}
                            className="glass-btn glass-btn-danger !min-h-[36px] text-xs font-bold"
                          >
                            Revoke Immediately
                          </button>
                          <button
                            type="button"
                            onClick={handleEmergencyAccess}
                            className="glass-btn glass-btn-secondary !min-h-[36px] text-xs font-semibold"
                          >
                            Simulated emergency access
                          </button>
                        </div>

                        {/* Live Audit Trail */}
                        <div className="space-y-2 pt-2">
                          <div className="text-[11px] font-mono font-bold uppercase tracking-wider text-[#64748B] flex items-center justify-between">
                            <span>Simulated Solana Audit Log</span>
                            <span className="text-[#00B8D9]">Live Updates</span>
                          </div>
                          <div className="p-3.5 rounded-xl bg-white border border-[#DCEEF2] space-y-2 font-mono text-xs">
                            {auditLog.map((log, idx) => (
                              <div
                                key={idx}
                                className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 pb-1.5 border-b border-slate-100 last:border-0 last:pb-0"
                              >
                                <div className="space-y-0.5">
                                  <div className="text-[#040B1A] font-semibold">{log.event}</div>
                                  <div className="text-[10px] text-[#64748B]">Tx: {log.tx} · {log.time}</div>
                                </div>
                                <span className="text-[11px] font-bold text-[#065F6B] shrink-0">
                                  {log.status}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* ======================================================== */}
        {/* E.5 SPLIT COMPARISON: PORTALS VS SOLHEALTH VAULT         */}
        {/* ======================================================== */}
        <section className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="space-y-8">
            <div className="text-center space-y-2 max-w-2xl mx-auto">
              <div className="text-xs font-mono font-bold uppercase tracking-wider text-[#00B8D9]">
                Architectural Breakdown
              </div>
              <h2 className="font-headline text-3xl sm:text-4xl font-extrabold text-[#040B1A] tracking-tight">
                Institutional portals vs. SolHealth Vault
              </h2>
              <p className="text-sm text-[#64748B]">
                Why client-side cryptography and need-to-know permissions change custodial risk.
              </p>
            </div>

            {/* Side-by-Side Comparison Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
              {/* Left: Institutional Portals */}
              <div className="p-6 sm:p-8 rounded-2xl bg-[#F7FBFC] border border-[#DCEEF2] space-y-6 flex flex-col justify-between">
                <div className="space-y-4">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FEE2E2] border border-[#FCA5A5] text-[#991B1B] text-xs font-headline font-bold">
                    <XCircle className="w-3.5 h-3.5" />
                    <span>Institutional Portals</span>
                  </div>
                  <h3 className="font-headline text-xl sm:text-2xl font-bold text-[#040B1A]">
                    Server-Custodied Health Files
                  </h3>
                  <ul className="space-y-3.5 text-xs sm:text-sm text-[#64748B]">
                    <li className="flex items-start gap-2.5">
                      <span className="text-[#991B1B] font-bold mt-0.5">✕</span>
                      <span><strong>Insider &amp; Vendor Access:</strong> Administrators, billing vendors, and IT contractors can read stored files.</span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <span className="text-[#991B1B] font-bold mt-0.5">✕</span>
                      <span><strong>Single-Point Breach:</strong> One compromised database or vendor account exposes many patients at once.</span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <span className="text-[#991B1B] font-bold mt-0.5">✕</span>
                      <span><strong>No Independent Audit:</strong> Internal access logs can be altered, omitted, or withheld from the patient.</span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <span className="text-[#991B1B] font-bold mt-0.5">✕</span>
                      <span><strong>No Recall Mechanism:</strong> Forwarded attachments and portal copies cannot be cryptographically revoked.</span>
                    </li>
                  </ul>
                </div>

                <div className="p-3.5 rounded-xl bg-white border border-[#DCEEF2] text-xs font-mono text-[#991B1B]">
                  Risk: One breach or insider exposes full clinical history
                </div>
              </div>

              {/* Right: SolHealth Vault */}
              <div className="p-6 sm:p-8 rounded-2xl bg-white border-2 border-[#00B8D9] space-y-6 flex flex-col justify-between shadow-md relative">
                <div className="space-y-4">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#E6FBF8] border border-[#99F0E4] text-[#065F6B] text-xs font-headline font-bold">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#00B8D9]" />
                    <span>SolHealth Vault</span>
                  </div>
                  <h3 className="font-headline text-xl sm:text-2xl font-bold text-[#040B1A]">
                    Need-to-Know Cryptography
                  </h3>
                  <ul className="space-y-3.5 text-xs sm:text-sm text-[#1E293B]">
                    <li className="flex items-start gap-2.5">
                      <CheckCircle2 className="w-4 h-4 text-[#00B8D9] shrink-0 mt-0.5" />
                      <span><strong>Wallet-Derived Keys:</strong> Encryption keys derive in browser memory from your wallet signature; no server holds custody.</span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <CheckCircle2 className="w-4 h-4 text-[#00B8D9] shrink-0 mt-0.5" />
                      <span><strong>Need-to-Know &amp; Time-Bound Grants:</strong> Access is granted to a chosen clinician for a defined window.</span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <CheckCircle2 className="w-4 h-4 text-[#00B8D9] shrink-0 mt-0.5" />
                      <span><strong>Instant Revocation:</strong> Revoking an on-chain grant blocks subsequent key retrieval upon confirmation.</span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <CheckCircle2 className="w-4 h-4 text-[#00B8D9] shrink-0 mt-0.5" />
                      <span><strong>Tamper-Evident Audit Trail:</strong> Hashes and access rules reside on-chain—never medical content—with every read logged.</span>
                    </li>
                  </ul>
                </div>

                <div className="p-3.5 rounded-xl bg-[#E6FBF8] border border-[#99F0E4] text-xs font-mono text-[#065F6B] font-bold">
                  Architecture: Need-to-know access enforced by client encryption and on-chain rules
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ======================================================== */}
        {/* E.6 ROLE SWITCHER WITH HOVER-TO-TRACE LINEAGE            */}
        {/* ======================================================== */}
        <section id="roles" className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 scroll-mt-[104px]">
          <div className="space-y-8">
            <div className="text-center space-y-2 max-w-2xl mx-auto">
              <div className="text-xs font-mono font-bold uppercase tracking-wider text-[#00B8D9]">
                Interactive Role Ecosystem
              </div>
              <h2 className="font-headline text-3xl sm:text-4xl font-extrabold text-[#040B1A] tracking-tight">
                Hover to trace cryptographic lineage
              </h2>
              <p className="text-sm text-[#64748B]">
                Hover or tap any field below to reveal the exact on-chain mechanism powering it.
              </p>
            </div>

            {/* Role Tabs */}
            <div className="flex justify-center">
              <div className="inline-flex p-1.5 rounded-xl bg-[#F7FBFC] border border-[#DCEEF2] gap-1">
                {(["patient", "doctor", "publisher", "audit"] as const).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setActiveRoleTab(r)}
                    className={`px-4 py-2 rounded-lg text-xs font-headline font-bold capitalize transition-all ${
                      activeRoleTab === r
                        ? "bg-white text-[#040B1A] shadow-xs border border-[#DCEEF2]"
                        : "text-[#64748B] hover:text-[#040B1A]"
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>

            {/* Role Card Display */}
            <div className="max-w-3xl mx-auto rounded-2xl bg-white border border-[#DCEEF2] p-6 sm:p-8 space-y-6 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-[#DCEEF2]">
                <div>
                  <h3 className="font-headline text-xl font-bold text-[#040B1A] capitalize">
                    {activeRoleTab} Role Portal
                  </h3>
                  <p className="text-xs text-[#64748B]">
                    {activeRoleTab === "patient" && "Encrypts health records and defines time-bounded access rules."}
                    {activeRoleTab === "doctor" && "Receives delegated keys and accesses records with on-chain logging."}
                    {activeRoleTab === "publisher" && "Initializes registry and verifies licensed medical practitioners."}
                    {activeRoleTab === "audit" && "Inspects transparent chronological audit logs for all activity."}
                  </p>
                </div>
                <Link
                  href={`/${activeRoleTab === "patient" ? "patient" : activeRoleTab === "doctor" ? "doctor" : activeRoleTab === "publisher" ? "publisher" : "audit"}`}
                  className="glass-btn glass-btn-secondary !min-h-[36px] text-xs font-bold inline-flex items-center gap-1.5"
                >
                  <span>Open full page</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </Link>
              </div>

              {/* Realistic Record Card with Hoverable Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Field 1 */}
                <div
                  onMouseEnter={() => setActiveHoverField("encryption")}
                  onMouseLeave={() => setActiveHoverField(null)}
                  onClick={() => setActiveHoverField(activeHoverField === "encryption" ? null : "encryption")}
                  className={`p-4 rounded-xl border transition-all cursor-pointer ${
                    activeHoverField === "encryption"
                      ? "bg-[#E6FBF8] border-[#99F0E4]"
                      : "bg-[#F7FBFC] border-[#DCEEF2] hover:border-[#00B8D9]"
                  }`}
                >
                  <div className="text-[11px] font-mono uppercase text-[#64748B]">Encryption Standard</div>
                  <div className="font-mono font-bold text-sm text-[#040B1A]">AES-256-GCM</div>
                  {activeHoverField === "encryption" && (
                    <div className="mt-2 text-xs text-[#065F6B] font-medium animate-in fade-in">
                      → Client-side encryption in browser memory. Keys never touch backend servers.
                    </div>
                  )}
                </div>

                {/* Field 2 */}
                <div
                  onMouseEnter={() => setActiveHoverField("storage")}
                  onMouseLeave={() => setActiveHoverField(null)}
                  onClick={() => setActiveHoverField(activeHoverField === "storage" ? null : "storage")}
                  className={`p-4 rounded-xl border transition-all cursor-pointer ${
                    activeHoverField === "storage"
                      ? "bg-[#E6FBF8] border-[#99F0E4]"
                      : "bg-[#F7FBFC] border-[#DCEEF2] hover:border-[#00B8D9]"
                  }`}
                >
                  <div className="text-[11px] font-mono uppercase text-[#64748B]">Storage Endpoint</div>
                  <div className="font-mono font-bold text-sm text-[#040B1A] truncate">ipfs://bafybeic7...</div>
                  {activeHoverField === "storage" && (
                    <div className="mt-2 text-xs text-[#065F6B] font-medium animate-in fade-in">
                      → Content-addressed ciphertext blob. Tamper-evident and decentralized.
                    </div>
                  )}
                </div>

                {/* Field 3 */}
                <div
                  onMouseEnter={() => setActiveHoverField("rule")}
                  onMouseLeave={() => setActiveHoverField(null)}
                  onClick={() => setActiveHoverField(activeHoverField === "rule" ? null : "rule")}
                  className={`p-4 rounded-xl border transition-all cursor-pointer ${
                    activeHoverField === "rule"
                      ? "bg-[#E6FBF8] border-[#99F0E4]"
                      : "bg-[#F7FBFC] border-[#DCEEF2] hover:border-[#00B8D9]"
                  }`}
                >
                  <div className="text-[11px] font-mono uppercase text-[#64748B]">Permission Window</div>
                  <div className="font-mono font-bold text-sm text-[#040B1A]">Expires in 24h</div>
                  {activeHoverField === "rule" && (
                    <div className="mt-2 text-xs text-[#065F6B] font-medium animate-in fade-in">
                      → On-chain Access PDA. Verified against Solana slot clock before access.
                    </div>
                  )}
                </div>

                {/* Field 4 */}
                <div
                  onMouseEnter={() => setActiveHoverField("tx")}
                  onMouseLeave={() => setActiveHoverField(null)}
                  onClick={() => setActiveHoverField(activeHoverField === "tx" ? null : "tx")}
                  className={`p-4 rounded-xl border transition-all cursor-pointer ${
                    activeHoverField === "tx"
                      ? "bg-[#E6FBF8] border-[#99F0E4]"
                      : "bg-[#F7FBFC] border-[#DCEEF2] hover:border-[#00B8D9]"
                  }`}
                >
                  <div className="text-[11px] font-mono uppercase text-[#64748B]">On-Chain Instruction</div>
                  <div className="font-mono font-bold text-sm text-[#040B1A]">Tx Hash: 5xK9...2e7</div>
                  {activeHoverField === "tx" && (
                    <div className="mt-2 text-xs text-[#065F6B] font-medium animate-in fade-in">
                      → Solana program instruction that registered or revoked the record.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ======================================================== */}
        {/* E.7 FOUR-TO-ONE ARCHITECTURE FLOW                        */}
        {/* ======================================================== */}
        <section className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="rounded-2xl bg-[#F7FBFC] border border-[#DCEEF2] p-6 sm:p-10 space-y-8">
            <div className="text-center space-y-2 max-w-2xl mx-auto">
              <div className="text-xs font-mono font-bold uppercase tracking-wider text-[#00B8D9]">
                System Architecture
              </div>
              <h2 className="font-headline text-3xl font-extrabold text-[#040B1A] tracking-tight">
                Four inputs converge into one sovereign record
              </h2>
            </div>

            {/* Diagram */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
              {/* Pillar 1 */}
              <div className="p-5 rounded-xl bg-white border border-[#DCEEF2] space-y-2 text-center shadow-xs">
                <div className="w-10 h-10 rounded-xl bg-[#E6FBF8] border border-[#99F0E4] flex items-center justify-center mx-auto text-[#065F6B]">
                  <Cpu className="w-5 h-5" />
                </div>
                <div className="font-headline font-bold text-sm text-[#040B1A]">Browser Memory</div>
                <div className="font-mono text-xs text-[#00B8D9]">AES-256-GCM</div>
                <p className="text-[11.5px] text-[#64748B]">Encrypts raw files in client RAM</p>
              </div>

              {/* Pillar 2 */}
              <div className="p-5 rounded-xl bg-white border border-[#DCEEF2] space-y-2 text-center shadow-xs">
                <div className="w-10 h-10 rounded-xl bg-[#E8F7FC] border border-[#9CE0F5] flex items-center justify-center mx-auto text-[#075985]">
                  <Key className="w-5 h-5" />
                </div>
                <div className="font-headline font-bold text-sm text-[#040B1A]">Wallet Signature</div>
                <div className="font-mono text-xs text-[#075985]">Deterministic Key</div>
                <p className="text-[11.5px] text-[#64748B]">X25519 secret derived on-the-fly</p>
              </div>

              {/* Pillar 3 */}
              <div className="p-5 rounded-xl bg-white border border-[#DCEEF2] space-y-2 text-center shadow-xs">
                <div className="w-10 h-10 rounded-xl bg-[#E6FBF8] border border-[#99F0E4] flex items-center justify-center mx-auto text-[#065F6B]">
                  <Database className="w-5 h-5" />
                </div>
                <div className="font-headline font-bold text-sm text-[#040B1A]">IPFS Pinning</div>
                <div className="font-mono text-xs text-[#00B8D9]">Encrypted Blob</div>
                <p className="text-[11.5px] text-[#64748B]">Content-addressed ciphertext storage</p>
              </div>

              {/* Pillar 4 */}
              <div className="p-5 rounded-xl bg-white border border-[#DCEEF2] space-y-2 text-center shadow-xs">
                <div className="w-10 h-10 rounded-xl bg-[#E8F7FC] border border-[#9CE0F5] flex items-center justify-center mx-auto text-[#075985]">
                  <Layers className="w-5 h-5" />
                </div>
                <div className="font-headline font-bold text-sm text-[#040B1A]">Solana Devnet</div>
                <div className="font-mono text-xs text-[#075985]">Hash & Rules</div>
                <p className="text-[11.5px] text-[#64748B]">Enforces access permissions and audit</p>
              </div>
            </div>

            {/* Convergence Output Box */}
            <div className="p-5 rounded-2xl bg-white border-2 border-[#00B8D9] text-center max-w-xl mx-auto space-y-2 shadow-sm">
              <div className="text-xs font-mono font-bold uppercase text-[#00B8D9]">
                Resulting Cryptographic Output
              </div>
              <h3 className="font-headline font-bold text-lg text-[#040B1A]">
                Tamper-Evident Patient Record
              </h3>
              <p className="text-xs text-[#64748B]">
                Decipherable only by the patient and explicitly authorized doctors. Tampering with any byte makes the file invalid.
              </p>
            </div>
          </div>
        </section>

        {/* ======================================================== */}
        {/* E.8 CRYPTOGRAPHIC GUARDRAILS                             */}
        {/* ======================================================== */}
        <section className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="space-y-8">
            <div className="text-center space-y-2 max-w-2xl mx-auto">
              <div className="text-xs font-mono font-bold uppercase tracking-wider text-[#00B8D9]">
                Security Guardrails
              </div>
              <h2 className="font-headline text-3xl sm:text-4xl font-extrabold text-[#040B1A] tracking-tight">
                Cryptographic guardrails
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {/* Guarantee 01 */}
              <div className="p-6 rounded-2xl bg-white border border-[#DCEEF2] space-y-3 shadow-xs">
                <span className="font-mono text-xs font-extrabold px-2.5 py-1 rounded-md bg-[#E6FBF8] text-[#065F6B] border border-[#99F0E4]">
                  01
                </span>
                <h3 className="font-headline font-bold text-lg text-[#040B1A]">
                  Zero Key Exposure
                </h3>
                <p className="text-xs sm:text-sm text-[#64748B] leading-relaxed">
                  Private keys never leave browser memory. Decryption capability is derived from a one-time wallet signature, eliminating central key servers and insider custody.
                </p>
              </div>

              {/* Guarantee 02 */}
              <div className="p-6 rounded-2xl bg-white border border-[#DCEEF2] space-y-3 shadow-xs">
                <span className="font-mono text-xs font-extrabold px-2.5 py-1 rounded-md bg-[#E8F7FC] text-[#075985] border border-[#9CE0F5]">
                  02
                </span>
                <h3 className="font-headline font-bold text-lg text-[#040B1A]">
                  Client-Side AES-256-GCM
                </h3>
                <p className="text-xs sm:text-sm text-[#64748B] leading-relaxed">
                  Records are encrypted locally before any network request. IPFS stores opaque ciphertext only, and the blockchain stores only hashes and access rules—never medical content.
                </p>
              </div>

              {/* Guarantee 03 */}
              <div className="p-6 rounded-2xl bg-white border border-[#DCEEF2] space-y-3 shadow-xs">
                <span className="font-mono text-xs font-extrabold px-2.5 py-1 rounded-md bg-[#E6FBF8] text-[#065F6B] border border-[#99F0E4]">
                  03
                </span>
                <h3 className="font-headline font-bold text-lg text-[#040B1A]">
                  On-Chain Grant &amp; Revoke
                </h3>
                <p className="text-xs sm:text-sm text-[#64748B] leading-relaxed">
                  Disclosure follows strict need-to-know boundaries. Access is scoped to a chosen, credentialed clinician and time window, and revokes upon confirmation.
                </p>
              </div>

              {/* Guarantee 04 */}
              <div className="p-6 rounded-2xl bg-white border border-[#DCEEF2] space-y-3 shadow-xs">
                <span className="font-mono text-xs font-extrabold px-2.5 py-1 rounded-md bg-[#E8F7FC] text-[#075985] border border-[#9CE0F5]">
                  04
                </span>
                <h3 className="font-headline font-bold text-lg text-[#040B1A]">
                  Immutable Audit Log
                </h3>
                <p className="text-xs sm:text-sm text-[#64748B] leading-relaxed">
                  Accountability for every disclosure. Credential checks, grants, revocations, and clinical reads emit immutable on-chain events verifiable in the Audit trail.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ======================================================== */}
        {/* E.9 FAQ ACCORDION                                        */}
        {/* ======================================================== */}
        <section id="faq" className="max-w-[900px] mx-auto px-4 sm:px-6 lg:px-8 scroll-mt-[104px]">
          <div className="space-y-8">
            <div className="text-center space-y-2">
              <div className="text-xs font-mono font-bold uppercase tracking-wider text-[#00B8D9]">
                Frequently Asked Questions
              </div>
              <h2 className="font-headline text-3xl sm:text-4xl font-extrabold text-[#040B1A] tracking-tight">
                Clear answers on protocol mechanics
              </h2>
            </div>

            <div className="space-y-3">
              {[
                {
                  id: 0,
                  num: "01",
                  q: "How do wallet signatures derive encryption keys?",
                  a: "SolHealth uses deterministic key derivation. When you connect, your wallet signs a static challenge string in memory. That signature is passed through HKDF to produce a dedicated X25519 encryption keypair. Your wallet seed phrase and private key never leave browser memory.",
                },
                {
                  id: 1,
                  num: "02",
                  q: "What is actually stored on IPFS?",
                  a: "Only AES-256-GCM encrypted ciphertext is pinned to IPFS. Raw medical documents, filenames, and clinical details are never stored in plaintext. Without the wrapped symmetric key for an authorized recipient, the IPFS object is undecipherable.",
                },
                {
                  id: 2,
                  num: "03",
                  q: "What does the blockchain reveal?",
                  a: "Only hashes, access rules, timestamps and pseudonymous wallet addresses, never medical content. Access events on a public network are visible, which is why a sensitive deployment would use a private ledger.",
                },
                {
                  id: 3,
                  num: "04",
                  q: "Is this approved for classified or regulated data?",
                  a: "No. It is a prototype on a Solana test network. Do not upload real medical data. A production deployment would need a private or permissioned ledger, a formal security review and the relevant compliance work.",
                },
                {
                  id: 4,
                  num: "05",
                  q: "Can I recover my files if I switch devices?",
                  a: "Yes. Because encryption keys derive deterministically from your wallet signature, connecting the same Solana wallet on any modern browser restores decryption capability automatically.",
                },
                {
                  id: 5,
                  num: "06",
                  q: "How does testing work on Solana Devnet?",
                  a: "SolHealth runs on Solana Devnet, a public test network. All operations use free Devnet test SOL with no real monetary value. Do not upload real medical data.",
                },
                {
                  id: 6,
                  num: "07",
                  q: "What happens when a doctor's access expires or is revoked?",
                  a: "The Solana program checks the validator clock against the granted expiry timestamp and revocation flag. Once expired or revoked, the contract rejects subsequent access instructions immediately, blocking further key retrieval.",
                },
              ].map((item) => (
                <div
                  key={item.id}
                  className="rounded-xl bg-white border border-[#DCEEF2] overflow-hidden transition-all shadow-xs"
                >
                  <button
                    type="button"
                    onClick={() => setOpenFaq(openFaq === item.id ? null : item.id)}
                    aria-expanded={openFaq === item.id}
                    className="w-full p-4 sm:p-5 flex items-center justify-between text-left gap-4 hover:bg-[#F7FBFC] transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-xs font-bold text-[#00B8D9]">
                        {item.num}
                      </span>
                      <span className="font-headline font-bold text-sm sm:text-base text-[#040B1A]">
                        {item.q}
                      </span>
                    </div>
                    <ChevronDown
                      className={`w-4 h-4 text-[#64748B] shrink-0 transition-transform ${
                        openFaq === item.id ? "rotate-180 text-[#00B8D9]" : ""
                      }`}
                    />
                  </button>

                  {openFaq === item.id && (
                    <div className="px-5 pb-5 pt-1 text-xs sm:text-sm text-[#64748B] leading-relaxed border-t border-[#DCEEF2]/60 animate-in fade-in">
                      {item.a}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ======================================================== */}
        {/* E.10 ABOUT US (GATED BEHIND SHOW_ABOUT = false)          */}
        {/* ======================================================== */}
        {SHOW_ABOUT && (
          <section id="about" className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 scroll-mt-[104px]">
            <div className="rounded-2xl bg-[#F7FBFC] border border-[#DCEEF2] p-6 sm:p-12 space-y-12">
              <div className="text-center space-y-2 max-w-2xl mx-auto">
                <div className="text-xs font-mono font-bold uppercase tracking-wider text-[#00B8D9]">
                  Contributors
                </div>
                <h2 className="font-headline text-3xl sm:text-4xl font-extrabold text-[#040B1A] tracking-tight">
                  About
                </h2>
                <p className="text-sm text-[#64748B]">
                  Patient-sovereign cryptographic infrastructure on Solana.
                </p>
              </div>

              {/* Preserved team grid & public/team/* assets; toggle SHOW_ABOUT to true to restore */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="p-6 rounded-2xl bg-white border border-[#DCEEF2] text-center space-y-4 hover:-translate-y-1.5 transition-transform duration-200 shadow-xs">
                  <div className="w-[128px] h-[128px] mx-auto rounded-full p-[2px] bg-[linear-gradient(135deg,#5EFCE8_0%,#2EE8C8_35%,#00C4E0_70%,#0084C2_100%)] shadow-md">
                    <div className="w-full h-full rounded-full overflow-hidden relative bg-[#040B1A]">
                      <Image
                        src="/team/akshat.webp"
                        alt="Contributor 1"
                        fill
                        className="object-cover"
                        style={{ objectPosition: "50% 30%" }}
                        sizes="128px"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <h3 className="font-headline font-bold text-base text-[#040B1A]">
                      Akshat Upadhyay
                    </h3>
                  </div>
                </div>

                <div className="p-6 rounded-2xl bg-white border border-[#DCEEF2] text-center space-y-4 hover:-translate-y-1.5 transition-transform duration-200 shadow-xs">
                  <div className="w-[128px] h-[128px] mx-auto rounded-full p-[2px] bg-[linear-gradient(135deg,#5EFCE8_0%,#2EE8C8_35%,#00C4E0_70%,#0084C2_100%)] shadow-md">
                    <div className="w-full h-full rounded-full overflow-hidden relative bg-[#040B1A]">
                      <Image
                        src="/team/rushaan.webp"
                        alt="Contributor 2"
                        fill
                        className="object-cover scale-[1.25]"
                        style={{ transformOrigin: "center center" }}
                        sizes="128px"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <h3 className="font-headline font-bold text-base text-[#040B1A]">
                      Contributor
                    </h3>
                  </div>
                </div>

                <div className="p-6 rounded-2xl bg-white border border-[#DCEEF2] text-center space-y-4 hover:-translate-y-1.5 transition-transform duration-200 shadow-xs">
                  <div className="w-[128px] h-[128px] mx-auto rounded-full p-[2px] bg-[linear-gradient(135deg,#5EFCE8_0%,#2EE8C8_35%,#00C4E0_70%,#0084C2_100%)] shadow-md">
                    <div className="w-full h-full rounded-full overflow-hidden relative bg-[#040B1A]">
                      <Image
                        src="/team/aviral.webp"
                        alt="Contributor 3"
                        fill
                        className="object-cover"
                        style={{ objectPosition: "50% 28%" }}
                        sizes="128px"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <h3 className="font-headline font-bold text-base text-[#040B1A]">
                      Contributor
                    </h3>
                  </div>
                </div>

                <div className="p-6 rounded-2xl bg-white border border-[#DCEEF2] text-center space-y-4 hover:-translate-y-1.5 transition-transform duration-200 shadow-xs">
                  <div className="w-[128px] h-[128px] mx-auto rounded-full p-[2px] bg-[linear-gradient(135deg,#5EFCE8_0%,#2EE8C8_35%,#00C4E0_70%,#0084C2_100%)] shadow-md">
                    <div className="w-full h-full rounded-full overflow-hidden relative bg-[#040B1A]">
                      <Image
                        src="/team/tushar.webp"
                        alt="Contributor 4"
                        fill
                        className="object-cover scale-[2.3]"
                        style={{
                          transformOrigin: "60% 40%",
                          objectPosition: "60% 40%",
                        }}
                        sizes="128px"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <h3 className="font-headline font-bold text-base text-[#040B1A]">
                      Contributor
                    </h3>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ======================================================== */}
        {/* E.10B STANDALONE CONTACT SECTION                         */}
        {/* ======================================================== */}
        <section id="contact" className="max-w-[900px] mx-auto px-4 sm:px-6 lg:px-8 scroll-mt-[104px]">
          <div className="rounded-2xl bg-[#F7FBFC] border border-[#DCEEF2] p-6 sm:p-10 space-y-6">
            <div className="text-center space-y-1.5">
              <div className="text-xs font-mono font-bold uppercase tracking-wider text-[#00B8D9]">
                Direct Inquiries
              </div>
              <h2 className="font-headline text-2xl sm:text-3xl font-extrabold text-[#040B1A] tracking-tight">
                Contact
              </h2>
              <p className="text-xs sm:text-sm text-[#64748B]">
                Questions regarding SolHealth architecture or protocol integration.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 max-w-lg mx-auto">
              {/* Email Link */}
              <a
                href="mailto:akshatupadhyay2501@gmail.com"
                aria-label="Send email to akshatupadhyay2501@gmail.com"
                className="w-full sm:w-auto flex-1 flex items-center gap-3 p-3.5 rounded-xl bg-white border border-[#DCEEF2] hover:border-[#00B8D9] shadow-xs group transition-all"
              >
                <div className="w-10 h-10 rounded-full p-[2px] bg-[linear-gradient(135deg,#5EFCE8_0%,#2EE8C8_35%,#00C4E0_70%,#0084C2_100%)] shrink-0">
                  <div className="w-full h-full rounded-full bg-white flex items-center justify-center text-[#065F6B]">
                    <Mail className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-left overflow-hidden">
                  <div className="text-[10px] font-mono uppercase text-[#64748B] font-bold">Email</div>
                  <div className="text-xs font-headline font-bold text-[#040B1A] group-hover:text-[#00B8D9] truncate">
                    akshatupadhyay2501@gmail.com
                  </div>
                </div>
              </a>

              {/* LinkedIn Link */}
              <a
                href="https://www.linkedin.com/in/akshat-up"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Open LinkedIn profile"
                className="w-full sm:w-auto flex-1 flex items-center gap-3 p-3.5 rounded-xl bg-white border border-[#DCEEF2] hover:border-[#00B8D9] shadow-xs group transition-all"
              >
                <div className="w-10 h-10 rounded-full p-[2px] bg-[linear-gradient(135deg,#5EFCE8_0%,#2EE8C8_35%,#00C4E0_70%,#0084C2_100%)] shrink-0">
                  <div className="w-full h-full rounded-full bg-white flex items-center justify-center text-[#075985]">
                    <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.46 8.76a1.64 1.64 0 1 0 0-3.28 1.64 1.64 0 0 0 0 3.28m1.4 9.74v-8.37H5.06v8.37h2.8z" />
                    </svg>
                  </div>
                </div>
                <div className="text-left overflow-hidden">
                  <div className="text-[10px] font-mono uppercase text-[#64748B] font-bold">LinkedIn</div>
                  <div className="text-xs font-headline font-bold text-[#040B1A] group-hover:text-[#00B8D9] truncate">
                    linkedin.com/in/akshat-up
                  </div>
                </div>
              </a>
            </div>
          </div>
        </section>

        {/* ======================================================== */}
        {/* E.11 CLOSING CTA BANNER                                   */}
        {/* ======================================================== */}
        <section className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 pb-10">
          <div className="rounded-3xl p-8 sm:p-14 text-center space-y-6 relative overflow-hidden bg-[#040B1A] text-white shadow-xl">
            {/* Background cyan gradient glow inside CTA banner */}
            <div
              aria-hidden="true"
              className="absolute pointer-events-none -top-24 left-1/2 -translate-x-1/2 w-[500px] h-[300px] bg-[linear-gradient(135deg,#5EFCE8_0%,#00C4E0_100%)] opacity-20 blur-[90px] rounded-full"
            />

            <div className="relative z-10 max-w-2xl mx-auto space-y-4">
              <span className="font-mono text-xs uppercase tracking-widest text-[#14D9C4] font-bold">
                Solana Devnet Prototype
              </span>
              <h2 className="font-headline text-3xl sm:text-5xl font-extrabold tracking-tight">
                Discreet custody for sensitive records.
              </h2>
              <p className="text-xs sm:text-base text-slate-300 leading-relaxed">
                Connect a Solana wallet, derive local encryption keys in memory, and govern need-to-know access with an immutable audit trail. Test network only—do not upload real medical data.
              </p>

              <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
                <button
                  type="button"
                  onClick={connected ? () => router.push("/patient") : openWalletModal}
                  className="w-full sm:w-auto glass-btn glass-btn-primary !min-h-[46px] !px-8 text-sm font-headline font-bold shadow-lg inline-flex items-center justify-center gap-2"
                >
                  <span>{connected ? "Open Patient Vault" : "Connect Wallet"}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                <Link
                  href="/audit"
                  className="w-full sm:w-auto px-6 py-2.5 rounded-xl border border-white/20 text-white hover:bg-white/10 transition-colors text-sm font-headline font-semibold inline-flex items-center justify-center"
                >
                  Inspect Audit Trail
                </Link>
              </div>
            </div>
          </div>
        </section>

      </div>
    </div>
  );
}