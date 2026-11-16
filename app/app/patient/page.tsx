"use client";

import React, { useState, useEffect, useCallback } from "react";
import { PublicKey } from "@solana/web3.js";
import { BN } from "@coral-xyz/anchor";
import { useSolhealth } from "@/lib/solhealth-context";
import { 
  encryptFile, 
  decryptFile,
  sha256, 
  wrapKeyForX25519, 
  unwrapKeyX25519 
} from "@/lib/crypto";
import { 
  registerRecord, 
  grantAccess, 
  revokeAccess, 
  listRecordsByPatient, 
  listAllAccess, 
  getRecord,
  getEncryptionKey,
  mapProgramError,
  getSolanaConnection,
} from "@/lib/solana";
import { checkProgramDeployed, getMinRecordBalance } from "@/lib/health";
import { fetchFromIpfs } from "@/lib/ipfs";
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

const MAX_FILE_SIZE = 4 * 1024 * 1024; // 4 MB

interface RecordItem {
  pda: string;
  recordId: string;
  cid: string;
  fileHashHex: string;
  wrappedKey: Uint8Array;
  createdAt: number;
}

interface GrantItem {
  pda: string;
  recordPda: string;
  recordIdDisplay?: string;
  doctor: string;
  expiry: number;
  revoked: boolean;
  status: "active" | "expired" | "revoked";
}

interface TamperResult {
  testing: boolean;
  error?: string | null;
  originalHashHex?: string;
  alteredHashHex?: string;
  originalMatch?: boolean;
  tamperedMismatch?: boolean;
  tamperedDecryptFailed?: boolean;
  originalDecryptSuccess?: boolean;
}

interface StagedUpload {
  cipher: Uint8Array;
  rawKey: Uint8Array;
  cid: string;
  fileHash: Uint8Array;
  hashHex: string;
  wrappedKey: Uint8Array;
}

export default function PatientPage() {
  const {
    mounted,
    connected,
    publicKey,
    signer,
    openWalletModal,
    encryptionStatus,
    encryptionPubkey,
    encryptionSecretRef,
    encryptionError,
    activateEncryption,
    programDeployed,
    demoEnabled,
    demoKeypairs,
  } = useSolhealth();

  const demoDoctorKey =
    demoEnabled && demoKeypairs ? demoKeypairs.doctor.publicKey.toBase58() : "";

  // State
  const [file, setFile] = useState<File | null>(null);
  const [stagedUpload, setStagedUpload] = useState<StagedUpload | null>(null);
  const [records, setRecords] = useState<RecordItem[]>([]);
  const [grants, setGrants] = useState<GrantItem[]>([]);
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Card 01 Upload State
  const [uploadSteps, setUploadSteps] = useState<StepItem[]>([]);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadRawError, setUploadRawError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const [uploadTx, setUploadTx] = useState<string | null>(null);

  // Per-record Share form expanded state: recordPda -> boolean
  const [expandedShare, setExpandedShare] = useState<Record<string, boolean>>({});
  // Per-record Share form inputs: recordPda -> { doctor: string, durationMinutes: number }
  const [shareInputs, setShareInputs] = useState<Record<string, { doctor: string; durationMinutes: number }>>({});
  // Per-record Share status: recordPda -> { steps: StepItem[], error: string | null, success: string | null, tx: string | null }
  const [shareStatus, setShareStatus] = useState<Record<string, {
    steps: StepItem[];
    error: string | null;
    success: string | null;
    tx: string | null;
  }>>({});

  // Tamper Test state: recordPda -> TamperResult
  const [tamperResults, setTamperResults] = useState<Record<string, TamperResult>>({});

  // Confirm Stop Sharing: grantPda -> boolean
  const [confirmStopGrant, setConfirmStopGrant] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!publicKey) return;
    setRefreshing(true);
    try {
      // 1. Fetch patient's records
      const fetchedRecords = await listRecordsByPatient(publicKey);
      const parsedRecords: RecordItem[] = fetchedRecords.map((r) => {
        const hashArray = Array.from(new Uint8Array(r.account.fileHash));
        const hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
        return {
          pda: r.publicKey.toBase58(),
          recordId: r.account.recordId.toString(),
          cid: r.account.cid,
          fileHashHex: hashHex,
          wrappedKey: new Uint8Array(r.account.wrappedKey),
          createdAt: Number(r.account.createdAt) * 1000,
        };
      });
      setRecords(parsedRecords);

      // 2. Fetch all access grants relevant to this patient's records
      const recordPdaSet = new Set(parsedRecords.map((r) => r.pda));
      const recordIdMap = new Map(parsedRecords.map((r) => [r.pda, r.recordId]));

      const allAccess = await listAllAccess();
      const patientGrants: GrantItem[] = [];
      const nowSec = Math.floor(Date.now() / 1000);

      for (const a of allAccess) {
        const recPdaStr = a.account.record.toBase58();
        if (recordPdaSet.has(recPdaStr)) {
          const expSec = Number(a.account.expiry);
          const isRevoked = a.account.revoked;
          let status: "active" | "expired" | "revoked" = "active";
          if (isRevoked) {
            status = "revoked";
          } else if (nowSec >= expSec) {
            status = "expired";
          }

          patientGrants.push({
            pda: a.publicKey.toBase58(),
            recordPda: recPdaStr,
            recordIdDisplay: recordIdMap.get(recPdaStr) || recPdaStr.slice(0, 8),
            doctor: a.account.doctor.toBase58(),
            expiry: expSec * 1000,
            revoked: isRevoked,
            status,
          });
        }
      }

      setGrants(patientGrants);
    } catch (e: any) {
      console.warn("Failed to load patient data:", e);
    } finally {
      setRefreshing(false);
    }
  }, [publicKey]);

  useEffect(() => {
    if (connected && publicKey) {
      loadData();
    } else {
      setRecords([]);
      setGrants([]);
    }
  }, [connected, publicKey, loadData]);

  // Handle file selection with 4 MB cap enforcement
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0] || null;
    setUploadError(null);
    setUploadRawError(null);
    setUploadSuccess(null);
    setUploadTx(null);
    setStagedUpload(null);
    setUploadSteps([]);

    if (selected && selected.size > MAX_FILE_SIZE) {
      setUploadError("File exceeds 4 MB maximum limit.");
      setFile(null);
      return;
    }
    setFile(selected);
  };

  // Preflight check helper
  const runPreflight = async (): Promise<boolean> => {
    if (!connected || !publicKey) {
      setUploadError("Please connect your wallet first.");
      return false;
    }
    const conn = getSolanaConnection();

    // 1. Check validator reachable
    try {
      const v = await conn.getVersion();
      if (!v) throw new Error();
    } catch {
      setUploadError("Local validator not reachable. Run solana-test-validator in a terminal.");
      return false;
    }

    // 2. Check program deployed
    const isDeployed = await checkProgramDeployed(conn);
    if (!isDeployed) {
      setUploadError("SolHealth program is not deployed on this network. Run npm run demo:reset in a terminal.");
      return false;
    }

    // 3. Check encryption session
    if (encryptionStatus !== "ready" || !encryptionPubkey || !encryptionSecretRef.current) {
      setUploadError("Please activate your encryption session before adding a record.");
      return false;
    }

    // 4. Check patient wallet balance for rent + fee
    const minRequired = await getMinRecordBalance(conn);
    try {
      const bal = await conn.getBalance(publicKey);
      if (bal < minRequired) {
        setUploadError(
          `Insufficient SOL balance for record rent and transaction fee (${(bal / 1e9).toFixed(4)} SOL available, at least ${(minRequired / 1e9).toFixed(4)} SOL required).`
        );
        return false;
      }
    } catch {
      setUploadError("Failed to check wallet balance against validator RPC.");
      return false;
    }

    return true;
  };

  // Card 01: Handle Encrypt and Upload (Steps 1-6 with Preflight)
  const handleUploadAndRegister = async () => {
    if (!connected || !publicKey || !signer) return;
    setUploadError(null);
    setUploadRawError(null);
    setUploadSuccess(null);
    setUploadTx(null);

    if (!file) {
      setUploadError("Please choose a file to encrypt and upload.");
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      setUploadError("File exceeds 4 MB maximum limit.");
      return;
    }

    // Preflight check BEFORE step 1: do not encrypt or pin if checks fail
    setLoadingAction("upload");
    const preflightOk = await runPreflight();
    if (!preflightOk) {
      setLoadingAction(null);
      return;
    }

    const initialSteps: StepItem[] = [
      { name: "Encrypting in browser", status: "running", detail: "AES-256-GCM" },
      { name: "Pinning to IPFS", status: "idle", detail: "/api/pin" },
      { name: "Checking integrity", status: "idle", detail: "SHA-256 file hash" },
      { name: "Wrapping key", status: "idle", detail: "X25519 recipient key" },
      { name: "Waiting for wallet approval", status: "idle", detail: "Approve transaction" },
      { name: "Confirming on Solana", status: "idle", detail: "Anchor register_record" },
    ];
    setUploadSteps(initialSteps);

    let stage: StagedUpload | null = null;
    try {
      // Step 1: Read file and encrypt
      const fileBytes = new Uint8Array(await file.arrayBuffer());
      const { cipher, rawKey } = await encryptFile(fileBytes);
      setUploadSteps((prev) =>
        prev.map((s, idx) =>
          idx === 0
            ? { ...s, status: "done", detail: `${cipher.length} bytes encrypted` }
            : idx === 1
            ? { ...s, status: "running" }
            : s
        )
      );

      // Step 2: Pin to IPFS via API
      const formData = new FormData();
      formData.append(
        "file",
        new Blob([cipher.buffer as ArrayBuffer], { type: "application/octet-stream" }),
        `${file.name}.enc`
      );

      const pinRes = await fetch("/api/pin", {
        method: "POST",
        body: formData,
      });

      if (!pinRes.ok) {
        if (pinRes.status === 503) {
          throw new Error("File uploads are currently disabled by the administrator.");
        }
        if (pinRes.status === 429) {
          throw new Error("Upload rate limit exceeded. Please wait a few minutes before trying again.");
        }
        if (pinRes.status === 413) {
          throw new Error("File exceeds 4 MB maximum limit.");
        }
        let errJson: any = null;
        try {
          errJson = await pinRes.json();
        } catch {}
        throw new Error(errJson?.error || `IPFS upload failed with status ${pinRes.status}`);
      }
      const { cid } = await pinRes.json();
      setUploadSteps((prev) =>
        prev.map((s, idx) =>
          idx === 1
            ? { ...s, status: "done", detail: `CID: ${formatShortAddress(cid, 6)}` }
            : idx === 2
            ? { ...s, status: "running" }
            : s
        )
      );

      // Step 3: Compute SHA-256 of the ciphertext
      const fileHash = await sha256(cipher);
      const hashHex = Array.from(fileHash)
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
      setUploadSteps((prev) =>
        prev.map((s, idx) =>
          idx === 2
            ? { ...s, status: "done", detail: `Hash: ${formatShortAddress(hashHex, 8)}` }
            : idx === 3
            ? { ...s, status: "running" }
            : s
        )
      );

      // Step 4: Wrap the symmetric key for Patient's own X25519 pubkey
      const wrappedKey = wrapKeyForX25519(encryptionPubkey!, rawKey);
      setUploadSteps((prev) =>
        prev.map((s, idx) =>
          idx === 3
            ? { ...s, status: "done", detail: `${wrappedKey.length} bytes wrapped` }
            : idx === 4
            ? { ...s, status: "running" }
            : s
        )
      );

      // Save staged data in memory so failure at step 5 or 6 can be retried without re-pinning
      stage = {
        cipher,
        rawKey,
        cid,
        fileHash,
        hashHex,
        wrappedKey,
      };
      setStagedUpload(stage);

      // Step 5: Waiting for wallet approval
      setUploadSteps((prev) =>
        prev.map((s, idx) =>
          idx === 4
            ? { ...s, status: "running", detail: "Waiting for approval" }
            : s
        )
      );

      const recordId = new BN(Date.now());
      const sigPromise = registerRecord(
        signer,
        recordId,
        cid,
        fileHash,
        wrappedKey
      );

      // Mark step 5 done and step 6 running once signed
      setUploadSteps((prev) =>
        prev.map((s, idx) =>
          idx === 4
            ? { ...s, status: "done", detail: "Approved" }
            : idx === 5
            ? { ...s, status: "running" }
            : s
        )
      );

      const sig = await sigPromise;

      setUploadTx(sig);
      setUploadSteps((prev) =>
        prev.map((s, idx) =>
          idx === 5
            ? { ...s, status: "done", detail: `Tx: ${formatShortAddress(sig, 8)}` }
            : s
        )
      );
      setUploadSuccess(`Record #${recordId.toString()} encrypted and registered on Solana.`);
      setFile(null);
      setStagedUpload(null);
      await loadData();
    } catch (err: any) {
      const rawMsg = err?.message || String(err);
      const plainMsg = mapProgramError(err);
      setUploadError(plainMsg);
      setUploadRawError(rawMsg);
      setUploadSteps((prev) =>
        prev.map((s) => (s.status === "running" ? { ...s, status: "error", detail: "Failed" } : s))
      );
    } finally {
      setLoadingAction(null);
    }
  };

  // Card 01: Retry Step 5/6 only without re-encrypting or re-pinning
  const handleRetryRegistration = async () => {
    if (!connected || !publicKey || !signer || !stagedUpload) return;
    setUploadError(null);
    setUploadRawError(null);
    setUploadSuccess(null);
    setUploadTx(null);

    setLoadingAction("retry");
    const preflightOk = await runPreflight();
    if (!preflightOk) {
      setLoadingAction(null);
      return;
    }

    setUploadSteps((prev) =>
      prev.map((s, idx) =>
        idx === 4
          ? { ...s, status: "running", detail: "Waiting for approval" }
          : idx === 5
          ? { ...s, status: "idle", detail: "Anchor register_record" }
          : s
      )
    );

    try {
      const recordId = new BN(Date.now());
      const sigPromise = registerRecord(
        signer,
        recordId,
        stagedUpload.cid,
        stagedUpload.fileHash,
        stagedUpload.wrappedKey
      );

      setUploadSteps((prev) =>
        prev.map((s, idx) =>
          idx === 4
            ? { ...s, status: "done", detail: "Approved" }
            : idx === 5
            ? { ...s, status: "running" }
            : s
        )
      );

      const sig = await sigPromise;

      setUploadTx(sig);
      setUploadSteps((prev) =>
        prev.map((s, idx) =>
          idx === 5
            ? { ...s, status: "done", detail: `Tx: ${formatShortAddress(sig, 8)}` }
            : s
        )
      );
      setUploadSuccess(`Record #${recordId.toString()} encrypted and registered on Solana.`);
      setFile(null);
      setStagedUpload(null);
      await loadData();
    } catch (err: any) {
      const rawMsg = err?.message || String(err);
      const plainMsg = mapProgramError(err);
      setUploadError(plainMsg);
      setUploadRawError(rawMsg);
      setUploadSteps((prev) =>
        prev.map((s, idx) =>
          idx >= 4 && s.status === "running" ? { ...s, status: "error", detail: "Failed" } : s
        )
      );
    } finally {
      setLoadingAction(null);
    }
  };

  // Tamper Check: Real integrity check, simulated bit flip, and authentication tag decryption check
  const handleTamperCheck = async (record: RecordItem) => {
    if (!connected || !publicKey) return;
    if (encryptionStatus !== "ready" || !encryptionSecretRef.current) {
      setTamperResults((prev) => ({
        ...prev,
        [record.pda]: {
          testing: false,
          error: "Please activate your encryption session before checking integrity.",
        },
      }));
      return;
    }

    setTamperResults((prev) => ({
      ...prev,
      [record.pda]: { testing: true, error: null },
    }));

    try {
      // 1. Fetch the stored ciphertext for the record's CID
      const ciphertext = await fetchFromIpfs(record.cid);
      if (!ciphertext || ciphertext.length === 0) {
        throw new Error("Could not retrieve ciphertext from IPFS gateway.");
      }

      // 2. Compute sha256 of ciphertext and compare to on-chain file_hash
      const origHash = await sha256(ciphertext);
      const origHashHex = Array.from(origHash)
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
      const originalMatch = origHashHex.toLowerCase() === record.fileHashHex.toLowerCase();

      // 3. Simulate tampering in memory only (flip one bit after the 12-byte IV)
      const tampered = new Uint8Array(ciphertext);
      const flipIndex = tampered.length > 12 ? 12 : 0;
      tampered[flipIndex] ^= 0x01; // flip 1 bit in ciphertext payload

      const tamperedHash = await sha256(tampered);
      const tamperedHashHex = Array.from(tamperedHash)
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
      const tamperedMismatch = tamperedHashHex.toLowerCase() !== record.fileHashHex.toLowerCase();

      // 4. Decryption checks
      let tamperedDecryptFailed = false;
      let originalDecryptSuccess = false;

      // Unwrap the symmetric key using the patient's in-memory X25519 secret
      const rawKey = unwrapKeyX25519(record.wrappedKey, encryptionSecretRef.current);

      // Attempt to decrypt tampered copy (AES-GCM MAC check is expected to fail)
      try {
        await decryptFile(tampered, rawKey);
        tamperedDecryptFailed = false;
      } catch {
        tamperedDecryptFailed = true;
      }

      // Decrypt original copy (expected to succeed)
      try {
        const decryptedOrig = await decryptFile(ciphertext, rawKey);
        originalDecryptSuccess = Boolean(decryptedOrig && decryptedOrig.length > 0);
      } catch (e) {
        console.warn("Original decrypt check error:", e);
        originalDecryptSuccess = false;
      }

      setTamperResults((prev) => ({
        ...prev,
        [record.pda]: {
          testing: false,
          originalHashHex: origHashHex,
          alteredHashHex: tamperedHashHex,
          originalMatch,
          tamperedMismatch,
          tamperedDecryptFailed,
          originalDecryptSuccess,
        },
      }));
    } catch (err: any) {
      console.error("Tamper check error:", err);
      setTamperResults((prev) => ({
        ...prev,
        [record.pda]: {
          testing: false,
          error: err?.message || "Failed to fetch ciphertext or verify integrity",
        },
      }));
    }
  };

  // Per-Record Share Action
  const handleShareRecord = async (record: RecordItem) => {
    if (!connected || !publicKey || !signer) return;

    if (encryptionStatus !== "ready" || !encryptionSecretRef.current) {
      setShareStatus((prev) => ({
        ...prev,
        [record.pda]: {
          steps: [],
          error: "Please activate your encryption session before sharing records.",
          success: null,
          tx: null,
        },
      }));
      return;
    }

    const currentInput = shareInputs[record.pda] || { doctor: "", durationMinutes: 60 };
    const doctorAddr = currentInput.doctor.trim();

    if (!doctorAddr) {
      setShareStatus((prev) => ({
        ...prev,
        [record.pda]: { steps: [], error: "Please enter the doctor's wallet address.", success: null, tx: null },
      }));
      return;
    }

    let doctorPubkey: PublicKey;
    try {
      doctorPubkey = new PublicKey(doctorAddr);
    } catch {
      setShareStatus((prev) => ({
        ...prev,
        [record.pda]: { steps: [], error: "Invalid Doctor Public Key format.", success: null, tx: null },
      }));
      return;
    }

    const durationSecs = (currentInput.durationMinutes || 60) * 60;
    setLoadingAction(`share-${record.pda}`);
    setShareStatus((prev) => ({
      ...prev,
      [record.pda]: {
        steps: [
          { name: "Checking doctor encryption key", status: "running", detail: "On-chain lookup" },
          { name: "Unwrapping key", status: "idle", detail: "Patient secret key" },
          { name: "Encapsulating for doctor", status: "idle", detail: "Doctor X25519 key" },
          { name: "Waiting for wallet approval", status: "idle", detail: "Approve transaction" },
          { name: "Confirming on Solana", status: "idle", detail: "Anchor grant_access" },
        ],
        error: null,
        success: null,
        tx: null,
      },
    }));

    try {
      // 1. Verify doctor has an active EncryptionKey published on-chain
      const doctorEnc = await getEncryptionKey(doctorPubkey);
      if (!doctorEnc) {
        throw new Error(
          "This doctor has not activated encryption yet. They must connect and sign their encryption message first."
        );
      }

      setShareStatus((prev) => ({
        ...prev,
        [record.pda]: {
          ...prev[record.pda],
          steps: [
            { name: "Checking doctor encryption key", status: "done", detail: "Key found" },
            { name: "Unwrapping key", status: "running", detail: "In-memory secret" },
            { name: "Encapsulating for doctor", status: "idle", detail: "Doctor X25519 key" },
            { name: "Waiting for wallet approval", status: "idle", detail: "Approve transaction" },
            { name: "Confirming on Solana", status: "idle", detail: "Anchor grant_access" },
          ],
        },
      }));

      const recordPubkey = new PublicKey(record.pda);
      const recordAcc = await getRecord(recordPubkey);
      if (!recordAcc) {
        throw new Error("Selected record account not found on Solana.");
      }

      // 2. Unwrap symmetric AES key using Patient's in-memory secret
      const storedWrappedKey = new Uint8Array(recordAcc.wrappedKey);
      const rawKey = unwrapKeyX25519(storedWrappedKey, encryptionSecretRef.current);

      setShareStatus((prev) => ({
        ...prev,
        [record.pda]: {
          ...prev[record.pda],
          steps: [
            { name: "Checking doctor encryption key", status: "done", detail: "Key found" },
            { name: "Unwrapping key", status: "done", detail: "Key unwrapped" },
            { name: "Encapsulating for doctor", status: "running", detail: "Doctor X25519 key" },
            { name: "Waiting for wallet approval", status: "idle", detail: "Approve transaction" },
            { name: "Confirming on Solana", status: "idle", detail: "Anchor grant_access" },
          ],
        },
      }));

      // 3. Re-wrap symmetric key for Doctor's published X25519 public key
      const doctorWrappedKey = wrapKeyForX25519(
        new Uint8Array(doctorEnc.x25519Pubkey),
        rawKey
      );

      setShareStatus((prev) => ({
        ...prev,
        [record.pda]: {
          ...prev[record.pda],
          steps: [
            { name: "Checking doctor encryption key", status: "done", detail: "Key found" },
            { name: "Unwrapping key", status: "done", detail: "Key unwrapped" },
            { name: "Encapsulating for doctor", status: "done", detail: `${doctorWrappedKey.length} bytes wrapped` },
            { name: "Waiting for wallet approval", status: "running", detail: "Waiting for approval" },
            { name: "Confirming on Solana", status: "idle", detail: "Anchor grant_access" },
          ],
        },
      }));

      // 4. Submit transaction with wallet approval
      const sigPromise = grantAccess(
        signer,
        recordPubkey,
        doctorPubkey,
        durationSecs,
        doctorWrappedKey
      );

      setShareStatus((prev) => ({
        ...prev,
        [record.pda]: {
          ...prev[record.pda],
          steps: [
            { name: "Checking doctor encryption key", status: "done", detail: "Key found" },
            { name: "Unwrapping key", status: "done", detail: "Key unwrapped" },
            { name: "Encapsulating for doctor", status: "done", detail: `${doctorWrappedKey.length} bytes wrapped` },
            { name: "Waiting for wallet approval", status: "done", detail: "Approved" },
            { name: "Confirming on Solana", status: "running", detail: "Anchor grant_access" },
          ],
        },
      }));

      const sig = await sigPromise;

      setShareStatus((prev) => ({
        ...prev,
        [record.pda]: {
          steps: [
            { name: "Checking doctor encryption key", status: "done", detail: "Key found" },
            { name: "Unwrapping key", status: "done", detail: "Key unwrapped" },
            { name: "Encapsulating for doctor", status: "done", detail: `${doctorWrappedKey.length} bytes wrapped` },
            { name: "Waiting for wallet approval", status: "done", detail: "Approved" },
            { name: "Confirming on Solana", status: "done", detail: `Tx: ${formatShortAddress(sig, 8)}` },
          ],
          error: null,
          success: `Shared access granted to doctor ${formatShortAddress(doctorAddr, 6)} for ${currentInput.durationMinutes} minutes.`,
          tx: sig,
        },
      }));

      await loadData();
    } catch (err: any) {
      const msg = mapProgramError(err);
      setShareStatus((prev) => ({
        ...prev,
        [record.pda]: {
          steps: prev[record.pda]?.steps.map((s) => (s.status === "running" ? { ...s, status: "error", detail: msg } : s)) || [],
          error: msg,
          success: null,
          tx: null,
        },
      }));
    } finally {
      setLoadingAction(null);
    }
  };

  // Stop Sharing Action (with inline confirmation)
  const handleExecuteRevoke = async (grant: GrantItem) => {
    if (!connected || !publicKey || !signer) return;
    setLoadingAction(`revoke-${grant.pda}`);

    try {
      await revokeAccess(
        signer,
        new PublicKey(grant.recordPda),
        new PublicKey(grant.doctor)
      );

      setConfirmStopGrant(null);
      await loadData();
    } catch (err: any) {
      console.error("Failed to revoke access:", err);
    } finally {
      setLoadingAction(null);
    }
  };

  // Compute checklist states
  const isAddDone = records.length > 0;
  const isShareDone = grants.length > 0;
  const isRetryPending = Boolean(stagedUpload && uploadError);

  const checklist: ChecklistStep[] = [
    {
      number: "1",
      label: "Add a record",
      status: isAddDone ? "done" : "next",
      targetCardId: "card-add",
    },
    {
      number: "2",
      label: "Share it",
      status: isShareDone ? "done" : isAddDone ? "next" : "waiting",
      targetCardId: "card-records",
    },
    {
      number: "3",
      label: "Review access",
      status: isShareDone ? "done" : "waiting",
      targetCardId: "card-records",
    },
  ];

  const nextStepText = isRetryPending
    ? "Upload failed at the registration step: retry registration without re-uploading"
    : !isAddDone
    ? "Upload and encrypt your first medical record in step 1."
    : !isShareDone
    ? "Share your medical record with a verified doctor in step 2."
    : "Review who has access to your records below.";

  // Safe SSR/Hydration render
  if (!mounted) {
    return (
      <RolePage
        role="patient"
        roleTitle="Patient"
        breadcrumbLabel="Patient"
        titleQuestion="Who can see your records?"
        whatYouCanDo="Encrypt medical records client-side, grant time-bound access to doctors, and revoke permissions at any time."
        checklist={checklist}
        nextStepText={nextStepText}
        roleDescription="Owner of medical records. Encrypts files in the browser and grants time-bound access."
      >
        <div className="text-center py-12 text-[#6b7280]">Loading...</div>
      </RolePage>
    );
  }

  // Not connected gating card
  if (!connected) {
    return (
      <RolePage
        role="patient"
        roleTitle="Patient"
        breadcrumbLabel="Patient"
        titleQuestion="Who can see your records?"
        whatYouCanDo="Encrypt medical records client-side, grant time-bound access to doctors, and revoke permissions at any time."
        checklist={checklist}
        nextStepText={nextStepText}
        roleDescription="Owner of medical records. Encrypts files in the browser and grants time-bound access."
      >
        <div className="glass-card p-8 rounded-[28px] text-center space-y-4 max-w-lg mx-auto">
          <div className="w-12 h-12 rounded-full bg-[#fcedbb] text-[#1b1f2a] flex items-center justify-center mx-auto text-xl font-bold">
            🔒
          </div>
          <h2 className="text-xl font-headline font-bold text-[#1b1f2a]">
            Connect your wallet to manage records
          </h2>
          <p className="text-sm text-[#4b5563] leading-relaxed">
            Patients encrypt their medical records directly in their browser using an encryption key derived from their wallet signature, upload them to decentralized storage, and grant time-bound access to verified doctors without revealing their private keys.
          </p>
          <div className="pt-2">
            <GlassButton variant="primary" onClick={openWalletModal}>
              Connect wallet
            </GlassButton>
          </div>
        </div>
      </RolePage>
    );
  }

  return (
    <RolePage
      role="patient"
      roleTitle="Patient"
      breadcrumbLabel="Patient"
      titleQuestion="Who can see your records?"
      whatYouCanDo="Encrypt medical records client-side, grant time-bound access to doctors, and revoke permissions at any time."
      checklist={checklist}
      nextStepText={nextStepText}
      roleDescription="Owner of medical records. Encrypts files in the browser and grants time-bound access."
    >
      {/* ======================================================== */}
      {/* ENCRYPTION SESSION BANNER IF NOT READY                   */}
      {/* ======================================================== */}
      {encryptionStatus === "mismatch" && (
        <div className="p-4 rounded-[20px] bg-[#fde8e6] border border-[#fbd0cb] text-xs text-[#b42318] space-y-1">
          <div className="font-headline font-bold text-sm">Encryption Key Mismatch</div>
          <p>This wallet produced a different encryption key than the one published, so older records cannot be decrypted.</p>
        </div>
      )}

      {encryptionStatus !== "ready" && encryptionStatus !== "mismatch" && (
        <div className="p-5 rounded-[22px] bg-[#fffdf6] border border-[rgba(27,31,42,0.12)] space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="font-headline font-bold text-sm text-[#1b1f2a]">
                Activate encryption session
              </div>
              <p className="text-xs text-[#6b7280]">
                SolHealth derives your private encryption key client-side from a one-time wallet signature, so files remain private without ever revealing your wallet secret key.
              </p>
            </div>
            <GlassButton
              variant="primary"
              size="sm"
              onClick={activateEncryption}
              loading={encryptionStatus === "activating"}
              loadingText="Activating..."
            >
              Activate encryption session
            </GlassButton>
          </div>
          {encryptionError && (
            <p className="text-xs text-[#b42318]">{encryptionError}</p>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* CARD 01: ADD A RECORD                                    */}
      {/* ======================================================== */}
      <StepCard
        id="card-add"
        stepNumber="01"
        title="Add a record"
        description="Choose a medical file (up to 4 MB) to encrypt with AES-256-GCM in your browser and register on Solana."
        result={
          <InlineResultArea
            errorMessage={uploadError}
            rawError={uploadRawError}
            successMessage={uploadSuccess}
            txSignature={uploadTx}
            steps={uploadSteps}
          />
        }
      >
        <div className="space-y-4 max-w-xl">
          {/* Styled Drop Zone */}
          <label
            htmlFor="patient-file-input"
            className="block p-6 rounded-[20px] border-2 border-dashed border-[rgba(27,31,42,0.18)] hover:border-[#f9c933] bg-[#fffdf6] cursor-pointer text-center space-y-2 transition-all"
          >
            <input
              id="patient-file-input"
              type="file"
              onChange={handleFileChange}
              className="hidden"
            />
            <div className="text-sm font-headline font-bold text-[#1b1f2a]">
              {file ? file.name : "Choose a file to encrypt"}
            </div>
            <p className="text-xs text-[#6b7280]">
              {file
                ? `${(file.size / 1024).toFixed(1)} KB — ready to encrypt`
                : "Click or drag medical reports, images, or test results here (max 4 MB)"}
            </p>
          </label>

          <div className="flex flex-wrap items-center gap-3">
            <GlassButton
              variant="primary"
              onClick={handleUploadAndRegister}
              disabled={loadingAction !== null || !file || programDeployed === false}
              loading={loadingAction === "upload"}
              loadingText="Encrypting & uploading..."
              title={
                programDeployed === false
                  ? "SolHealth program is not deployed on this network. Run npm run demo:reset in a terminal."
                  : "Encrypt and upload"
              }
            >
              Encrypt and upload
            </GlassButton>

            {isRetryPending && (
              <GlassButton
                variant="primary"
                onClick={handleRetryRegistration}
                disabled={loadingAction !== null || programDeployed === false}
                loading={loadingAction === "retry"}
                loadingText="Retrying registration..."
                title={
                  programDeployed === false
                    ? "SolHealth program is not deployed on this network. Run npm run demo:reset in a terminal."
                    : "Retry registration on Solana without re-encrypting or re-pinning"
                }
              >
                Retry registration
              </GlassButton>
            )}
          </div>
        </div>
      </StepCard>

      {/* ======================================================== */}
      {/* CARD 02: YOUR RECORDS                                    */}
      {/* ======================================================== */}
      <StepCard
        id="card-records"
        stepNumber="02"
        title="Your records"
        description="Manage your encrypted records, grant access to doctors, verify file integrity, and revoke permissions."
      >
        <div className="flex items-center justify-between pb-2">
          <span className="text-xs font-headline font-semibold text-[#6b7280]">
            {records.length} registered records
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

        {records.length === 0 ? (
          <EmptyStateBox
            message="No records yet. Upload your first one in step 1."
            actionLabel="Go to step 1"
            onAction={() => {
              const el = document.getElementById("card-add");
              if (el) el.scrollIntoView({ behavior: "smooth" });
            }}
          />
        ) : (
          <div className="space-y-5">
            {records.map((rec) => {
              const isShareOpen = expandedShare[rec.pda] ?? false;
              const inputState = shareInputs[rec.pda] || { doctor: "", durationMinutes: 60 };
              const currentShareStatus = shareStatus[rec.pda];
              const tamperRes = tamperResults[rec.pda];
              const isSharingThis = loadingAction === `share-${rec.pda}`;

              // Grants specific to this record
              const matchingGrants = grants.filter((g) => g.recordPda === rec.pda);

              return (
                <div
                  key={rec.pda}
                  className="p-5 sm:p-6 rounded-[22px] bg-[#fffdf6] border border-[rgba(27,31,42,0.08)] space-y-4"
                >
                  {/* Record Header */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[rgba(27,31,42,0.06)]">
                    <div className="flex items-center gap-2.5">
                      <h3 className="font-headline font-bold text-base text-[#1b1f2a]">
                        Record #{rec.recordId.slice(-6)}
                      </h3>
                      <span className="status-pill status-pill-ok">
                        Protected
                      </span>
                    </div>

                    <div className="text-xs font-mono text-[#6b7280]">
                      {formatUtcDateTime(rec.createdAt)}
                    </div>
                  </div>

                  {/* Actions as Glass Buttons */}
                  <div className="flex flex-wrap items-center gap-2.5">
                    <GlassButton
                      variant={isShareOpen ? "primary" : "secondary"}
                      size="sm"
                      onClick={() =>
                        setExpandedShare((prev) => ({
                          ...prev,
                          [rec.pda]: !prev[rec.pda],
                        }))
                      }
                    >
                      {isShareOpen ? "Close share" : "Share"}
                    </GlassButton>

                    <GlassButton
                      variant="secondary"
                      size="sm"
                      onClick={() => handleTamperCheck(rec)}
                      disabled={tamperRes?.testing}
                      loading={tamperRes?.testing}
                      loadingText="Checking..."
                    >
                      Check integrity
                    </GlassButton>
                  </div>

                  {/* 3-Row Result Panel (Original / Altered / Decryption) */}
                  {tamperRes && !tamperRes.testing && (
                    tamperRes.error ? (
                      <div className="rounded-[16px] bg-[#fde8e6] border border-[#fbd0cb] p-3.5 text-xs text-[#b42318] space-y-1">
                        <div className="font-headline font-bold uppercase tracking-wider text-[11px]">
                          Integrity Check Failed
                        </div>
                        <p>{tamperRes.error}</p>
                      </div>
                    ) : (
                      <div className="p-3.5 rounded-[18px] bg-white border border-[rgba(27,31,42,0.08)] space-y-2.5 text-xs transition-opacity duration-300">
                        {/* Row 1: Original */}
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="font-headline font-bold text-[#1b1f2a]">Original:</span>
                            <span className="text-[#6b7280]">This file is exactly what was registered.</span>
                          </div>
                          <span className={`status-pill ${tamperRes.originalMatch ? "status-pill-ok" : "status-pill-danger"}`}>
                            {tamperRes.originalMatch ? "Match" : "Mismatch"}
                          </span>
                        </div>

                        {/* Row 2: Altered */}
                        <div className="flex items-center justify-between gap-2 border-t border-[rgba(27,31,42,0.06)] pt-2">
                          <div className="flex items-center gap-2">
                            <span className="font-headline font-bold text-[#1b1f2a]">Altered:</span>
                            <span className="text-[#6b7280]">Changing a single byte is detected.</span>
                          </div>
                          <span className="status-pill status-pill-danger">
                            Mismatch
                          </span>
                        </div>

                        {/* Row 3: Decryption */}
                        <div className="flex items-center justify-between gap-2 border-t border-[rgba(27,31,42,0.06)] pt-2">
                          <div className="flex items-center gap-2">
                            <span className="font-headline font-bold text-[#1b1f2a]">Decryption:</span>
                            <span className="text-[#6b7280]">
                              {tamperRes.tamperedDecryptFailed
                                ? "Decryption of the altered file failed: authentication check rejected it."
                                : "Altered file decrypted."}{" "}
                              {tamperRes.originalDecryptSuccess
                                ? "Original file decrypts correctly."
                                : ""}
                            </span>
                          </div>
                          <span className="status-pill status-pill-ok">Verified</span>
                        </div>
                      </div>
                    )
                  )}

                  {/* Technical Details Toggle */}
                  <TechnicalDetails
                    title="Record technical details"
                    items={[
                      { label: "IPFS CID", value: rec.cid },
                      { label: "On-Chain SHA-256 Hash", value: rec.fileHashHex },
                      ...(tamperRes?.originalHashHex
                        ? [{ label: "Original Download Hash", value: tamperRes.originalHashHex }]
                        : []),
                      ...(tamperRes?.alteredHashHex
                        ? [{ label: "Simulated Altered Hash", value: tamperRes.alteredHashHex }]
                        : []),
                      { label: "Record PDA", value: rec.pda, isAddress: true },
                    ]}
                  />

                  {/* EXPANDABLE INLINE SHARE FORM */}
                  {isShareOpen && (
                    <div className="p-4 sm:p-5 rounded-[18px] bg-white border border-[rgba(27,31,42,0.08)] space-y-4 shadow-xs">
                      <div className="font-headline font-bold text-sm text-[#1b1f2a]">
                        Share this record with a doctor
                      </div>

                      <div className="space-y-3">
                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            <label className="text-xs font-headline font-semibold text-[#1b1f2a]">
                              Doctor&apos;s wallet address
                            </label>
                            {demoDoctorKey && (
                              <GlassButton
                                variant="chip"
                                type="button"
                                onClick={() =>
                                  setShareInputs((prev) => ({
                                    ...prev,
                                    [rec.pda]: {
                                      ...prev[rec.pda],
                                      doctor: demoDoctorKey,
                                      durationMinutes: prev[rec.pda]?.durationMinutes || 60,
                                    },
                                  }))
                                }
                              >
                                Use demo doctor
                              </GlassButton>
                            )}
                          </div>

                          <input
                            type="text"
                            value={inputState.doctor}
                            onChange={(e) =>
                              setShareInputs((prev) => ({
                                ...prev,
                                [rec.pda]: {
                                  ...prev[rec.pda],
                                  doctor: e.target.value,
                                  durationMinutes: prev[rec.pda]?.durationMinutes || 60,
                                },
                              }))
                            }
                            placeholder="Base58 Doctor Public Key"
                            className="pill-input font-mono text-xs"
                          />
                        </div>

                        {/* Duration Options */}
                        <div className="space-y-1.5">
                          <label className="text-xs font-headline font-semibold text-[#1b1f2a]">
                            How long should they have access?
                          </label>

                          <div className="flex flex-wrap items-center gap-2">
                            {[
                              { label: "15 min", val: 15 },
                              { label: "1 hour", val: 60 },
                              { label: "24 hours", val: 1440 },
                              { label: "7 days", val: 10080 },
                            ].map((dur) => (
                              <GlassButton
                                key={dur.val}
                                variant="chip"
                                selected={inputState.durationMinutes === dur.val}
                                onClick={() =>
                                  setShareInputs((prev) => ({
                                    ...prev,
                                    [rec.pda]: {
                                      ...prev[rec.pda],
                                      doctor: prev[rec.pda]?.doctor || "",
                                      durationMinutes: dur.val,
                                    },
                                  }))
                                }
                              >
                                {dur.label}
                              </GlassButton>
                            ))}
                          </div>
                        </div>

                        <GlassButton
                          variant="primary"
                          onClick={() => handleShareRecord(rec)}
                          disabled={isSharingThis || !inputState.doctor.trim() || programDeployed === false}
                          loading={isSharingThis}
                          loadingText="Sharing..."
                          title={
                            programDeployed === false
                              ? "SolHealth program is not deployed on this network. Run npm run demo:reset in a terminal."
                              : "Share this record"
                          }
                        >
                          Share this record
                        </GlassButton>
                      </div>

                      {/* Inline Result for Share */}
                      {currentShareStatus && (
                        <InlineResultArea
                          errorMessage={currentShareStatus.error}
                          successMessage={currentShareStatus.success}
                          txSignature={currentShareStatus.tx}
                          steps={currentShareStatus.steps}
                        />
                      )}
                    </div>
                  )}

                  {/* WHO HAS ACCESS MINI-LIST */}
                  {matchingGrants.length > 0 && (
                    <div className="pt-2 border-t border-[rgba(27,31,42,0.06)] space-y-2">
                      <div className="text-xs font-headline font-bold text-[#6b7280] uppercase tracking-wider">
                        Who has access
                      </div>

                      <div className="space-y-2">
                        {matchingGrants.map((grant) => {
                          const isConfirming = confirmStopGrant === grant.pda;
                          const isStopping = loadingAction === `revoke-${grant.pda}`;

                          return (
                            <div
                              key={grant.pda}
                              className="p-3 rounded-[16px] bg-white border border-[rgba(27,31,42,0.06)] flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                            >
                              <div className="flex items-center gap-2.5">
                                <span className="font-mono text-xs font-bold text-[#1b1f2a]">
                                  {formatShortAddress(grant.doctor, 6)}
                                </span>
                                {grant.status === "active" && (
                                  <span className="status-pill status-pill-ok">
                                    Active
                                  </span>
                                )}
                                {grant.status === "expired" && (
                                  <span className="status-pill status-pill-warn">
                                    Expired
                                  </span>
                                )}
                                {grant.status === "revoked" && (
                                  <span className="status-pill status-pill-danger">
                                    Revoked
                                  </span>
                                )}
                              </div>

                              <div className="flex items-center gap-3">
                                <span className="font-mono text-xs text-[#6b7280]">
                                  Expires {formatUtcDateTime(grant.expiry)}
                                </span>

                                {grant.status === "active" && (
                                  <>
                                    {isConfirming ? (
                                      <DestructiveConfirm
                                        promptText="Stop sharing with this doctor?"
                                        confirmLabel="Yes, stop sharing"
                                        cancelLabel="Cancel"
                                        loading={isStopping}
                                        onConfirm={() => handleExecuteRevoke(grant)}
                                        onCancel={() => setConfirmStopGrant(null)}
                                      />
                                    ) : (
                                      <GlassButton
                                        variant="danger"
                                        size="sm"
                                        onClick={() => setConfirmStopGrant(grant.pda)}
                                        disabled={loadingAction !== null || programDeployed === false}
                                        title={
                                           programDeployed === false
                                            ? "SolHealth program is not deployed on this network. Run npm run demo:reset in a terminal."
                                            : "Stop sharing"
                                        }
                                      >
                                        Stop sharing
                                      </GlassButton>
                                    )}
                                  </>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </StepCard>
    </RolePage>
  );
}
