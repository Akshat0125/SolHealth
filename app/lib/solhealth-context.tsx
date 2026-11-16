"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import {
  Connection,
  PublicKey,
  LAMPORTS_PER_SOL,
  Keypair,
  Transaction,
  VersionedTransaction,
} from "@solana/web3.js";
import { useWallet, useAnchorWallet, Wallet } from "@solana/wallet-adapter-react";
import { RPC_URL, CLUSTER, ENABLE_DEMO } from "./config";
import {
  SolhealthSigner,
  keypairToSigner,
  getConfig,
  getCredential,
  getEncryptionKey,
  registerEncryptionKey,
  mapProgramError,
} from "./solana";
import {
  ENCRYPTION_MESSAGE,
  deriveEncryptionKeypair,
  deriveKeypairFromSecret,
} from "./crypto";
import { checkProgramDeployed } from "./health";
import {
  Role,
  ROLE_LABELS,
  KeypairMap,
  loadOrCreateKeypair,
} from "./roles";

export type EncryptionStatus =
  | "unactivated"
  | "activating"
  | "ready"
  | "mismatch"
  | "error";

export interface SolhealthContextType {
  // Mount / Hydration
  mounted: boolean;

  // Wallet
  connected: boolean;
  connecting: boolean;
  publicKey: PublicKey | null;
  shortAddress: string;
  balance: number;
  lowBalance: boolean;
  wallets: Wallet[];
  selectWallet: (name: string) => void;
  disconnectWallet: () => Promise<void>;
  isWalletModalOpen: boolean;
  openWalletModal: () => void;
  closeWalletModal: () => void;

  // Signer
  signer: SolhealthSigner | null;
  unsupportedReason: string | null;

  // Encryption session (secret stored only in memory ref)
  encryptionStatus: EncryptionStatus;
  encryptionPubkey: Uint8Array | null;
  encryptionSecretRef: React.MutableRefObject<Uint8Array | null>;
  encryptionError: string | null;
  activateEncryption: () => Promise<boolean>;
  clearEncryption: () => void;

  // Roles computed from on-chain state
  isPublisher: boolean;
  isDoctor: boolean;
  isPatient: boolean;
  rolesLoading: boolean;
  configState: { exists: boolean; authority: string | null } | null;
  doctorCredential: { exists: boolean; active: boolean } | null;
  refreshRoles: () => Promise<void>;

  // Network & Health
  rpcOnline: boolean | null;
  programDeployed: boolean | null;
  refreshProgramDeployed: () => Promise<boolean>;

  // Funding / Airdrop
  requestAirdrop: () => Promise<{ success: boolean; message: string }>;
  airdropLoading: boolean;
  airdropRateLimited: boolean;

  // Demo identities (only when ENABLE_DEMO is true)
  demoEnabled: boolean;
  useDemo: boolean;
  setUseDemo: (val: boolean) => void;
  demoRole: Role;
  setDemoRole: (r: Role) => void;
  demoKeypairs: KeypairMap | null;
  activeDemoKeypair: Keypair | null;
}

const SolhealthContext = createContext<SolhealthContextType | null>(null);

export function SolhealthProvider({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);

  // Solana Wallet Adapter hooks
  const {
    connected,
    connecting,
    publicKey: adapterPubkey,
    wallets,
    select,
    disconnect,
    signMessage,
  } = useWallet();
  const anchorWallet = useAnchorWallet();

  // Demo identities state
  const [useDemo, setUseDemoState] = useState<boolean>(false);
  const [demoRole, setDemoRoleState] = useState<Role>("patient");
  const [demoKeypairs, setDemoKeypairs] = useState<KeypairMap | null>(null);

  // Network & balances
  const [balance, setBalance] = useState<number>(0);
  const [rpcOnline, setRpcOnline] = useState<boolean | null>(null);
  const [programDeployed, setProgramDeployed] = useState<boolean | null>(null);

  // Roles from on-chain state
  const [rolesLoading, setRolesLoading] = useState<boolean>(false);
  const [configState, setConfigState] = useState<{
    exists: boolean;
    authority: string | null;
  } | null>(null);
  const [doctorCredential, setDoctorCredential] = useState<{
    exists: boolean;
    active: boolean;
  } | null>(null);

  // In-memory encryption session: secret key stored ONLY in ref!
  const encryptionSecretRef = useRef<Uint8Array | null>(null);
  const [encryptionStatus, setEncryptionStatus] =
    useState<EncryptionStatus>("unactivated");
  const [encryptionPubkey, setEncryptionPubkey] = useState<Uint8Array | null>(
    null
  );
  const [encryptionError, setEncryptionError] = useState<string | null>(null);

  // Airdrop states
  const [airdropLoading, setAirdropLoading] = useState(false);
  const [airdropRateLimited, setAirdropRateLimited] = useState(false);

  // Hydration safety: set mounted only after browser render
  useEffect(() => {
    setMounted(true);
    if (ENABLE_DEMO) {
      try {
        const storedDemoPref = window.localStorage.getItem("solhealth_use_demo");
        if (storedDemoPref === "true") setUseDemoState(true);
        const storedRole = window.localStorage.getItem("solhealth_demo_role") as Role | null;
        if (storedRole && (storedRole === "issuer" || storedRole === "patient" || storedRole === "doctor")) {
          setDemoRoleState(storedRole);
        }
      } catch {
        // ignore
      }
      setDemoKeypairs({
        issuer: loadOrCreateKeypair("issuer"),
        patient: loadOrCreateKeypair("patient"),
        doctor: loadOrCreateKeypair("doctor"),
      });
    }
  }, []);

  const setUseDemo = useCallback((val: boolean) => {
    setUseDemoState(val);
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem("solhealth_use_demo", val ? "true" : "false");
      } catch {
        // ignore
      }
    }
  }, []);

  const setDemoRole = useCallback((r: Role) => {
    setDemoRoleState(r);
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem("solhealth_demo_role", r);
      } catch {
        // ignore
      }
    }
  }, []);

  // Compute active demo keypair
  const activeDemoKeypair = useMemo(() => {
    if (!ENABLE_DEMO || !useDemo || !demoKeypairs) return null;
    return demoKeypairs[demoRole] || null;
  }, [useDemo, demoRole, demoKeypairs]);

  // Effective public key and connection state
  const effectivePubkey = useMemo(() => {
    if (ENABLE_DEMO && useDemo && activeDemoKeypair) {
      return activeDemoKeypair.publicKey;
    }
    return connected && adapterPubkey ? adapterPubkey : null;
  }, [useDemo, activeDemoKeypair, connected, adapterPubkey]);

  const effectiveConnected = Boolean(effectivePubkey);

  // Build SolhealthSigner abstraction
  const { signer, unsupportedReason } = useMemo<{
    signer: SolhealthSigner | null;
    unsupportedReason: string | null;
  }>(() => {
    if (ENABLE_DEMO && useDemo && activeDemoKeypair) {
      return {
        signer: keypairToSigner(activeDemoKeypair),
        unsupportedReason: null,
      };
    }

    if (!connected || !adapterPubkey || !anchorWallet) {
      return { signer: null, unsupportedReason: null };
    }

    if (!signMessage) {
      const partialSigner: SolhealthSigner = {
        publicKey: anchorWallet.publicKey,
        signTransaction: <T extends Transaction | VersionedTransaction>(tx: T): Promise<T> =>
          anchorWallet.signTransaction(tx) as Promise<T>,
        signAllTransactions: <T extends Transaction | VersionedTransaction>(txs: T[]): Promise<T[]> =>
          anchorWallet.signAllTransactions(txs) as Promise<T[]>,
      };
      return {
        signer: partialSigner,
        unsupportedReason:
          "Connected wallet does not support message signing. Please use Phantom, Solflare, or a compatible wallet to derive your encryption key.",
      };
    }

    const solhealthSigner: SolhealthSigner = {
      publicKey: anchorWallet.publicKey,
      signTransaction: <T extends Transaction | VersionedTransaction>(tx: T): Promise<T> =>
        anchorWallet.signTransaction(tx) as Promise<T>,
      signAllTransactions: <T extends Transaction | VersionedTransaction>(txs: T[]): Promise<T[]> =>
        anchorWallet.signAllTransactions(txs) as Promise<T[]>,
      signMessage: async (msg: Uint8Array) => {
        return signMessage(msg);
      },
    };

    return { signer: solhealthSigner, unsupportedReason: null };
  }, [useDemo, activeDemoKeypair, connected, adapterPubkey, anchorWallet, signMessage]);

  // Clear memory secret on disconnect, account change, or unload
  const clearEncryption = useCallback(() => {
    encryptionSecretRef.current = null;
    setEncryptionPubkey(null);
    setEncryptionStatus("unactivated");
    setEncryptionError(null);
  }, []);

  useEffect(() => {
    clearEncryption();
  }, [effectivePubkey, clearEncryption]);

  useEffect(() => {
    const handleUnload = () => {
      encryptionSecretRef.current = null;
    };
    window.addEventListener("beforeunload", handleUnload);
    return () => {
      window.removeEventListener("beforeunload", handleUnload);
    };
  }, []);

  // Balance and RPC connection check
  const refreshBalancesAndHealth = useCallback(async () => {
    const conn = new Connection(RPC_URL, "confirmed");
    try {
      const v = await conn.getVersion();
      setRpcOnline(!!v);
    } catch {
      setRpcOnline(false);
      setProgramDeployed(false);
      return;
    }

    try {
      const isDep = await checkProgramDeployed(conn);
      setProgramDeployed(isDep);
    } catch {
      setProgramDeployed(false);
    }

    if (effectivePubkey) {
      try {
        const bal = await conn.getBalance(effectivePubkey);
        setBalance(bal / LAMPORTS_PER_SOL);
      } catch (err) {
        console.warn("Failed to query wallet balance:", err);
      }
    } else {
      setBalance(0);
    }
  }, [effectivePubkey]);

  const refreshProgramDeployed = useCallback(async () => {
    const conn = new Connection(RPC_URL, "confirmed");
    try {
      const isDep = await checkProgramDeployed(conn);
      setProgramDeployed(isDep);
      return isDep;
    } catch {
      setProgramDeployed(false);
      return false;
    }
  }, []);

  // Periodic health checks (every 12s when document visible)
  useEffect(() => {
    if (!mounted) return;
    refreshBalancesAndHealth();

    const interval = setInterval(() => {
      if (typeof document !== "undefined" && document.visibilityState === "visible") {
        refreshBalancesAndHealth();
      }
    }, 12000);

    return () => clearInterval(interval);
  }, [mounted, refreshBalancesAndHealth]);

  // Refresh Roles from on-chain state
  const refreshRoles = useCallback(async () => {
    if (!effectivePubkey) {
      setConfigState(null);
      setDoctorCredential(null);
      return;
    }

    setRolesLoading(true);
    const conn = new Connection(RPC_URL, "confirmed");
    try {
      // 1. Fetch Config PDA
      const config = await getConfig(conn);
      if (config) {
        setConfigState({
          exists: true,
          authority: config.authority.toBase58(),
        });
      } else {
        setConfigState({
          exists: false,
          authority: null,
        });
      }

      // 2. Fetch Credential PDA for this wallet
      const cred = await getCredential(effectivePubkey, conn);
      if (cred) {
        setDoctorCredential({
          exists: true,
          active: cred.active,
        });
      } else {
        setDoctorCredential({
          exists: false,
          active: false,
        });
      }

      // 3. Check if encryption key is already published on-chain
      const encKey = await getEncryptionKey(effectivePubkey, conn);
      if (encKey && encryptionSecretRef.current && encryptionPubkey) {
        const publishedHex = Buffer.from(encKey.x25519Pubkey).toString("hex");
        const currentHex = Buffer.from(encryptionPubkey).toString("hex");
        if (publishedHex !== currentHex) {
          setEncryptionStatus("mismatch");
          setEncryptionError(
            "This wallet produced a different encryption key than the one published, so older records cannot be decrypted"
          );
        }
      }
    } catch (e) {
      console.warn("Failed to refresh on-chain roles:", e);
    } finally {
      setRolesLoading(false);
    }
  }, [effectivePubkey, encryptionPubkey]);

  useEffect(() => {
    if (mounted && effectivePubkey) {
      refreshRoles();
    }
  }, [mounted, effectivePubkey, refreshRoles]);

  // Compute role booleans
  const isPublisher = Boolean(
    effectivePubkey &&
      configState?.exists &&
      configState.authority &&
      configState.authority === effectivePubkey.toBase58()
  );

  const isDoctor = Boolean(
    effectivePubkey && doctorCredential?.exists && doctorCredential.active
  );

  const isPatient = effectiveConnected;

  // Encryption Activation Flow
  const activateEncryption = useCallback(async (): Promise<boolean> => {
    if (!signer) {
      setEncryptionError("Please connect your wallet first.");
      setEncryptionStatus("error");
      return false;
    }

    setEncryptionError(null);
    setEncryptionStatus("activating");

    try {
      let derivedKeypair: { publicKey: Uint8Array; secretKey: Uint8Array };

      if (ENABLE_DEMO && useDemo && activeDemoKeypair) {
        derivedKeypair = await deriveKeypairFromSecret(activeDemoKeypair.secretKey);
      } else {
        if (!signer.signMessage) {
          throw new Error(
            "Connected wallet does not support message signing. Please use Phantom, Solflare, or a compatible wallet."
          );
        }
        const msgBytes = new TextEncoder().encode(ENCRYPTION_MESSAGE);
        const signature = await signer.signMessage(msgBytes);
        derivedKeypair = await deriveEncryptionKeypair(signature);
      }

      const conn = new Connection(RPC_URL, "confirmed");
      const onChain = await getEncryptionKey(signer.publicKey, conn);

      if (!onChain) {
        // Register newly derived public key on chain
        await registerEncryptionKey(signer, derivedKeypair.publicKey, 1, conn);
        encryptionSecretRef.current = derivedKeypair.secretKey;
        setEncryptionPubkey(derivedKeypair.publicKey);
        setEncryptionStatus("ready");
        await refreshBalancesAndHealth();
        return true;
      }

      // Verify on-chain public key matches derived public key
      const publishedHex = Buffer.from(onChain.x25519Pubkey).toString("hex");
      const derivedHex = Buffer.from(derivedKeypair.publicKey).toString("hex");

      if (publishedHex === derivedHex) {
        encryptionSecretRef.current = derivedKeypair.secretKey;
        setEncryptionPubkey(derivedKeypair.publicKey);
        setEncryptionStatus("ready");
        return true;
      }

      // Mismatch: block with exact required sentence
      encryptionSecretRef.current = null;
      setEncryptionPubkey(null);
      setEncryptionStatus("mismatch");
      setEncryptionError(
        "This wallet produced a different encryption key than the one published, so older records cannot be decrypted"
      );
      return false;
    } catch (err: any) {
      const msg = err?.message || String(err);
      if (
        msg.includes("User rejected") ||
        msg.includes("4001") ||
        msg.includes("cancelled")
      ) {
        setEncryptionError("You cancelled the request in your wallet");
      } else {
        setEncryptionError(mapProgramError(err));
      }
      setEncryptionStatus("error");
      return false;
    }
  }, [signer, useDemo, activeDemoKeypair, refreshBalancesAndHealth]);

  // Request Airdrop / Funding
  const requestAirdrop = useCallback(async (): Promise<{
    success: boolean;
    message: string;
  }> => {
    if (!effectivePubkey) {
      return { success: false, message: "No wallet connected" };
    }

    setAirdropLoading(true);
    setAirdropRateLimited(false);
    const conn = new Connection(RPC_URL, "confirmed");

    try {
      const amountLamports =
        CLUSTER === "devnet" ? 1 * LAMPORTS_PER_SOL : 2 * LAMPORTS_PER_SOL;
      const sig = await conn.requestAirdrop(effectivePubkey, amountLamports);
      const latest = await conn.getLatestBlockhash();
      await conn.confirmTransaction({
        signature: sig,
        blockhash: latest.blockhash,
        lastValidBlockHeight: latest.lastValidBlockHeight,
      });
      await refreshBalancesAndHealth();
      setAirdropLoading(false);
      return {
        success: true,
        message: `Successfully received ${CLUSTER === "devnet" ? "1 SOL" : "2 SOL"}.`,
      };
    } catch (err: any) {
      setAirdropLoading(false);
      if (CLUSTER === "devnet") {
        setAirdropRateLimited(true);
        return {
          success: false,
          message:
            "The public faucet is rate limited. Copy your address and use faucet.solana.com.",
        };
      }
      return {
        success: false,
        message: mapProgramError(err) || "Airdrop failed on local validator.",
      };
    }
  }, [effectivePubkey, refreshBalancesAndHealth]);

  const selectWallet = useCallback(
    (name: string) => {
      select(name as any);
      setIsWalletModalOpen(false);
    },
    [select]
  );

  const disconnectWallet = useCallback(async () => {
    clearEncryption();
    if (useDemo) {
      setUseDemo(false);
    }
    await disconnect();
  }, [clearEncryption, disconnect, useDemo, setUseDemo]);

  const shortAddress = useMemo(() => {
    if (!effectivePubkey) return "";
    const b58 = effectivePubkey.toBase58();
    return `${b58.slice(0, 4)}...${b58.slice(-4)}`;
  }, [effectivePubkey]);

  const lowBalance = effectiveConnected && balance < 0.05;

  const value: SolhealthContextType = {
    mounted,
    connected: effectiveConnected,
    connecting,
    publicKey: effectivePubkey,
    shortAddress,
    balance,
    lowBalance,
    wallets,
    selectWallet,
    disconnectWallet,
    isWalletModalOpen,
    openWalletModal: () => setIsWalletModalOpen(true),
    closeWalletModal: () => setIsWalletModalOpen(false),
    signer,
    unsupportedReason,
    encryptionStatus,
    encryptionPubkey,
    encryptionSecretRef,
    encryptionError,
    activateEncryption,
    clearEncryption,
    isPublisher,
    isDoctor,
    isPatient,
    rolesLoading,
    configState,
    doctorCredential,
    refreshRoles,
    rpcOnline,
    programDeployed,
    refreshProgramDeployed,
    requestAirdrop,
    airdropLoading,
    airdropRateLimited,
    demoEnabled: ENABLE_DEMO,
    useDemo,
    setUseDemo,
    demoRole,
    setDemoRole,
    demoKeypairs,
    activeDemoKeypair,
  };

  return (
    <SolhealthContext.Provider value={value}>
      {children}
    </SolhealthContext.Provider>
  );
}

export function useSolhealth(): SolhealthContextType {
  const context = useContext(SolhealthContext);
  if (!context) {
    throw new Error("useSolhealth must be used within a SolhealthProvider");
  }
  return context;
}

export function useSigner() {
  const { signer, unsupportedReason, connected, publicKey } = useSolhealth();
  return { signer, unsupportedReason, connected, publicKey };
}

export function useEncryption() {
  const {
    encryptionStatus,
    encryptionPubkey,
    encryptionSecretRef,
    encryptionError,
    activateEncryption,
    clearEncryption,
  } = useSolhealth();

  return {
    status: encryptionStatus,
    publicKey: encryptionPubkey,
    secretKeyRef: encryptionSecretRef,
    error: encryptionError,
    activate: activateEncryption,
    clear: clearEncryption,
  };
}

export function useRoleState() {
  const {
    isPublisher,
    isDoctor,
    isPatient,
    rolesLoading,
    configState,
    doctorCredential,
    refreshRoles,
    publicKey,
    connected,
  } = useSolhealth();

  return {
    isPublisher,
    isDoctor,
    isPatient,
    rolesLoading,
    configState,
    doctorCredential,
    refreshRoles,
    publicKey,
    connected,
  };
}
