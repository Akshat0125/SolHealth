// Prevent Node 22+ experimental global localStorage getter from printing ExperimentalWarning during SSR
if (typeof window === "undefined" && typeof globalThis !== "undefined") {
  try {
    delete (globalThis as any).localStorage;
  } catch {}
}

import { Connection, PublicKey } from "@solana/web3.js";
import solhealthIdl from "./idl/solhealth.json" with { type: "json" };

export type ClusterType = "local" | "devnet";

const rawCluster = process.env.NEXT_PUBLIC_CLUSTER || "local";
if (rawCluster !== "local" && rawCluster !== "devnet") {
  throw new Error(`Invalid NEXT_PUBLIC_CLUSTER: "${rawCluster}". Must be "local" or "devnet".`);
}
export const CLUSTER: ClusterType = rawCluster as ClusterType;

export const DEFAULT_RPC_URL: Record<ClusterType, string> = {
  local: "http://127.0.0.1:8899",
  devnet: "https://api.devnet.solana.com",
};

// Validate RPC URL format if provided
if (process.env.NEXT_PUBLIC_SOLANA_RPC_URL) {
  const customRpc = process.env.NEXT_PUBLIC_SOLANA_RPC_URL.trim();
  if (!customRpc.startsWith("http://") && !customRpc.startsWith("https://")) {
    throw new Error(
      `Invalid NEXT_PUBLIC_SOLANA_RPC_URL: "${customRpc}". Must be a valid HTTP or HTTPS URL.`
    );
  }
}

export const RPC_URL = process.env.NEXT_PUBLIC_SOLANA_RPC_URL?.trim() || DEFAULT_RPC_URL[CLUSTER];

export const PROGRAM_ID = new PublicKey(solhealthIdl.address);

export const ENABLE_DEMO =
  process.env.NEXT_PUBLIC_ENABLE_DEMO === "true" ||
  (CLUSTER === "local" && process.env.NEXT_PUBLIC_ENABLE_DEMO !== "false");

/**
 * Execute a read-only RPC call with exponential backoff (max 3 tries) for 429 rate-limits and network timeouts.
 * Never blindly retries transaction sends.
 */
export async function withRpcRetry<T>(
  fn: () => Promise<T>,
  operationName = "RPC query",
  maxTries = 3
): Promise<T> {
  let attempt = 0;
  let delayMs = 500;
  while (attempt < maxTries) {
    try {
      attempt++;
      return await fn();
    } catch (err: any) {
      const msg = err?.message || String(err);
      const isRateLimit =
        msg.includes("429") ||
        msg.includes("Too Many Requests") ||
        msg.includes("rate limit") ||
        msg.includes("limit exceeded");
      const isTimeout =
        msg.includes("timeout") ||
        msg.includes("timed out") ||
        msg.includes("ETIMEDOUT") ||
        msg.includes("fetch failed") ||
        msg.includes("network error");

      if ((isRateLimit || isTimeout) && attempt < maxTries) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
        delayMs *= 2;
        continue;
      }

      if (isRateLimit) {
        throw new Error(
          `Solana RPC rate limit exceeded while performing ${operationName}. Please wait a few moments and try again, or use a dedicated RPC endpoint.`
        );
      }
      if (isTimeout) {
        throw new Error(
          `Solana RPC connection timed out while performing ${operationName}. The network may be congested; please retry shortly.`
        );
      }
      throw err;
    }
  }
  throw new Error(`Failed to complete ${operationName} after ${maxTries} attempts.`);
}

/**
 * Explorer URL helper per cluster
 */
export function makeExplorerUrl(
  value: string,
  type: "tx" | "address" | "block" = "tx"
): string {
  if (CLUSTER === "devnet") {
    return `https://explorer.solana.com/${type}/${value}?cluster=devnet`;
  }
  const customUrl = encodeURIComponent(RPC_URL);
  return `https://explorer.solana.com/${type}/${value}?cluster=custom&customUrl=${customUrl}`;
}

// Official Solana Mainnet-Beta genesis hash: 5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2N9d
export const MAINNET_GENESIS_HASH = "5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2N9d";

// Official Solana Devnet genesis hash: EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG
export const DEVNET_GENESIS_HASH = "EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG";

/**
 * Refuse execution if connection points to Mainnet-Beta.
 */
export async function assertSafeCluster(connection: Connection): Promise<void> {
  const genesisHash = await connection.getGenesisHash();
  if (genesisHash === MAINNET_GENESIS_HASH) {
    throw new Error(
      "Refusing execution on Mainnet-Beta! SolHealth is strictly configured to only target Localnet or Devnet."
    );
  }
}
