"use client";

import React, { useState, useEffect, useCallback } from "react";
import { PublicKey } from "@solana/web3.js";
import { useSolhealth } from "@/lib/solhealth-context";
import { ROLE_LABELS } from "@/lib/roles";
import { 
  initConfig, 
  issueCredential, 
  revokeCredential, 
  getConfig, 
  listCredentials,
  mapProgramError 
} from "@/lib/solana";
import { 
  RolePage, 
  StepCard, 
  InlineResultArea, 
  TechnicalDetails, 
  DestructiveConfirm, 
  EmptyStateBox, 
  ChecklistStep 
} from "@/components/RolePage";
import { GlassButton } from "@/components/GlassButton";
import { StepItem } from "@/components/StepStatus";
import { formatUtcDateTime, formatShortAddress } from "@/lib/format";

interface CredentialRow {
  publicKey: PublicKey;
  doctor: string;
  issuer: string;
  active: boolean;
  issuedAt: number;
}

export default function PublisherPage() {
  const {
    mounted,
    connected,
    publicKey,
    signer,
    openWalletModal,
    isPublisher,
    programDeployed,
    balance,
    lowBalance,
    refreshRoles,
    demoEnabled,
    useDemo,
    demoKeypairs,
  } = useSolhealth();

  const activeAddress = publicKey ? publicKey.toBase58() : "";

  const [configState, setConfigState] = useState<{
    initialized: boolean;
    authority?: string;
  } | null>(null);

  const [doctorInput, setDoctorInput] = useState("");
  const [credentials, setCredentials] = useState<CredentialRow[]>([]);
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Destructive inline confirm target doctor
  const [confirmRevokeDoctor, setConfirmRevokeDoctor] = useState<string | null>(null);

  // Card 01 State
  const [setupSteps, setSetupSteps] = useState<StepItem[]>([]);
  const [setupError, setSetupError] = useState<string | null>(null);
  const [setupSuccess, setSetupSuccess] = useState<string | null>(null);
  const [setupTx, setSetupTx] = useState<string | null>(null);

  // Card 02 State
  const [verifySteps, setVerifySteps] = useState<StepItem[]>([]);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [verifySuccess, setVerifySuccess] = useState<string | null>(null);
  const [verifyTx, setVerifyTx] = useState<string | null>(null);

  // Card 03 State
  const [registryError, setRegistryError] = useState<string | null>(null);
  const [registrySuccess, setRegistrySuccess] = useState<string | null>(null);
  const [registryTx, setRegistryTx] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setRefreshing(true);
    try {
      const cfg = await getConfig();
      if (cfg) {
        setConfigState({
          initialized: true,
          authority: cfg.authority.toBase58(),
        });
      } else {
        setConfigState({ initialized: false });
      }

      const creds = await listCredentials();
      setCredentials(
        creds.map((c) => ({
          publicKey: c.publicKey,
          doctor: c.account.doctor.toBase58(),
          issuer: c.account.issuer.toBase58(),
          active: c.account.active,
          issuedAt: Number(c.account.issuedAt) * 1000,
        }))
      );
    } catch (e: any) {
      console.warn("Error loading publisher data:", e);
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (mounted) {
      void loadData();
    }
  }, [mounted, loadData, activeAddress]);

  const isConfigMissing = configState !== null && !configState.initialized;
  const isConfigByMe = Boolean(
    configState?.initialized &&
      configState.authority &&
      activeAddress &&
      configState.authority === activeAddress
  );
  const isConfigByOther = Boolean(
    configState?.initialized &&
      configState.authority &&
      activeAddress &&
      configState.authority !== activeAddress
  );

  const hasEnoughSolForSetup = balance >= 0.01;
  const canSetup =
    connected &&
    signer &&
    programDeployed &&
    hasEnoughSolForSetup &&
    isConfigMissing &&
    loadingAction === null;

  // Handle Init Config
  const handleInitConfig = async () => {
    if (!connected || !signer || !canSetup) return;
    setSetupError(null);
    setSetupSuccess(null);
    setSetupTx(null);
    setLoadingAction("setup");
    setSetupSteps([
      { name: "Initializing registry", status: "running", detail: "Signing as authority" },
    ]);

    try {
      const sig = await initConfig(signer);
      setSetupTx(sig);
      setSetupSteps([
        { name: "Registry initialized", status: "done", detail: `Tx: ${formatShortAddress(sig, 8)}` },
      ]);
      setSetupSuccess("SolHealth protocol registry successfully initialized on-chain.");
      await loadData();
      await refreshRoles();
    } catch (err: any) {
      const rawMsg = err?.message || String(err);
      const isRejection =
        rawMsg.includes("User rejected") ||
        rawMsg.includes("4001") ||
        rawMsg.includes("cancelled");
      const msg = isRejection ? "You cancelled the request in your wallet" : mapProgramError(err);
      setSetupError(msg);
      setSetupSteps([{ name: "Initialization failed", status: "error" }]);
    } finally {
      setLoadingAction(null);
    }
  };

  // Handle Verify Doctor
  const handleVerifyDoctor = async () => {
    if (!connected || !signer || !isConfigByMe || !programDeployed) return;
    setVerifyError(null);
    setVerifySuccess(null);
    setVerifyTx(null);

    const docTrimmed = doctorInput.trim();
    if (!docTrimmed) {
      setVerifyError("Please enter a valid Doctor Solana wallet address.");
      return;
    }

    let doctorPubkey: PublicKey;
    try {
      doctorPubkey = new PublicKey(docTrimmed);
    } catch {
      setVerifyError("Invalid Doctor Public Key format: please paste a valid 32-byte base58 address.");
      return;
    }

    setLoadingAction("verify");
    setVerifySteps([
      { name: "Verifying doctor license", status: "running", detail: `Target: ${formatShortAddress(docTrimmed, 6)}` },
    ]);

    try {
      const sig = await issueCredential(signer, doctorPubkey);
      setVerifyTx(sig);
      setVerifySteps([
        { name: "Credential issued", status: "done", detail: `Tx: ${formatShortAddress(sig, 8)}` },
      ]);
      setVerifySuccess(`Active credential verified and issued to doctor ${formatShortAddress(docTrimmed, 6)}.`);
      setDoctorInput("");
      await loadData();
      await refreshRoles();
    } catch (err: any) {
      const rawMsg = err?.message || String(err);
      const isRejection =
        rawMsg.includes("User rejected") ||
        rawMsg.includes("4001") ||
        rawMsg.includes("cancelled");
      const msg = isRejection ? "You cancelled the request in your wallet" : mapProgramError(err);
      setVerifyError(msg);
      setVerifySteps([{ name: "Verification failed", status: "error" }]);
    } finally {
      setLoadingAction(null);
    }
  };

  // Handle Revoke Credential
  const handleExecuteRevoke = async (doctorAddr: string) => {
    if (!connected || !signer || !isConfigByMe || !programDeployed) return;
    setRegistryError(null);
    setRegistrySuccess(null);
    setRegistryTx(null);
    setLoadingAction(`revoke-${doctorAddr}`);

    try {
      const doctorPubkey = new PublicKey(doctorAddr);
      const sig = await revokeCredential(signer, doctorPubkey);
      setRegistryTx(sig);
      setRegistrySuccess(`Doctor credential for ${formatShortAddress(doctorAddr, 6)} has been revoked.`);
      setConfirmRevokeDoctor(null);
      await loadData();
      await refreshRoles();
    } catch (err: any) {
      const rawMsg = err?.message || String(err);
      const isRejection =
        rawMsg.includes("User rejected") ||
        rawMsg.includes("4001") ||
        rawMsg.includes("cancelled");
      const msg = isRejection ? "You cancelled the request in your wallet" : mapProgramError(err);
      setRegistryError(msg);
    } finally {
      setLoadingAction(null);
    }
  };

  // Compute checklist states
  const isSetupDone = isConfigByMe;
  const isVerifyDone = credentials.length > 0;

  const checklist: ChecklistStep[] = [
    {
      number: "1",
      label: "Set up registry",
      status: isSetupDone ? "done" : "next",
      targetCardId: "card-setup",
    },
    {
      number: "2",
      label: "Issue credential",
      status: isVerifyDone ? "done" : isSetupDone ? "next" : "waiting",
      targetCardId: "card-verify",
    },
    {
      number: "3",
      label: "Review credentials",
      status: credentials.length > 0 ? "done" : "waiting",
      targetCardId: "card-registry",
    },
  ];

  const nextStepText = !connected
    ? "Connect your authority wallet to manage the registry."
    : !isSetupDone
    ? isConfigByOther
      ? "Registry belongs to another authority. Switch wallets to manage."
      : "Set up the registry to begin issuing credentials."
    : credentials.length === 0
    ? "Verify your first doctor's wallet address in step 2."
    : "Review active and revoked doctor credentials.";

  return (
    <RolePage
      role="issuer"
      roleTitle={ROLE_LABELS.issuer}
      breadcrumbLabel={ROLE_LABELS.issuer}
      titleQuestion="Who is allowed to treat patients?"
      whatYouCanDo="Initialize the SolHealth registry, verify doctor credentials on-chain, and revoke credentials."
      checklist={checklist}
      nextStepText={nextStepText}
      roleDescription="Medical authority verifying doctor licenses and issuing on-chain credentials."
    >
      {/* Wallet Gating Card if Disconnected */}
      {mounted && !connected && (
        <div className="p-6 rounded-[24px] bg-[#fffdf6] border border-[#f9c933]/40 shadow-xs space-y-4">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#8a5a00]" />
            <h3 className="font-headline font-bold text-base text-[#1b1f2a]">
              Wallet Connection Required
            </h3>
          </div>
          <p className="text-sm text-[#6b7280] leading-relaxed">
            Publisher operations require signing on-chain transactions as the registry authority. Please connect your Solana wallet.
          </p>
          <GlassButton variant="primary" onClick={openWalletModal}>
            Connect wallet
          </GlassButton>
        </div>
      )}

      {/* Gating if registry is set up by a different wallet */}
      {mounted && connected && isConfigByOther && (
        <div className="p-6 rounded-[24px] bg-[#fde8e6] border border-[#fbd0cb] shadow-xs space-y-3">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#b42318]" />
            <h3 className="font-headline font-bold text-base text-[#b42318]">
              Authority Access Restricted
            </h3>
          </div>
          <p className="text-sm text-[#1b1f2a] leading-relaxed">
            Only the registry authority can verify doctors or manage credentials. This registry was initialized by authority{" "}
            <span className="font-mono font-bold text-xs bg-white px-2 py-0.5 rounded-md border border-[rgba(27,31,42,0.08)]">
              {configState?.authority}
            </span>
            . To manage doctors, connect using that wallet address.
          </p>
        </div>
      )}

      {/* ======================================================== */}
      {/* CARD 01: SET UP THE REGISTRY                             */}
      {/* ======================================================== */}
      <StepCard
        id="card-setup"
        stepNumber="01"
        title="Set up the registry"
        description="One-time setup to register this Publisher wallet as the authority that can verify doctors."
        result={
          <InlineResultArea
            errorMessage={setupError}
            successMessage={setupSuccess}
            txSignature={setupTx}
            steps={setupSteps}
          />
        }
      >
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="text-xs font-headline font-semibold text-[#6b7280]">
                Registry Status
              </div>
              <div className="flex items-center gap-2">
                {isConfigByMe ? (
                  <span className="status-pill status-pill-ok">
                    Set up by this wallet ({formatShortAddress(configState!.authority!, 4)})
                  </span>
                ) : isConfigByOther ? (
                  <span className="status-pill status-pill-warn">
                    Set up by a different wallet ({formatShortAddress(configState!.authority!, 4)})
                  </span>
                ) : (
                  <span className="status-pill status-pill-warn">
                    Not set up
                  </span>
                )}
              </div>
            </div>

            <GlassButton
              variant="primary"
              onClick={handleInitConfig}
              disabled={!canSetup}
              loading={loadingAction === "setup"}
              loadingText="Setting up..."
            >
              {isConfigByMe ? "Already set up" : "Set up registry"}
            </GlassButton>
          </div>

          {/* Warning when not set up */}
          {isConfigMissing && (
            <div className="p-3.5 rounded-[16px] bg-[#fff8d6] border border-[#fde293] text-xs text-[#8a5a00] font-medium leading-relaxed">
              The wallet that sets up the registry becomes the Publisher. Use your Publisher account.
            </div>
          )}

          {/* Low balance hint */}
          {lowBalance && isConfigMissing && (
            <p className="text-xs text-[#b42318]">
              Your wallet balance is low ({balance.toFixed(4)} SOL). Setting up the registry requires ~0.01 SOL for rent exemption and fees.
            </p>
          )}
        </div>
      </StepCard>

      {/* ======================================================== */}
      {/* CARD 02: VERIFY DOCTOR LICENSE                           */}
      {/* ======================================================== */}
      <StepCard
        id="card-verify"
        stepNumber="02"
        title="Verify doctor license"
        description="Issue an on-chain credential to an authorized doctor's Solana public key."
        result={
          <InlineResultArea
            errorMessage={verifyError}
            successMessage={verifySuccess}
            txSignature={verifyTx}
            steps={verifySteps}
          />
        }
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <label
              htmlFor="doctor-pubkey"
              className="block font-headline font-semibold text-xs text-[#1b1f2a]"
            >
              Doctor Solana Wallet Address
            </label>
            <div className="flex flex-col sm:flex-row gap-2.5">
              <input
                id="doctor-pubkey"
                type="text"
                value={doctorInput}
                onChange={(e) => setDoctorInput(e.target.value)}
                placeholder="Paste doctor's base58 public key..."
                disabled={!isConfigByMe}
                className="flex-1 px-4 py-2.5 rounded-[16px] bg-white border border-[rgba(27,31,42,0.12)] text-xs font-mono text-[#1b1f2a] placeholder:text-[#9ca3af] focus:outline-hidden focus:border-[#f9c933] disabled:opacity-50"
              />
              <GlassButton
                variant="primary"
                onClick={handleVerifyDoctor}
                disabled={!isConfigByMe || !doctorInput.trim() || loadingAction !== null}
                loading={loadingAction === "verify"}
                loadingText="Verifying..."
              >
                Verify doctor
              </GlassButton>
            </div>
          </div>

          {/* Helper when demo mode active */}
          {demoEnabled && useDemo && demoKeypairs && isConfigByMe && (
            <div className="flex items-center gap-2 pt-1">
              <span className="text-xs text-[#6b7280]">Demo Doctor:</span>
              <button
                type="button"
                onClick={() => setDoctorInput(demoKeypairs.doctor.publicKey.toBase58())}
                className="text-xs font-mono font-medium text-[#8a5a00] hover:underline bg-[#fff9e6] px-2 py-0.5 rounded-md"
              >
                Paste Demo Doctor Address
              </button>
            </div>
          )}
        </div>
      </StepCard>

      {/* ======================================================== */}
      {/* CARD 03: CREDENTIAL REGISTRY                             */}
      {/* ======================================================== */}
      <StepCard
        id="card-registry"
        stepNumber="03"
        title="Credential Registry"
        description="Inspect and manage all issued doctor credentials."
        result={
          <InlineResultArea
            errorMessage={registryError}
            successMessage={registrySuccess}
            txSignature={registryTx}
          />
        }
      >
        {refreshing ? (
          <div className="py-8 text-center text-xs font-mono text-[#6b7280]">
            Loading credentials...
          </div>
        ) : credentials.length === 0 ? (
          <EmptyStateBox message="No doctor credentials have been issued on this network yet." />
        ) : (
          <div className="space-y-3">
            {credentials.map((cred) => (
              <div
                key={cred.publicKey.toBase58()}
                className="p-4 rounded-[20px] bg-[#fffdf6] border border-[rgba(27,31,42,0.08)] flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2 font-mono text-xs">
                    <span className="font-bold text-[#1b1f2a]">Doctor:</span>
                    <span className="text-[#6b7280]">{formatShortAddress(cred.doctor, 6)}</span>
                    {cred.active ? (
                      <span className="status-pill status-pill-ok">Active</span>
                    ) : (
                      <span className="status-pill status-pill-danger">Revoked</span>
                    )}
                  </div>
                  <div className="text-[11px] font-mono text-[#6b7280]">
                    Issued: {formatUtcDateTime(cred.issuedAt)}
                  </div>
                </div>

                {isConfigByMe && cred.active && (
                  <div>
                    {confirmRevokeDoctor === cred.doctor ? (
                      <DestructiveConfirm
                        promptText="Revoke doctor license? This will immediately prevent the doctor from opening patient health records."
                        confirmLabel="Revoke license"
                        onConfirm={() => handleExecuteRevoke(cred.doctor)}
                        onCancel={() => setConfirmRevokeDoctor(null)}
                        loading={loadingAction === `revoke-${cred.doctor}`}
                      />
                    ) : (
                      <GlassButton
                        variant="danger"
                        size="sm"
                        onClick={() => setConfirmRevokeDoctor(cred.doctor)}
                        disabled={loadingAction !== null}
                      >
                        Remove verification
                      </GlassButton>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </StepCard>
    </RolePage>
  );
}
