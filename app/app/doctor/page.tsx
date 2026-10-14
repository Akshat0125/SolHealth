"use client";

import React, { useState, useEffect, useCallback } from "react";
import { PublicKey } from "@solana/web3.js";
import { useRole } from "@/lib/roles";
import { 
  decryptFile, 
  unwrapKey 
} from "@/lib/crypto";
import { 
  accessRecord, 
  getRecord, 
  getCredential, 
  listAccessForDoctor 
} from "@/lib/solana";
import { fetchFromIpfs } from "@/lib/ipfs";
import { 
  RolePage, 
  StepCard, 
  InlineResultArea, 
  TechnicalDetails, 
  EmptyStateBox, 
  ChecklistStep 
} from "@/components/RolePage";
import { GlassButton } from "@/components/GlassButton";
import { StepItem } from "@/components/StepStatus";
import { formatShortAddress } from "@/lib/format";

interface DoctorSharedRecord {
  accessPda: string;
  recordPda: string;
  recordId: string;
  cid: string;
  fileHashHex: string;
  doctorWrappedKey: Uint8Array;
  expirySeconds: number;
  revoked: boolean;
  patientPubkey: string;
}

interface DecryptedRecordView {
  recordId: string;
  recordPda: string;
  cid: string;
  fileHashHex: string;
  contentType: "text" | "image" | "binary";
  textContent?: string;
  blobUrl?: string;
  rawBytes: Uint8Array;
}

export default function DoctorPage() {
  const { keypairs, setRole, ready } = useRole();
  const doctorKeypair = ready && keypairs ? keypairs.doctor : null;

  const [credentialState, setCredentialState] = useState<{
    exists: boolean;
    active: boolean;
    issuer?: string;
  } | null>(null);

  const [sharedRecords, setSharedRecords] = useState<DoctorSharedRecord[]>([]);
  // Compute countdowns in an effect with state initialised to null to prevent hydration mismatch
  const [nowTime, setNowTime] = useState<number | null>(null);
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Decrypted record preview state
  const [decryptedView, setDecryptedView] = useState<DecryptedRecordView | null>(null);

  // Per-record opening progress and error
  const [openSteps, setOpenSteps] = useState<Record<string, StepItem[]>>({});
  const [openError, setOpenError] = useState<Record<string, string | null>>({});

  // Clock tick for live countdowns (only on client)
  useEffect(() => {
    setNowTime(Math.floor(Date.now() / 1000));
    const timer = setInterval(() => {
      setNowTime(Math.floor(Date.now() / 1000));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const loadData = useCallback(async () => {
    if (!doctorKeypair) return;
    setRefreshing(true);
    try {
      // 1. Fetch Doctor's credential status
      const cred = await getCredential(doctorKeypair.publicKey);
      if (cred) {
        setCredentialState({
          exists: true,
          active: cred.active,
          issuer: cred.issuer.toBase58(),
        });
      } else {
        setCredentialState({ exists: false, active: false });
      }

      // 2. Fetch all access grants for this doctor
      const accessList = await listAccessForDoctor(doctorKeypair.publicKey);
      const recordsData: DoctorSharedRecord[] = [];

      for (const item of accessList) {
        const recordAcc = await getRecord(item.account.record);
        if (recordAcc) {
          const hashArray = Array.from(new Uint8Array(recordAcc.fileHash));
          const hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");

          recordsData.push({
            accessPda: item.publicKey.toBase58(),
            recordPda: item.account.record.toBase58(),
            recordId: recordAcc.recordId.toString(),
            cid: recordAcc.cid,
            fileHashHex: hashHex,
            doctorWrappedKey: new Uint8Array(item.account.wrappedKey),
            expirySeconds: Number(item.account.expiry),
            revoked: item.account.revoked,
            patientPubkey: recordAcc.patient.toBase58(),
          });
        }
      }

      setSharedRecords(recordsData);
    } catch (e: any) {
      console.warn("Failed to load doctor portal data:", e);
    } finally {
      setRefreshing(false);
    }
  }, [doctorKeypair]);

  useEffect(() => {
    setRole("doctor");
    if (ready) {
      loadData();
    }
  }, [loadData, setRole, ready]);

  // Handle "Open Record"
  const handleOpenRecord = async (record: DoctorSharedRecord) => {
    if (!ready || !doctorKeypair) return;

    // Reset error for this record
    setOpenError((prev) => ({ ...prev, [record.accessPda]: null }));

    // Front-end sanity checks with clear guidance
    if (!credentialState?.active) {
      setOpenError((prev) => ({
        ...prev,
        [record.accessPda]: "Access denied: You do not possess an active medical credential. Ask the medical authority to verify your wallet in Issuer portal.",
      }));
      return;
    }

    if (record.revoked) {
      setOpenError((prev) => ({
        ...prev,
        [record.accessPda]: "Access denied: The patient has revoked access to this record. Ask the patient to re-grant access if needed.",
      }));
      return;
    }

    const currentSec = Math.floor(Date.now() / 1000);
    if (currentSec >= record.expirySeconds) {
      setOpenError((prev) => ({
        ...prev,
        [record.accessPda]: "Access denied: Time-bound permission has expired. Ask the patient to grant a new access window.",
      }));
      return;
    }

    setLoadingAction(`open-${record.accessPda}`);
    const initialSteps: StepItem[] = [
      { name: "1 Verifying access on-chain", status: "running", detail: "Signing access_record" },
      { name: "2 Downloading ciphertext", status: "idle", detail: `CID: ${formatShortAddress(record.cid, 6)}` },
      { name: "3 Unwrapping symmetric key", status: "idle", detail: "Doctor secret key" },
      { name: "4 Decrypting record", status: "idle", detail: "AES-256-GCM" },
    ];
    setOpenSteps((prev) => ({ ...prev, [record.accessPda]: initialSteps }));

    try {
      // Step 1: Submit on-chain access_record call
      const recordPubkey = new PublicKey(record.recordPda);
      const sig = await accessRecord(doctorKeypair, recordPubkey);

      setOpenSteps((prev) => ({
        ...prev,
        [record.accessPda]: prev[record.accessPda]?.map((s, idx) =>
          idx === 0
            ? { ...s, status: "done", detail: `Tx: ${formatShortAddress(sig, 8)}` }
            : idx === 1
            ? { ...s, status: "running" }
            : s
        ) || [],
      }));

      // Step 2: Download encrypted ciphertext from IPFS
      const ciphertext = await fetchFromIpfs(record.cid);
      setOpenSteps((prev) => ({
        ...prev,
        [record.accessPda]: prev[record.accessPda]?.map((s, idx) =>
          idx === 1
            ? { ...s, status: "done", detail: `${ciphertext.length} bytes downloaded` }
            : idx === 2
            ? { ...s, status: "running" }
            : s
        ) || [],
      }));

      // Step 3: Unwrap symmetric key with Doctor's secret key
      const rawKey = unwrapKey(record.doctorWrappedKey, doctorKeypair.secretKey);
      setOpenSteps((prev) => ({
        ...prev,
        [record.accessPda]: prev[record.accessPda]?.map((s, idx) =>
          idx === 2
            ? { ...s, status: "done", detail: "Key unwrapped" }
            : idx === 3
            ? { ...s, status: "running" }
            : s
        ) || [],
      }));

      // Step 4: Decrypt ciphertext using raw key
      const decryptedBytes = await decryptFile(ciphertext, rawKey);
      setOpenSteps((prev) => ({
        ...prev,
        [record.accessPda]: prev[record.accessPda]?.map((s, idx) =>
          idx === 3
            ? { ...s, status: "done", detail: `${decryptedBytes.length} bytes decrypted` }
            : s
        ) || [],
      }));

      // Detect content type
      let isText = false;
      let textContent: string | undefined = undefined;
      let isPngOrJpg = false;
      let blobUrl: string | undefined = undefined;

      // Check PNG magic bytes: 89 50 4E 47
      if (
        decryptedBytes.length > 4 &&
        decryptedBytes[0] === 0x89 &&
        decryptedBytes[1] === 0x50 &&
        decryptedBytes[2] === 0x4e &&
        decryptedBytes[3] === 0x47
      ) {
        isPngOrJpg = true;
        const blob = new Blob([decryptedBytes.buffer as ArrayBuffer], { type: "image/png" });
        blobUrl = URL.createObjectURL(blob);
      } else if (
        decryptedBytes.length > 3 &&
        decryptedBytes[0] === 0xff &&
        decryptedBytes[1] === 0xd8 &&
        decryptedBytes[2] === 0xff
      ) {
        isPngOrJpg = true;
        const blob = new Blob([decryptedBytes.buffer as ArrayBuffer], { type: "image/jpeg" });
        blobUrl = URL.createObjectURL(blob);
      } else {
        try {
          const decoder = new TextDecoder("utf-8", { fatal: true });
          textContent = decoder.decode(decryptedBytes);
          isText = true;
        } catch {
          isText = false;
          const blob = new Blob([decryptedBytes.buffer as ArrayBuffer], { type: "application/octet-stream" });
          blobUrl = URL.createObjectURL(blob);
        }
      }

      setDecryptedView({
        recordId: record.recordId,
        recordPda: record.recordPda,
        cid: record.cid,
        fileHashHex: record.fileHashHex,
        contentType: isPngOrJpg ? "image" : isText ? "text" : "binary",
        textContent,
        blobUrl,
        rawBytes: decryptedBytes,
      });

      // Scroll to viewer card
      setTimeout(() => {
        const viewerEl = document.getElementById("card-viewer");
        if (viewerEl) viewerEl.scrollIntoView({ behavior: "smooth" });
      }, 100);
    } catch (err: any) {
      const msg = err.message || "Failed to decrypt and open medical record";
      setOpenError((prev) => ({ ...prev, [record.accessPda]: msg }));
      setOpenSteps((prev) => ({
        ...prev,
        [record.accessPda]: prev[record.accessPda]?.map((s) =>
          s.status === "running" ? { ...s, status: "error", detail: msg } : s
        ) || [],
      }));
    } finally {
      setLoadingAction(null);
    }
  };

  // Helper to format countdown
  const formatCountdown = (expirySec: number, revoked: boolean) => {
    if (revoked) return { text: "Revoked", isRevoked: true, isExpired: false };
    if (nowTime === null) return { text: "Calculating...", isRevoked: false, isExpired: false };
    const diff = expirySec - nowTime;
    if (diff <= 0) return { text: "Expired", isRevoked: false, isExpired: true };

    const mins = Math.floor(diff / 60);
    const secs = diff % 60;
    return {
      text: `${mins}m ${secs}s left`,
      isRevoked: false,
      isExpired: false,
    };
  };

  // Compute checklist states
  const isStatusDone = Boolean(ready && credentialState?.active);
  const isOpenDone = Boolean(decryptedView !== null);

  const checklist: ChecklistStep[] = [
    {
      number: "1",
      label: "Check your status",
      status: isStatusDone ? "done" : "next",
      targetCardId: "card-status",
    },
    {
      number: "2",
      label: "Open a record",
      status: isOpenDone ? "done" : isStatusDone ? "next" : "waiting",
      targetCardId: "card-shared",
    },
  ];

  const nextStepText = !isStatusDone
    ? "Ask the issuer to verify this wallet address to receive access permissions."
    : sharedRecords.length === 0
    ? "Ask a patient to share a medical record with your doctor address."
    : !isOpenDone
    ? "Open a shared medical record in step 2."
    : "Review the decrypted medical record in the viewer below.";

  return (
    <RolePage
      role="doctor"
      roleTitle="Doctor"
      breadcrumbLabel="Doctor"
      titleQuestion="What have you been given access to?"
      whatYouCanDo="Review your medical license status, browse patient records shared with you, and decrypt records within valid access windows."
      checklist={checklist}
      nextStepText={nextStepText}
      roleDescription="Verified clinician reading records shared by patients within granted expiry times."
    >
      {/* ======================================================== */}
      {/* CARD 01: YOUR STATUS                                     */}
      {/* ======================================================== */}
      <StepCard
        id="card-status"
        stepNumber="01"
        title="Your status"
        description="Verify that your clinician wallet holds an active credential issued by the medical authority."
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-[18px] bg-[#fffdf6] border border-[rgba(27,31,42,0.06)]">
          <div className="space-y-1">
            <div className="text-xs font-headline font-semibold text-[#6b7280]">
              Medical License Status
            </div>
            <div>
              {ready && credentialState?.active ? (
                <span className="status-pill status-pill-ok">
                  Verified doctor
                </span>
              ) : (
                <span className="status-pill status-pill-danger">
                  Not verified
                </span>
              )}
            </div>
          </div>

          {!credentialState?.active && (
            <p className="text-xs text-[#b42318] font-medium max-w-xs">
              Ask the medical licensing council to verify this wallet address in the Issuer portal.
            </p>
          )}
        </div>

        <TechnicalDetails
          title="Doctor credential details"
          items={[
            {
              label: "Doctor Address",
              value: ready && doctorKeypair ? doctorKeypair.publicKey.toBase58() : "----",
              isAddress: true,
            },
            ...(credentialState?.issuer
              ? [{ label: "Authority Address", value: credentialState.issuer, isAddress: true }]
              : []),
          ]}
        />
      </StepCard>

      {/* ======================================================== */}
      {/* CARD 02: SHARED WITH YOU                                 */}
      {/* ======================================================== */}
      <StepCard
        id="card-shared"
        stepNumber="02"
        title="Shared with you"
        description="Browse records patients have granted you time-bound access to, and open them while active."
      >
        <div className="flex items-center justify-between pb-2">
          <span className="text-xs font-headline font-semibold text-[#6b7280]">
            {sharedRecords.length} shared records
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

        {sharedRecords.length === 0 ? (
          <EmptyStateBox
            message="No records shared with you yet. Ask a patient to grant access to your doctor address."
          />
        ) : (
          <div className="space-y-4">
            {sharedRecords.map((item) => {
              const countdown = formatCountdown(item.expirySeconds, item.revoked);
              const isBlocked = countdown.isExpired || countdown.isRevoked || !credentialState?.active;
              const isOpeningThis = loadingAction === `open-${item.accessPda}`;
              const thisSteps = openSteps[item.accessPda] || [];
              const thisError = openError[item.accessPda];

              let blockedReason = "";
              if (!credentialState?.active) {
                blockedReason = "You do not have an active medical credential.";
              } else if (countdown.isRevoked) {
                blockedReason = "Access revoked by the patient.";
              } else if (countdown.isExpired) {
                blockedReason = "Access permission has expired.";
              }

              return (
                <div
                  key={item.accessPda}
                  className="p-5 rounded-[22px] bg-[#fffdf6] border border-[rgba(27,31,42,0.08)] space-y-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[rgba(27,31,42,0.06)]">
                    <div className="flex items-center gap-2.5">
                      <span className="font-headline font-bold text-sm text-[#1b1f2a]">
                        Record #{item.recordId.slice(-6)}
                      </span>
                      <span className="text-xs font-mono text-[#6b7280]">
                        from {formatShortAddress(item.patientPubkey, 6)}
                      </span>
                    </div>

                    <div>
                      {countdown.isRevoked ? (
                        <span className="status-pill status-pill-danger">Revoked</span>
                      ) : countdown.isExpired ? (
                        <span className="status-pill status-pill-warn">Expired</span>
                      ) : (
                        <span className="status-pill status-pill-ok">{countdown.text}</span>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="text-xs font-mono text-[#6b7280]">
                      IPFS CID: {formatShortAddress(item.cid, 6)}
                    </div>

                    {isBlocked ? (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-[#b42318] font-medium">
                          {blockedReason}
                        </span>
                        <GlassButton variant="secondary" size="sm" disabled>
                          Open record
                        </GlassButton>
                      </div>
                    ) : (
                      <GlassButton
                        variant="primary"
                        size="sm"
                        onClick={() => handleOpenRecord(item)}
                        disabled={!ready || isOpeningThis}
                        loading={isOpeningThis}
                        loadingText="Opening..."
                      >
                        Open record
                      </GlassButton>
                    )}
                  </div>

                  {/* Inline Error or Denied Block */}
                  {thisError && (
                    <div className="rounded-[16px] bg-[#fde8e6] border border-[#fbd0cb] p-4 text-xs space-y-1">
                      <div className="flex items-center gap-1.5 font-headline font-bold text-[#b42318] uppercase tracking-wider">
                        <span className="w-2 h-2 rounded-full bg-[#b42318]" />
                        Access Denied
                      </div>
                      <p className="text-[#1b1f2a] font-medium leading-relaxed">
                        {thisError}
                      </p>
                    </div>
                  )}

                  {/* Multi-step progress during opening */}
                  {isOpeningThis && thisSteps.length > 0 && (
                    <InlineResultArea steps={thisSteps} />
                  )}

                  {/* Technical Details */}
                  <TechnicalDetails
                    title="Access permission details"
                    items={[
                      { label: "Record PDA", value: item.recordPda, isAddress: true },
                      { label: "Access PDA", value: item.accessPda, isAddress: true },
                      { label: "IPFS CID", value: item.cid },
                      { label: "File Hash", value: item.fileHashHex },
                    ]}
                  />
                </div>
              );
            })}
          </div>
        )}
      </StepCard>

      {/* ======================================================== */}
      {/* CARD 03: RECORD VIEWER                                   */}
      {/* ======================================================== */}
      {decryptedView && (
        <StepCard
          id="card-viewer"
          stepNumber="03"
          title={`Decrypted Record #${decryptedView.recordId.slice(-6)}`}
          description="View the decrypted health document or download it to your device."
        >
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[rgba(27,31,42,0.06)]">
            <span className="text-xs font-mono text-[#6b7280]">
              Format: {decryptedView.contentType.toUpperCase()} ({decryptedView.rawBytes.length} bytes)
            </span>

            <div className="flex items-center gap-2">
              <GlassButton
                variant="secondary"
                size="sm"
                onClick={() => {
                  if (decryptedView.blobUrl) {
                    const a = document.createElement("a");
                    a.href = decryptedView.blobUrl;
                    a.download = `record-${decryptedView.recordId}.${decryptedView.contentType === "image" ? "png" : "bin"}`;
                    a.click();
                  } else if (decryptedView.textContent) {
                    const blob = new Blob([decryptedView.textContent], { type: "text/plain" });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = `record-${decryptedView.recordId}.txt`;
                    a.click();
                  }
                }}
              >
                Download
              </GlassButton>

              <GlassButton
                variant="secondary"
                size="sm"
                onClick={() => setDecryptedView(null)}
              >
                Close preview
              </GlassButton>
            </div>
          </div>

          {/* Viewer Area */}
          <div className="p-4 rounded-[18px] bg-[#fffdf6] border border-[rgba(27,31,42,0.08)] min-h-[140px]">
            {decryptedView.contentType === "image" && decryptedView.blobUrl && (
              <div className="text-center">
                <img
                  src={decryptedView.blobUrl}
                  alt={`Record ${decryptedView.recordId}`}
                  className="max-h-[460px] rounded-[14px] mx-auto object-contain border border-[rgba(27,31,42,0.08)]"
                />
              </div>
            )}

            {decryptedView.contentType === "text" && decryptedView.textContent && (
              <pre className="font-mono text-xs sm:text-sm text-[#1b1f2a] whitespace-pre-wrap leading-relaxed overflow-x-auto p-2">
                {decryptedView.textContent}
              </pre>
            )}

            {decryptedView.contentType === "binary" && (
              <div className="text-center py-6 font-body text-xs sm:text-sm text-[#6b7280]">
                Binary document ({decryptedView.rawBytes.length} bytes). Click Download above to open.
              </div>
            )}
          </div>

          <TechnicalDetails
            title="Decrypted file details"
            items={[
              { label: "IPFS CID", value: decryptedView.cid },
              { label: "Verified SHA-256 Hash", value: decryptedView.fileHashHex },
            ]}
          />
        </StepCard>
      )}
    </RolePage>
  );
}
