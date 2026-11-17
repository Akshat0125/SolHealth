"use client";

import React, { useState, useEffect, useCallback } from "react";
import { PublicKey } from "@solana/web3.js";
import { useSolhealth } from "@/lib/solhealth-context";
import { 
  decryptFile, 
  unwrapKeyX25519 
} from "@/lib/crypto";
import { 
  accessRecord, 
  getRecord, 
  getCredential, 
  listAccessForDoctor,
  mapProgramError 
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
  const {
    mounted,
    connected,
    publicKey,
    signer,
    openWalletModal,
    isDoctor,
    doctorCredential,
    encryptionStatus,
    encryptionSecretRef,
    activateEncryption,
    programDeployed,
  } = useSolhealth();

  const [sharedRecords, setSharedRecords] = useState<DoctorSharedRecord[]>([]);
  const [nowTime, setNowTime] = useState<number | null>(null);
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [activating, setActivating] = useState(false);

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
    if (!publicKey) return;
    setRefreshing(true);
    try {
      const accessList = await listAccessForDoctor(publicKey);
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
  }, [publicKey]);

  useEffect(() => {
    if (mounted && publicKey) {
      loadData();
    }
  }, [mounted, publicKey, loadData]);

  const copyDoctorAddress = async () => {
    if (!publicKey) return;
    try {
      await navigator.clipboard.writeText(publicKey.toBase58());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  };

  const handleActivate = async () => {
    setActivating(true);
    await activateEncryption();
    setActivating(false);
  };

  // Handle Open Record
  const handleOpenRecord = async (record: DoctorSharedRecord) => {
    if (!connected || !publicKey || !signer) return;

    setOpenError((prev) => ({ ...prev, [record.accessPda]: null }));

    if (programDeployed === false) {
      setOpenError((prev) => ({
        ...prev,
        [record.accessPda]: "SolHealth program is not deployed on this network. Run npm run demo:reset in a terminal.",
      }));
      return;
    }

    if (!isDoctor) {
      setOpenError((prev) => ({
        ...prev,
        [record.accessPda]: "Access denied: You do not possess an active medical credential. Ask the Publisher authority to verify your wallet.",
      }));
      return;
    }

    if (!encryptionSecretRef.current) {
      setOpenError((prev) => ({
        ...prev,
        [record.accessPda]: "Please activate your encryption session before opening records.",
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
      { name: "Verifying access on-chain", status: "running", detail: "Signing access_record" },
      { name: "Downloading ciphertext", status: "idle", detail: `CID: ${formatShortAddress(record.cid, 6)}` },
      { name: "Unwrapping symmetric key", status: "idle", detail: "X25519 memory secret" },
      { name: "Decrypting record", status: "idle", detail: "AES-256-GCM" },
    ];
    setOpenSteps((prev) => ({ ...prev, [record.accessPda]: initialSteps }));

    try {
      // Step 1: Submit on-chain access_record call
      const recordPubkey = new PublicKey(record.recordPda);
      const sig = await accessRecord(signer, recordPubkey);

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

      // Step 3: Unwrap symmetric key with Doctor's in-memory X25519 secret key
      const rawKey = unwrapKeyX25519(record.doctorWrappedKey, encryptionSecretRef.current);
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

      if (
        decryptedBytes.length > 4 &&
        decryptedBytes[0] === 0x89 &&
        decryptedBytes[1] === 0x50 &&
        decryptedBytes[2] === 0x4e &&
        decryptedBytes[3] === 0x47
      ) {
        isPngOrJpg = true;
        const blob = new Blob([decryptedBytes as unknown as BlobPart], { type: "image/png" });
        blobUrl = URL.createObjectURL(blob);
      } else {
        try {
          const decoder = new TextDecoder("utf-8", { fatal: true });
          textContent = decoder.decode(decryptedBytes);
          isText = true;
        } catch {
          isText = false;
          const blob = new Blob([decryptedBytes as unknown as BlobPart], { type: "application/octet-stream" });
          blobUrl = URL.createObjectURL(blob);
        }
      }

      setDecryptedView({
        recordId: record.recordId,
        recordPda: record.recordPda,
        cid: record.cid,
        fileHashHex: record.fileHashHex,
        contentType: isText ? "text" : isPngOrJpg ? "image" : "binary",
        textContent,
        blobUrl,
        rawBytes: decryptedBytes,
      });

      const viewerElem = document.getElementById("card-viewer");
      if (viewerElem) {
        viewerElem.scrollIntoView({ behavior: "smooth" });
      }
    } catch (err: any) {
      const rawMsg = err?.message || String(err);
      const isRejection =
        rawMsg.includes("User rejected") ||
        rawMsg.includes("4001") ||
        rawMsg.includes("cancelled");
      const msg = isRejection ? "You cancelled the request in your wallet" : mapProgramError(err);

      setOpenError((prev) => ({
        ...prev,
        [record.accessPda]: msg,
      }));

      setOpenSteps((prev) => ({
        ...prev,
        [record.accessPda]: prev[record.accessPda]?.map((s) =>
          s.status === "running" ? { ...s, status: "error", detail: "Failed" } : s
        ) || [],
      }));
    } finally {
      setLoadingAction(null);
    }
  };

  const formatCountdown = (expirySeconds: number, revoked: boolean) => {
    if (revoked) return { text: "Revoked", isExpired: true, isRevoked: true };
    if (nowTime === null) return { text: "Calculating...", isExpired: false, isRevoked: false };
    const diff = expirySeconds - nowTime;
    if (diff <= 0) return { text: "Expired", isExpired: true, isRevoked: false };

    const hours = Math.floor(diff / 3600);
    const minutes = Math.floor((diff % 3600) / 60);
    const seconds = diff % 60;

    if (hours > 0) return { text: `${hours}h ${minutes}m remaining`, isExpired: false, isRevoked: false };
    if (minutes > 0) return { text: `${minutes}m ${seconds}s remaining`, isExpired: false, isRevoked: false };
    return { text: `${seconds}s remaining`, isExpired: false, isRevoked: false };
  };

  const checklist: ChecklistStep[] = [
    {
      number: "1",
      label: "Medical license",
      status: isDoctor ? "done" : "waiting",
      targetCardId: "card-credential",
    },
    {
      number: "2",
      label: "Shared records",
      status: sharedRecords.length > 0 ? "done" : "next",
      targetCardId: "card-records",
    },
    {
      number: "3",
      label: "Record viewer",
      status: decryptedView ? "done" : "waiting",
      targetCardId: "card-viewer",
    },
  ];

  const nextStepText = !connected
    ? "Connect your doctor wallet to inspect shared records."
    : !isDoctor
    ? "This wallet is not verified yet. Send this address to the Publisher."
    : encryptionStatus !== "ready"
    ? "Activate your encryption session to decrypt records."
    : sharedRecords.length === 0
    ? "Waiting for a patient to grant access to your wallet."
    : "Open and decrypt a shared health record.";

  return (
    <RolePage
      role="doctor"
      roleTitle="Doctor"
      breadcrumbLabel="Doctor"
      titleQuestion="Which patient gave me permission to look?"
      whatYouCanDo="View medical records shared with you, verify cryptographic integrity, and decrypt medical documents."
      checklist={checklist}
      nextStepText={nextStepText}
      roleDescription="Credentialed clinician with time-bounded, auditable record access."
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
            Doctor operations require signing access verification transactions. Please connect your Solana wallet.
          </p>
          <GlassButton variant="primary" onClick={openWalletModal}>
            Connect wallet
          </GlassButton>
        </div>
      )}

      {/* Role Gating Card if Wallet Not Verified */}
      {mounted && connected && !isDoctor && (
        <div className="p-6 rounded-[24px] bg-[#fff8d6] border border-[#fde293] shadow-xs space-y-4">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#8a5a00]" />
            <h3 className="font-headline font-bold text-base text-[#8a5a00]">
              Wallet Verification Required
            </h3>
          </div>
          <p className="text-sm text-[#1b1f2a] leading-relaxed">
            This wallet is not verified yet. Send this address to the Publisher. Only doctors with active on-chain credentials issued by the medical authority can open patient records.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <span className="font-mono text-xs bg-white px-3 py-1.5 rounded-[14px] border border-[rgba(27,31,42,0.1)] text-[#1b1f2a] hidden sm:inline">
              {publicKey?.toBase58()}
            </span>
            <span className="font-mono text-xs bg-white px-3 py-1.5 rounded-[14px] border border-[rgba(27,31,42,0.1)] text-[#1b1f2a] sm:hidden">
              {publicKey ? formatShortAddress(publicKey.toBase58(), 8) : "----"}
            </span>
            <GlassButton variant="secondary" size="sm" onClick={copyDoctorAddress}>
              {copied ? "COPIED" : "Copy Address"}
            </GlassButton>
          </div>
        </div>
      )}

      {/* Encryption Activation Prompt */}
      {mounted && connected && isDoctor && encryptionStatus !== "ready" && (
        <div className="p-5 rounded-[22px] bg-[#fff9e6] border border-[#fde293] space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] items-start sm:items-center gap-4 sm:gap-6">
            <div>
              <div className="font-headline font-bold text-sm text-[#8a5a00]">
                Encryption Session Inactive
              </div>
              <div className="text-xs text-[#6b7280]">
                Sign a message in your wallet to activate your in-memory decryption key.
              </div>
            </div>
            <GlassButton
              variant="primary"
              size="sm"
              onClick={handleActivate}
              loading={activating}
              loadingText="Activating..."
            >
              Activate
            </GlassButton>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* CARD 01: CREDENTIAL STATUS                                */}
      {/* ======================================================== */}
      <StepCard
        id="card-credential"
        stepNumber="01"
        title="Medical Credential Status"
        description="Verify that your doctor Solana address is authorized by the medical authority."
      >
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="text-xs font-headline font-semibold text-[#6b7280]">
              Credential Status
            </div>
            <div className="flex items-center gap-2">
              {isDoctor ? (
                <span className="status-pill status-pill-ok">Active license</span>
              ) : (
                <span className="status-pill status-pill-warn">Not verified</span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <GlassButton
              variant="secondary"
              size="sm"
              onClick={loadData}
              disabled={refreshing}
            >
              {refreshing ? "Refreshing..." : "Refresh"}
            </GlassButton>
          </div>
        </div>
      </StepCard>

      {/* ======================================================== */}
      {/* CARD 02: SHARED RECORDS                                  */}
      {/* ======================================================== */}
      <StepCard
        id="card-records"
        stepNumber="02"
        title="Records Shared With You"
        description="View records you have been granted permission to access, verify access on-chain, and decrypt."
      >
        {refreshing ? (
          <div className="py-8 text-center text-xs font-mono text-[#6b7280]">
            Checking shared records...
          </div>
        ) : sharedRecords.length === 0 ? (
          <EmptyStateBox
            message="No records shared with you yet. Ask a patient to grant access to your doctor address."
          />
        ) : (
          <div className="space-y-4">
            {sharedRecords.map((item) => {
              const countdown = formatCountdown(item.expirySeconds, item.revoked);
              const isProgramMissing = programDeployed === false;
              const isBlocked =
                countdown.isExpired ||
                countdown.isRevoked ||
                !isDoctor ||
                encryptionStatus !== "ready" ||
                isProgramMissing;
              const isOpeningThis = loadingAction === `open-${item.accessPda}`;
              const thisSteps = openSteps[item.accessPda] || [];
              const thisError = openError[item.accessPda];

              let blockedReason = "";
              if (isProgramMissing) {
                blockedReason = "Program not deployed.";
              } else if (!isDoctor) {
                blockedReason = "You do not have an active medical credential.";
              } else if (encryptionStatus !== "ready") {
                blockedReason = "Activate encryption above to decrypt.";
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
                        disabled={!connected || isOpeningThis}
                        loading={isOpeningThis}
                        loadingText="Opening..."
                      >
                        Open record
                      </GlassButton>
                    )}
                  </div>

                  {/* Inline Error Block */}
                  {thisError && (
                    <div className="rounded-[16px] bg-[#fde8e6] border border-[#fbd0cb] p-4 text-xs space-y-1">
                      <div className="flex items-center gap-1.5 font-headline font-bold text-[#b42318] uppercase tracking-wider">
                        <span className="w-2 h-2 rounded-full bg-[#b42318]" />
                        Access Notice
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
                Close viewer
              </GlassButton>
            </div>
          </div>

          <div className="pt-3">
            {decryptedView.contentType === "text" && decryptedView.textContent ? (
              <pre className="p-4 rounded-[16px] bg-white border border-[rgba(27,31,42,0.08)] font-mono text-xs text-[#1b1f2a] overflow-x-auto whitespace-pre-wrap leading-relaxed">
                {decryptedView.textContent}
              </pre>
            ) : decryptedView.contentType === "image" && decryptedView.blobUrl ? (
              <div className="p-4 rounded-[16px] bg-white border border-[rgba(27,31,42,0.08)] flex justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={decryptedView.blobUrl}
                  alt={`Medical Record #${decryptedView.recordId}`}
                  className="max-h-[500px] object-contain rounded-[8px]"
                />
              </div>
            ) : (
              <div className="p-4 rounded-[16px] bg-white border border-[rgba(27,31,42,0.08)] text-xs text-[#6b7280]">
                Binary document format ({decryptedView.rawBytes.length} bytes). Use Download to save and open with external viewer.
              </div>
            )}
          </div>
        </StepCard>
      )}
    </RolePage>
  );
}
