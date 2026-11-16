"use client";

import React, { useMemo, useState, useEffect, useCallback } from "react";
import { ConnectionProvider, WalletProvider } from "@solana/wallet-adapter-react";
import type { WalletError } from "@solana/wallet-adapter-base";
import { RPC_URL } from "@/lib/config";
import { SolhealthProvider } from "@/lib/solhealth-context";
import { RoleProvider } from "@/lib/roles";

export function Providers({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const endpoint = useMemo(() => RPC_URL, []);
  const wallets = useMemo(() => [], []);

  const handleWalletError = useCallback((error: WalletError) => {
    const msg = error?.message || error?.name || String(error);
    if (
      msg.includes("User rejected") ||
      msg.includes("cancelled") ||
      msg.includes("WalletConnectionError") ||
      msg.includes("WalletSignMessageError") ||
      msg.includes("WalletSignTransactionError")
    ) {
      // User cancelled action in wallet, handled gracefully in UI
      return;
    }
    console.warn("Wallet adapter notice:", error.message || error.name);
  }, []);

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect onError={handleWalletError}>
        <SolhealthProvider>
          <RoleProvider>
            {children}
          </RoleProvider>
        </SolhealthProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}
