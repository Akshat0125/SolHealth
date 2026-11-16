import fs from "fs";
import os from "os";
import path from "path";
import nacl from "tweetnacl";
import { Keypair, Connection, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { BN } from "@coral-xyz/anchor";
import {
  initConfig,
  issueCredential,
  registerRecord,
  grantAccess,
  revokeAccess,
  accessRecord,
  registerEncryptionKey,
  getEncryptionKey,
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
  ENCRYPTION_MESSAGE,
  deriveEncryptionKeypair,
  deriveKeypairFromSecret,
  wrapKeyForX25519,
  unwrapKeyX25519,
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
  console.log("=== SolHealth Flow Integration Test (Signature-Derived X25519) ===");
  const connection = new Connection(LOCALNET_RPC_URL, "confirmed");

  // Step 1: Generate Keypairs and Airdrop
  console.log("\n1. Setting up keypairs and requesting airdrops...");
  const authority = getAuthorityKeypair();
  const patient = Keypair.generate();
  const doctor = Keypair.generate();
  const doctor2 = Keypair.generate();
  const unverifiedDoctor = Keypair.generate();

  await airdrop(connection, authority, 10);
  await airdrop(connection, patient, 5);
  await airdrop(connection, doctor, 5);
  await airdrop(connection, doctor2, 5);
  await airdrop(connection, unverifiedDoctor, 2);
  console.log("✓ Airdrops confirmed for authority, patient, doctor, and test actors");

  // Step 2: Initialize Config as authority
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

  // Step 3: Issue Credential to Doctor (and Doctor2)
  console.log("\n3. Issuing credentials to doctor and doctor2...");
  const issueCredTx = await issueCredential(authority, doctor.publicKey, connection);
  console.log("✓ Doctor 1 credential issued, tx:", issueCredTx);
  await issueCredential(authority, doctor2.publicKey, connection);
  console.log("✓ Doctor 2 credential issued");

  const cred = await getCredential(doctor.publicKey, connection);
  if (!cred || !cred.active || cred.doctor.toBase58() !== doctor.publicKey.toBase58()) {
    throw new Error("Doctor credential mismatch or inactive");
  }
  console.log("✓ Doctor credential verified on-chain (active: true)");

  // Step 4: Verify Deterministic Key Derivation & Register Encryption Keys
  console.log("\n4. Deriving and registering X25519 encryption keys...");
  const msgBytes = new TextEncoder().encode(ENCRYPTION_MESSAGE);

  // Check determinism: same signature gives same keypair
  const sig1 = nacl.sign.detached(msgBytes, patient.secretKey);
  const sig2 = nacl.sign.detached(msgBytes, patient.secretKey);
  const patientEnc1 = await deriveEncryptionKeypair(sig1);
  const patientEnc2 = await deriveEncryptionKeypair(sig2);
  for (let i = 0; i < 32; i++) {
    if (patientEnc1.publicKey[i] !== patientEnc2.publicKey[i] || patientEnc1.secretKey[i] !== patientEnc2.secretKey[i]) {
      throw new Error("Derivation non-deterministic: keys do not match!");
    }
  }
  console.log("✓ Key derivation confirmed deterministic (same signature -> identical keypair)");

  const patientEnc = await deriveKeypairFromSecret(patient.secretKey);
  const doctorEnc = await deriveKeypairFromSecret(doctor.secretKey);
  const doctor2Enc = await deriveKeypairFromSecret(doctor2.secretKey);

  // Publish encryption keys on-chain
  const patEncTx = await registerEncryptionKey(patient, patientEnc.publicKey, 1, connection);
  console.log("✓ Patient encryption key registered on-chain, tx:", patEncTx);

  const docEncTx = await registerEncryptionKey(doctor, doctorEnc.publicKey, 1, connection);
  console.log("✓ Doctor 1 encryption key registered on-chain, tx:", docEncTx);

  await registerEncryptionKey(doctor2, doctor2Enc.publicKey, 1, connection);
  console.log("✓ Doctor 2 encryption key registered on-chain");

  const fetchedDocKey = await getEncryptionKey(doctor.publicKey, connection);
  if (!fetchedDocKey || Buffer.from(fetchedDocKey.x25519Pubkey).toString("hex") !== Buffer.from(doctorEnc.publicKey).toString("hex")) {
    throw new Error("Published encryption key on-chain does not match derived key!");
  }
  console.log("✓ Verified published doctor encryption key on-chain matches derived key");

  // Step 5: Encrypt sample health record
  console.log("\n5. Encrypting sample health record with AES-256-GCM...");
  const originalReport =
    "PATIENT HEALTH SUMMARY:\nName: Alice Smith\nDOB: 1985-04-12\nBlood Type: A+\nAllergies: Penicillin\nVitals: Normal (BP 118/76, HR 72)";
  const reportBytes = new TextEncoder().encode(originalReport);
  const { cipher, rawKey } = await encryptFile(reportBytes);
  const fileHash = await sha256(cipher);
  console.log(`✓ Record encrypted: cipher ${cipher.length} bytes, fileHash (SHA-256) computed`);

  // Step 6: Register Record on-chain as patient (wrapped for patient's own X25519 key)
  console.log("\n6. Registering record on-chain as patient...");
  const recordId = new BN(Date.now());
  const standInCid = "QmStandInCid" + Buffer.from(fileHash).toString("hex").slice(0, 32);
  const patientWrappedKey = wrapKeyForX25519(patientEnc.publicKey, rawKey);

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

  // Step 7: Check that unverified doctor cannot be granted access
  console.log("\n7. Verifying unverified doctor cannot receive access grant...");
  let unverifiedGrantFailed = false;
  try {
    const dummyWrappedKey = wrapKeyForX25519(patientEnc.publicKey, rawKey);
    await grantAccess(patient, recordPda, unverifiedDoctor.publicKey, new BN(300), dummyWrappedKey, connection);
  } catch (err: any) {
    unverifiedGrantFailed = true;
    console.log("✓ Access correctly rejected for unverified doctor:", err.message);
  }
  if (!unverifiedGrantFailed) {
    throw new Error("SECURITY FAILURE: Granting access to unverified doctor should have failed!");
  }

  // Step 8: Wrap AES key for Doctor using doctor's published X25519 key & Grant Access
  console.log("\n8. Wrapping symmetric AES key for doctor's published X25519 key...");
  const doctorWrappedKey = wrapKeyForX25519(new Uint8Array(fetchedDocKey.x25519Pubkey), rawKey);
  console.log(`✓ Wrapped key for doctor: ${doctorWrappedKey.length} bytes (104 bytes, <= 128 bytes limit)`);

  console.log("Granting access to doctor for 300 seconds...");
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

  // Step 9: Check that a different doctor cannot access someone else's grant
  console.log("\n9. Verifying a different doctor (Doctor 2) cannot open Doctor 1's grant...");
  let doc2AccessFailed = false;
  try {
    await accessRecord(doctor2, recordPda, connection);
  } catch (err: any) {
    doc2AccessFailed = true;
    console.log("✓ Doctor 2 access correctly rejected:", err.message);
  }
  if (!doc2AccessFailed) {
    throw new Error("SECURITY FAILURE: Doctor 2 was able to call accessRecord on Doctor 1's grant!");
  }

  // Step 10: Check that Doctor 2 cannot unwrap Doctor 1's wrapped key
  console.log("\n10. Verifying Doctor 2 cannot unwrap key wrapped for Doctor 1...");
  let doc2UnwrapFailed = false;
  try {
    unwrapKeyX25519(doctorWrappedKey, doctor2Enc.secretKey);
  } catch {
    doc2UnwrapFailed = true;
  }
  if (!doc2UnwrapFailed) {
    throw new Error("SECURITY FAILURE: Doctor 2 was able to unwrap Doctor 1's key!");
  }
  console.log("✓ Isolation confirmed: Doctor 2 cannot unwrap Doctor 1's key");

  // Step 11: Doctor 1 calls accessRecord and successfully decrypts
  console.log("\n11. Doctor 1 calling accessRecord and decrypting...");
  const accessTx = await accessRecord(doctor, recordPda, connection);
  console.log("✓ RecordAccessed event emitted, tx:", accessTx);

  const latestAccess = await getAccess(recordPda, doctor.publicKey, connection);
  if (!latestAccess) {
    throw new Error("Could not fetch access account for doctor");
  }

  const unwrappedKey = unwrapKeyX25519(
    new Uint8Array(latestAccess.wrappedKey),
    doctorEnc.secretKey
  );
  const decryptedReportBytes = await decryptFile(cipher, unwrappedKey);
  const decryptedReport = new TextDecoder().decode(decryptedReportBytes);

  if (decryptedReport !== originalReport) {
    throw new Error("Decrypted report does not match original report!");
  }
  console.log("✓ Decrypted report verified successfully:\n---\n" + decryptedReport + "\n---");

  // Step 12: Revoke access and verify accessRecord fails
  console.log("\n12. Patient revoking access from doctor...");
  const revokeTx = await revokeAccess(patient, recordPda, doctor.publicKey, connection);
  console.log("✓ Access revoked, tx:", revokeTx);

  const revokedAccess = await getAccess(recordPda, doctor.publicKey, connection);
  if (!revokedAccess || !revokedAccess.revoked) {
    throw new Error("Access account was not revoked on-chain");
  }
  console.log("✓ Verified on-chain: access.revoked == true");

  console.log("\n13. Verifying doctor access fails after revocation...");
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
