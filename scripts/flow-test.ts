import fs from "fs";
import os from "os";
import path from "path";
import { Keypair, Connection, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { BN } from "@coral-xyz/anchor";
import {
  initConfig,
  issueCredential,
  registerRecord,
  grantAccess,
  revokeAccess,
  accessRecord,
  getConfig,
  getCredential,
  getRecord,
  getAccess,
  getRecordPda,
  LOCALNET_RPC_URL,
} from "../app/lib/solana.ts";
import {
  encryptFile,
  decryptFile,
  sha256,
  wrapKeyFor,
  unwrapKey,
} from "../app/lib/crypto.ts";

async function airdrop(connection: Connection, keypair: Keypair, sol = 5) {
  const sig = await connection.requestAirdrop(
    keypair.publicKey,
    sol * LAMPORTS_PER_SOL
  );
  const blockhash = await connection.getLatestBlockhash();
  await connection.confirmTransaction({
    signature: sig,
    blockhash: blockhash.blockhash,
    lastValidBlockHeight: blockhash.lastValidBlockHeight,
  });
}

function getAuthorityKeypair(): Keypair {
  const defaultWalletPath = path.join(os.homedir(), ".config/solana/id.json");
  if (fs.existsSync(defaultWalletPath)) {
    try {
      const raw = JSON.parse(fs.readFileSync(defaultWalletPath, "utf-8"));
      return Keypair.fromSecretKey(new Uint8Array(raw));
    } catch {
      // ignore
    }
  }
  return Keypair.generate();
}

async function runFlowTest() {
  console.log("=== SolHealth Flow Integration Test ===");
  const connection = new Connection(LOCALNET_RPC_URL, "confirmed");

  // Step 1: Generate Keypairs and Airdrop
  console.log("\n1. Setting up keypairs and requesting airdrops...");
  const authority = getAuthorityKeypair();
  const patient = Keypair.generate();
  const doctor = Keypair.generate();

  await airdrop(connection, authority, 10);
  await airdrop(connection, patient, 5);
  await airdrop(connection, doctor, 5);
  console.log("✓ Airdrops confirmed for authority, patient, and doctor");

  // Step 2: Initialize Config
  console.log("\n2. Checking and initializing Config as authority...");
  const existingConfig = await getConfig(connection);
  if (!existingConfig) {
    const initConfigTx = await initConfig(authority, connection);
    console.log("✓ Config initialized, tx:", initConfigTx);
  } else {
    console.log("✓ Config already initialized on-chain, authority:", existingConfig.authority.toBase58());
  }

  const config = await getConfig(connection);
  if (!config) {
    throw new Error("Config account missing on-chain");
  }

  // Step 3: Issue Credential to Doctor
  console.log("\n3. Issuing credential to doctor...");
  const issueCredTx = await issueCredential(authority, doctor.publicKey, connection);
  console.log("✓ Credential issued, tx:", issueCredTx);

  const cred = await getCredential(doctor.publicKey, connection);
  if (!cred || !cred.active || cred.doctor.toBase58() !== doctor.publicKey.toBase58()) {
    throw new Error("Doctor credential mismatch or inactive");
  }
  console.log("✓ Doctor credential verified on-chain (active: true)");

  // Step 4: Encrypt sample health record
  console.log("\n4. Encrypting sample health record with AES-256-GCM...");
  const originalReport =
    "PATIENT HEALTH SUMMARY:\nName: Alice Smith\nDOB: 1985-04-12\nBlood Type: A+\nAllergies: Penicillin\nVitals: Normal (BP 118/76, HR 72)";
  const reportBytes = new TextEncoder().encode(originalReport);

  const { cipher, rawKey } = await encryptFile(reportBytes);
  const fileHash = await sha256(cipher);
  console.log(`✓ Record encrypted: cipher ${cipher.length} bytes, fileHash (SHA-256) computed`);

  // Step 5: Register Record on-chain
  console.log("\n5. Registering record on-chain as patient...");
  const recordId = new BN(Date.now());
  const standInCid = "QmStandInCid" + Buffer.from(fileHash).toString("hex").slice(0, 32);
  const patientWrappedKey = wrapKeyFor(patient.publicKey, rawKey);

  const regRecTx = await registerRecord(
    patient,
    recordId,
    standInCid,
    fileHash,
    patientWrappedKey,
    connection
  );
  console.log("✓ Record registered, tx:", regRecTx);

  const [recordPda] = getRecordPda(patient.publicKey, recordId);
  const recordAcc = await getRecord(recordPda, connection);
  if (!recordAcc || recordAcc.patient.toBase58() !== patient.publicKey.toBase58()) {
    throw new Error("Registered record account not found or patient mismatch");
  }
  console.log("✓ Record account verified on-chain at PDA:", recordPda.toBase58());

  // Step 6: Wrap AES key for the Doctor
  console.log("\n6. Wrapping symmetric AES key for doctor's Ed25519 key...");
  const doctorWrappedKey = wrapKeyFor(doctor.publicKey, rawKey);
  console.log(`✓ Wrapped key for doctor: ${doctorWrappedKey.length} bytes (<= 128 bytes limit)`);

  // Step 7: Grant Access to Doctor
  console.log("\n7. Granting access to doctor for 300 seconds...");
  const durationSecs = new BN(300);
  const grantTx = await grantAccess(
    patient,
    recordPda,
    doctor.publicKey,
    durationSecs,
    doctorWrappedKey,
    connection
  );
  console.log("✓ Access granted, tx:", grantTx);

  const accessAcc = await getAccess(recordPda, doctor.publicKey, connection);
  if (!accessAcc || accessAcc.revoked) {
    throw new Error("Access account missing or marked revoked");
  }
  console.log("✓ Access PDA verified on-chain, expiry:", new Date(accessAcc.expiry.toNumber() * 1000).toISOString());

  // Step 8: Doctor accesses the record
  console.log("\n8. Doctor calling accessRecord...");
  const accessTx = await accessRecord(doctor, recordPda, connection);
  console.log("✓ RecordAccessed event emitted, tx:", accessTx);

  // Step 9: Doctor unwraps key and decrypts file
  console.log("\n9. Doctor unwrapping key and decrypting ciphertext...");
  const latestAccess = await getAccess(recordPda, doctor.publicKey, connection);
  if (!latestAccess) {
    throw new Error("Could not fetch access account for doctor");
  }

  const unwrappedKey = unwrapKey(
    new Uint8Array(latestAccess.wrappedKey),
    doctor.secretKey
  );
  const decryptedReportBytes = await decryptFile(cipher, unwrappedKey);
  const decryptedReport = new TextDecoder().decode(decryptedReportBytes);

  if (decryptedReport !== originalReport) {
    throw new Error("Decrypted report does not match original report!");
  }
  console.log("✓ Decrypted report verified successfully:\n---\n" + decryptedReport + "\n---");

  // Step 10: Revoke access and verify accessRecord fails
  console.log("\n10. Patient revoking access from doctor...");
  const revokeTx = await revokeAccess(patient, recordPda, doctor.publicKey, connection);
  console.log("✓ Access revoked, tx:", revokeTx);

  const revokedAccess = await getAccess(recordPda, doctor.publicKey, connection);
  if (!revokedAccess || !revokedAccess.revoked) {
    throw new Error("Access account was not revoked on-chain");
  }
  console.log("✓ Verified on-chain: access.revoked == true");

  console.log("\n11. Verifying doctor access fails after revocation...");
  let accessFailedAfterRevoke = false;
  try {
    await accessRecord(doctor, recordPda, connection);
  } catch (err: any) {
    accessFailedAfterRevoke = true;
    console.log("✓ Access correctly rejected by contract:", err.message);
  }

  if (!accessFailedAfterRevoke) {
    throw new Error("Doctor was still able to access record after access was revoked!");
  }

  console.log("\n=========================================");
  console.log("PASS: FULL SOLHEALTH FLOW TEST SUCCEEDED!");
  console.log("=========================================\n");
}

runFlowTest().catch((err) => {
  console.error("\nFAIL: FLOW TEST ENCOUNTERED AN ERROR:", err);
  process.exit(1);
});
