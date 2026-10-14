"use client";

import React, { useState, useEffect, useCallback } from "react";
import { PublicKey } from "@solana/web3.js";
import { useRole } from "@/lib/roles";
import { 
  initConfig, 
  issueCredential, 
  revokeCredential, 
  getConfig, 
  listCredentials 
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

export default function IssuerPage() {
  const { keypairs, setRole, ready } = useRole();
  const issuerKeypair = ready && keypairs ? keypairs.issuer : null;
  const demoDoctorKey = ready && keypairs ? keypairs.doctor.publicKey.toBase58() : "";

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
      console.warn("Error loading issuer data:", e);
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    setRole("issuer");
    loadData();
  }, [loadData, setRole]);

  // Card 01: Handle Init Config
  const handleInitConfig = async () => {
    if (!ready || !issuerKeypair) return;
    setSetupError(null);
    setSetupSuccess(null);
    setSetupTx(null);
    setLoadingAction("setup");
    setSetupSteps([
      { name: "Initializing registry", status: "running", detail: "Signing as authority" },
    ]);

    try {
      const sig = await initConfig(issuerKeypair);
      setSetupTx(sig);
      setSetupSteps([
        { name: "Registry initialized", status: "done", detail: `Tx: ${formatShortAddress(sig, 8)}` },
      ]);
      setSetupSuccess("SolHealth protocol registry successfully initialized on-chain.");
      await loadData();
    } catch (err: any) {
      const msg = err.message || "Failed to initialize registry";
      setSetupError(msg);
      setSetupSteps([
        { name: "Initialization failed", status: "error", detail: msg },
      ]);
    } finally {
      setLoadingAction(null);
    }
  };

  // Card 02: Handle Verify Doctor
  const handleVerifyDoctor = async () => {
    if (!ready || !issuerKeypair) return;
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
      setVerifyError("Invalid Doctor Public Key format.");
      return;
    }

    setLoadingAction("verify");
    setVerifySteps([
      { name: "Verifying doctor license", status: "running", detail: `Target: ${formatShortAddress(docTrimmed, 6)}` },
    ]);

    try {
      const sig = await issueCredential(issuerKeypair, doctorPubkey);
      setVerifyTx(sig);
      setVerifySteps([
        { name: "Credential issued", status: "done", detail: `Tx: ${formatShortAddress(sig, 8)}` },
      ]);
      setVerifySuccess(`Active credential verified and issued to doctor ${formatShortAddress(docTrimmed, 6)}.`);
      setDoctorInput("");
      await loadData();
    } catch (err: any) {
      const msg = err.message || "Failed to verify doctor";
      setVerifyError(msg);
      setVerifySteps([
        { name: "Verification failed", status: "error", detail: msg },
      ]);
    } finally {
      setLoadingAction(null);
    }
  };

  // Card 03: Handle Revoke Credential (with inline confirmation)
  const handleExecuteRevoke = async (doctorAddr: string) => {
    if (!ready || !issuerKeypair) return;
    setRegistryError(null);
    setRegistrySuccess(null);
    setRegistryTx(null);
    setLoadingAction(`revoke-${doctorAddr}`);

    try {
      const doctorPubkey = new PublicKey(doctorAddr);
      const sig = await revokeCredential(issuerKeypair, doctorPubkey);
      setRegistryTx(sig);
      setRegistrySuccess(`Doctor credential for ${formatShortAddress(doctorAddr, 6)} has been revoked.`);
      setConfirmRevokeDoctor(null);
      await loadData();
    } catch (err: any) {
      const msg = err.message || "Failed to revoke credential";
      setRegistryError(msg);
    } finally {
      setLoadingAction(null);
    }
  };

  // Compute checklist states
  const isSetupDone = Boolean(configState?.initialized);
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

  const nextStepText = !isSetupDone
    ? "Set up the registry to begin issuing credentials."
    : credentials.length === 0
    ? "Verify your first doctor's wallet address in step 2."
    : "Review active verified doctors and credentials in step 3.";

  return (
    <RolePage
      role="issuer"
      roleTitle="Medical Authority"
      breadcrumbLabel="Issuer"
      titleQuestion="Who is allowed to treat patients?"
      whatYouCanDo="Set up protocol authority, verify clinician licenses, and revoke medical credentials on-chain."
      checklist={checklist}
      nextStepText={nextStepText}
      roleDescription="Medical authority verifying doctor licenses and issuing on-chain credentials."
    >
      {/* ======================================================== */}
      {/* CARD 01: SET UP THE REGISTRY                             */}
      {/* ======================================================== */}
      <StepCard
        id="card-setup"
        stepNumber="01"
        title="Set up the registry"
        description="One-time setup to register the active Issuer wallet as the protocol authority."
        result={
          <InlineResultArea
            errorMessage={setupError}
            successMessage={setupSuccess}
            txSignature={setupTx}
            steps={setupSteps}
          />
        }
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="text-xs font-headline font-semibold text-[#6b7280]">
              Registry Status
            </div>
            <div>
              {configState?.initialized ? (
                <span className="status-pill status-pill-ok">
                  Already set up
                </span>
              ) : (
                <span className="status-pill status-pill-warn">
                  Uninitialized
                </span>
              )}
            </div>
          </div>

          <GlassButton
            variant="primary"
            onClick={handleInitConfig}
            disabled={!ready || loadingAction === "setup" || configState?.initialized}
            loading={loadingAction === "setup"}
            loadingText="Setting up..."
          >
            {configState?.initialized ? "Already set up" : "Set up registry"}
          </GlassButton>
        </div>

        {configState?.initialized && configState.authority && (
          <TechnicalDetails
            title="Registry authority details"
            items={[
              { label: "Authority Address", value: configState.authority, isAddress: true },
            ]}
          />
        )}
      </StepCard>

      {/* ======================================================== */}
      {/* CARD 02: VERIFY A DOCTOR                                 */}
      {/* ======================================================== */}
      <StepCard
        id="card-verify"
        stepNumber="02"
        title="Verify a doctor"
        description="Authorize a licensed physician's wallet to receive time-bound record permissions from patients."
        result={
          <InlineResultArea
            errorMessage={verifyError}
            successMessage={verifySuccess}
            txSignature={verifyTx}
            steps={verifySteps}
          />
        }
      >
        <div className="space-y-4 max-w-xl">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="doctor-address-field" className="text-xs font-headline font-semibold text-[#1b1f2a]">
                Doctor&apos;s wallet address
              </label>
              <GlassButton
                variant="chip"
                type="button"
                onClick={() => setDoctorInput(demoDoctorKey)}
                disabled={!ready || !demoDoctorKey}
              >
                Use demo doctor
              </GlassButton>
            </div>

            <input
              id="doctor-address-field"
              type="text"
              value={doctorInput}
              onChange={(e) => setDoctorInput(e.target.value)}
              placeholder="Base58 Solana public key (e.g. 7X...)"
              className="pill-input font-mono text-xs"
            />
            <p className="text-[11px] text-[#6b7280]">
              The public key of the physician requesting access to patient records.
            </p>
          </div>

          <GlassButton
            variant="primary"
            onClick={handleVerifyDoctor}
            disabled={!ready || loadingAction === "verify" || !doctorInput.trim()}
            loading={loadingAction === "verify"}
            loadingText="Verifying..."
          >
            Verify doctor
          </GlassButton>
        </div>
      </StepCard>

      {/* ======================================================== */}
      {/* CARD 03: VERIFIED DOCTORS                                */}
      {/* ======================================================== */}
      <StepCard
        id="card-registry"
        stepNumber="03"
        title="Verified doctors"
        description="Review all clinicians holding on-chain medical credentials issued by this authority."
        result={
          <InlineResultArea
            errorMessage={registryError}
            successMessage={registrySuccess}
            txSignature={registryTx}
          />
        }
      >
        <div className="flex items-center justify-between pb-2">
          <span className="text-xs font-headline font-semibold text-[#6b7280]">
            {credentials.length} credentials recorded
          </span>
          <GlassButton
            variant="secondary"
            size="sm"
            onClick={loadData}
            loading={refreshing}
            loadingText="Refreshing..."
          >
            Refresh
          </GlassButton>
        </div>

        {credentials.length === 0 ? (
          <EmptyStateBox
            message="No verified doctors yet. Verify your first doctor in step 2."
            actionLabel="Go to step 2"
            onAction={() => {
              const el = document.getElementById("card-verify");
              if (el) el.scrollIntoView({ behavior: "smooth" });
            }}
          />
        ) : (
          <div className="space-y-3">
            {credentials.map((cred) => {
              const isConfirming = confirmRevokeDoctor === cred.doctor;
              const isRevoking = loadingAction === `revoke-${cred.doctor}`;

              return (
                <div
                  key={cred.doctor}
                  className="p-4 sm:p-5 rounded-[20px] bg-[#fffdf6] border border-[rgba(27,31,42,0.08)] space-y-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <span className="font-mono text-xs font-bold text-[#1b1f2a]">
                        {formatShortAddress(cred.doctor, 6)}
                      </span>
                      {cred.active ? (
                        <span className="status-pill status-pill-ok">Active</span>
                      ) : (
                        <span className="status-pill status-pill-danger">Revoked</span>
                      )}
                    </div>

                    <div className="text-xs font-mono text-[#6b7280]">
                      Issued {formatUtcDateTime(cred.issuedAt)}
                    </div>
                  </div>

                  {/* Destructive Confirmation or Action Button */}
                  {cred.active && (
                    <div className="pt-2 border-t border-[rgba(27,31,42,0.06)] flex items-center justify-between">
                      {isConfirming ? (
                        <DestructiveConfirm
                          promptText={`Remove verification for doctor ${formatShortAddress(cred.doctor, 6)}?`}
                          confirmLabel="Yes, remove verification"
                          cancelLabel="Cancel"
                          loading={isRevoking}
                          onConfirm={() => handleExecuteRevoke(cred.doctor)}
                          onCancel={() => setConfirmRevokeDoctor(null)}
                        />
                      ) : (
                        <GlassButton
                          variant="danger"
                          size="sm"
                          onClick={() => setConfirmRevokeDoctor(cred.doctor)}
                          disabled={!ready || loadingAction !== null}
                        >
                          Remove verification
                        </GlassButton>
                      )}
                    </div>
                  )}

                  {/* Technical Details Toggle */}
                  <TechnicalDetails
                    title="Credential technical details"
                    items={[
                      { label: "Doctor Public Key", value: cred.doctor, isAddress: true },
                      { label: "Issuer Public Key", value: cred.issuer, isAddress: true },
                      { label: "Credential PDA", value: cred.publicKey.toBase58(), isAddress: true },
                    ]}
                  />
                </div>
              );
            })}
          </div>
        )}
      </StepCard>
    </RolePage>
  );
}
