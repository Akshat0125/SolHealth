import { Connection, PublicKey } from "@solana/web3.js";
import { PROGRAM_ID } from "./solana.ts";
import { withRpcRetry } from "./config.ts";

export const RECORD_ACCOUNT_SPACE = 289;

/**
 * Checks if the SolHealth Anchor program is deployed and executable on the connected cluster.
 */
export async function checkProgramDeployed(
  connection: Connection,
  programId: PublicKey = PROGRAM_ID
): Promise<boolean> {
  return withRpcRetry(async () => {
    try {
      const acc = await connection.getAccountInfo(programId);
      return acc !== null && acc.executable === true;
    } catch {
      return false;
    }
  }, "check program deployment status");
}

/**
 * Calculates the minimum lamports required for Record account rent exemption + transaction fee buffer.
 */
export async function getMinRecordBalance(
  connection: Connection
): Promise<number> {
  return withRpcRetry(async () => {
    try {
      const rent = await connection.getMinimumBalanceForRentExemption(
        RECORD_ACCOUNT_SPACE
      );
      // Buffer for transaction fee (e.g. 10,000 lamports)
      return rent + 10000;
    } catch {
      // Fallback: 0.0035 SOL (~3,500,000 lamports)
      return 3500000;
    }
  }, "get minimum record rent balance");
}
