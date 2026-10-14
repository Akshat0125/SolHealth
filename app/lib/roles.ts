"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
} from "react";
import {
  Keypair,
  Connection,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";

export type Role = "issuer" | "patient" | "doctor";

export interface KeypairMap {
  issuer: Keypair;
  patient: Keypair;
  doctor: Keypair;
}

export interface RoleContextType {
  role: Role;
  setRole: (role: Role) => void;
  keypairs: KeypairMap | null;
  activeKeypair: Keypair | null;
  ready: boolean;
  airdropTo: (role: Role, amountSol?: number) => Promise<string>;
  fundAll: (amountSol?: number) => Promise<void>;
  balances: Record<Role, number>;
  refreshBalances: () => Promise<void>;
  loading: boolean;
  rpcOnline: boolean | null;
}

export const CLUSTER = process.env.NEXT_PUBLIC_CLUSTER || "local";
export const LOCALNET_RPC_URL =
  process.env.NEXT_PUBLIC_SOLANA_RPC_URL ||
  (CLUSTER === "devnet"
    ? "https://api.devnet.solana.com"
    : "http://127.0.0.1:8899");

export function getSolanaConnection(): Connection {
  return new Connection(LOCALNET_RPC_URL, "confirmed");
}

export function loadOrCreateKeypair(role: Role): Keypair {
  const storageKey = `solhealth_key_${role}`;
  if (typeof window !== "undefined") {
    try {
      const stored = window.localStorage.getItem(storageKey);
      if (stored) {
        const raw = JSON.parse(stored);
        if (Array.isArray(raw) && raw.length === 64) {
          return Keypair.fromSecretKey(new Uint8Array(raw));
        }
      }
    } catch (err) {
      console.warn(`Could not load keypair for ${role} from localStorage:`, err);
    }
  }

  const generated = Keypair.generate();
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(
        storageKey,
        JSON.stringify(Array.from(generated.secretKey))
      );
    } catch (err) {
      console.warn(`Could not save keypair for ${role} to localStorage:`, err);
    }
  }
  return generated;
}

export function initializeRoleKeypairs(): KeypairMap {
  return {
    issuer: loadOrCreateKeypair("issuer"),
    patient: loadOrCreateKeypair("patient"),
    doctor: loadOrCreateKeypair("doctor"),
  };
}

const RoleContext = createContext<RoleContextType | null>(null);

export function RoleProvider({ children }: { children: React.ReactNode }) {
  const [role, setRoleState] = useState<Role>("patient");
  const [keypairs, setKeypairs] = useState<KeypairMap | null>(null);
  const [ready, setReady] = useState<boolean>(false);
  const [balances, setBalances] = useState<Record<Role, number>>({
    issuer: 0,
    patient: 0,
    doctor: 0,
  });
  const [loading, setLoading] = useState(false);
  const [rpcOnline, setRpcOnline] = useState<boolean | null>(null);

  // Check RPC reachability
  const checkRpc = useCallback(async () => {
    try {
      const conn = getSolanaConnection();
      const version = await conn.getVersion();
      setRpcOnline(!!version);
      return true;
    } catch {
      setRpcOnline(false);
      return false;
    }
  }, []);

  // Periodic RPC health check (runs only on client)
  useEffect(() => {
    void checkRpc();
    const interval = setInterval(() => {
      void checkRpc();
    }, 10000);
    return () => clearInterval(interval);
  }, [checkRpc]);

  // Load keypairs and restore selected role ONLY inside useEffect (never in render or useState)
  useEffect(() => {
    const timer = setTimeout(() => {
      if (typeof window !== "undefined") {
        try {
          const savedRole = window.localStorage.getItem("solhealth_selected_role") as Role | null;
          if (savedRole && (savedRole === "issuer" || savedRole === "patient" || savedRole === "doctor")) {
            setRoleState(savedRole);
          }
        } catch (err) {
          console.warn("Could not restore selected role from localStorage:", err);
        }
      }

      const loadedKeypairs = initializeRoleKeypairs();
      setKeypairs(loadedKeypairs);
      setReady(true);
    }, 0);

    return () => clearTimeout(timer);
  }, []);

  const setRole = useCallback((newRole: Role) => {
    setRoleState(newRole);
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem("solhealth_selected_role", newRole);
      } catch (err) {
        console.warn("Could not persist selected role to localStorage:", err);
      }
    }
  }, []);

  const refreshBalances = useCallback(async () => {
    if (!keypairs) return;
    try {
      const conn = getSolanaConnection();
      const [issuerBal, patientBal, doctorBal] = await Promise.all([
        conn.getBalance(keypairs.issuer.publicKey).catch(() => 0),
        conn.getBalance(keypairs.patient.publicKey).catch(() => 0),
        conn.getBalance(keypairs.doctor.publicKey).catch(() => 0),
      ]);
      setBalances({
        issuer: issuerBal / LAMPORTS_PER_SOL,
        patient: patientBal / LAMPORTS_PER_SOL,
        doctor: doctorBal / LAMPORTS_PER_SOL,
      });
    } catch (e) {
      console.warn("Failed to refresh balances:", e);
    }
  }, [keypairs]);

  // Refresh balances whenever ready and keypairs are set
  useEffect(() => {
    if (ready && keypairs) {
      const balanceTimer = setTimeout(() => {
        void refreshBalances();
      }, 0);
      return () => clearTimeout(balanceTimer);
    }
  }, [ready, keypairs, refreshBalances]);

  const airdropTo = useCallback(
    async (targetRole: Role, amountSol = 5): Promise<string> => {
      if (!keypairs) {
        throw new Error("Keypairs are not initialized yet");
      }
      setLoading(true);
      try {
        const conn = getSolanaConnection();
        const targetPubkey = keypairs[targetRole].publicKey;
        const sig = await conn.requestAirdrop(
          targetPubkey,
          amountSol * LAMPORTS_PER_SOL
        );
        const latestBlockhash = await conn.getLatestBlockhash();
        await conn.confirmTransaction({
          signature: sig,
          blockhash: latestBlockhash.blockhash,
          lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
        });
        await refreshBalances();
        return sig;
      } finally {
        setLoading(false);
      }
    },
    [keypairs, refreshBalances]
  );

  const fundAll = useCallback(
    async (amountSol = 5): Promise<void> => {
      if (!keypairs) {
        throw new Error("Keypairs are not initialized yet");
      }
      setLoading(true);
      try {
        await Promise.all([
          airdropTo("issuer", amountSol),
          airdropTo("patient", amountSol),
          airdropTo("doctor", amountSol),
        ]);
      } finally {
        setLoading(false);
      }
    },
    [keypairs, airdropTo]
  );

  const activeKeypair = useMemo(() => {
    if (!keypairs) return null;
    return keypairs[role] || null;
  }, [keypairs, role]);

  const value: RoleContextType = {
    role,
    setRole,
    keypairs,
    activeKeypair,
    ready,
    airdropTo,
    fundAll,
    balances,
    refreshBalances,
    loading,
    rpcOnline,
  };

  return React.createElement(RoleContext.Provider, { value }, children);
}

export function useRole(): RoleContextType {
  const context = useContext(RoleContext);
  if (!context) {
    throw new Error("useRole must be used within a RoleProvider");
  }
  return context;
}
