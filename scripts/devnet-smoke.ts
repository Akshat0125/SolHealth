import { Connection, PublicKey } from "@solana/web3.js";
import { checkProgramDeployed } from "../app/lib/health.ts";
import { getConfig, PROGRAM_ID } from "../app/lib/solana.ts";
import { assertSafeCluster, DEVNET_GENESIS_HASH } from "../app/lib/config.ts";

async function main() {
  console.log("=== SolHealth Devnet Smoke Test (Read-Only) ===");
  const devnetRpc = process.env.DEVNET_RPC || "https://api.devnet.solana.com";
  const connection = new Connection(devnetRpc, "confirmed");

  // Ensure safe cluster
  await assertSafeCluster(connection);
  const genesis = await connection.getGenesisHash();
  console.log(`Connected to cluster (genesis: ${genesis})`);
  if (genesis !== DEVNET_GENESIS_HASH) {
    console.warn("Notice: Genesis hash differs from official Devnet constant");
  }

  console.log(`Program ID: ${PROGRAM_ID.toBase58()}`);

  // 1. Check program is executable
  const isDeployed = await checkProgramDeployed(connection, PROGRAM_ID);
  if (!isDeployed) {
    throw new Error(`Program ${PROGRAM_ID.toBase58()} is NOT deployed or not executable on Devnet!`);
  }
  console.log("✓ SolHealth program is deployed and executable on Devnet.");

  // 2. Read Config PDA
  const config = await getConfig(connection);
  if (!config) {
    console.log("✓ Registry status: registry not set up");
  } else {
    console.log(`✓ Registry status: authority address: ${config.authority.toBase58()}`);
  }

  console.log("\nPASS: DEVNET SMOKE TEST SUCCEEDED!");
}

main().catch((err) => {
  console.error("\nFAIL: Devnet smoke test failed:", err);
  process.exit(1);
});
