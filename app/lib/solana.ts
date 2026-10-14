import * as anchor from "@coral-xyz/anchor";
import { Program, AnchorProvider, BN } from "@coral-xyz/anchor";
import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  VersionedTransaction,
} from "@solana/web3.js";
import solhealthIdl from "./idl/solhealth.json" with { type: "json" };
import type { Solhealth } from "./types/solhealth.ts";
import { getSolanaConnection, LOCALNET_RPC_URL } from "./roles.ts";

export { LOCALNET_RPC_URL, getSolanaConnection };

export const PROGRAM_ID = new PublicKey(solhealthIdl.address);

/**
 * Custom Anchor Wallet implementation for Node & Browser Keypairs.
 */
export class KeypairWallet implements anchor.Wallet {
  readonly payer: Keypair;

  constructor(payer: Keypair) {
    this.payer = payer;
  }

  async signTransaction<T extends Transaction | VersionedTransaction>(
    tx: T
  ): Promise<T> {
    if ("partialSign" in tx) {
      tx.partialSign(this.payer);
    } else {
      (tx as VersionedTransaction).sign([this.payer]);
    }
    return tx;
  }

  async signAllTransactions<T extends Transaction | VersionedTransaction>(
    txs: T[]
  ): Promise<T[]> {
    return Promise.all(txs.map((tx) => this.signTransaction(tx)));
  }

  get publicKey(): PublicKey {
    return this.payer.publicKey;
  }
}

/**
 * Instantiate an Anchor Program client with a specific Keypair.
 */
export function getProgram(
  walletKeypair: Keypair,
  connection?: Connection
): Program<Solhealth> {
  const conn = connection || getSolanaConnection();
  const wallet = new KeypairWallet(walletKeypair);
  const provider = new AnchorProvider(conn, wallet, {
    commitment: "confirmed",
    preflightCommitment: "confirmed",
  });
  return new Program<Solhealth>(solhealthIdl as unknown as Solhealth, provider);
}

// -----------------------------------------------------------------------------
// PDA Helpers
// -----------------------------------------------------------------------------

export function getConfigPda(programId = PROGRAM_ID): [PublicKey, number] {
  return PublicKey.findProgramAddressSync([Buffer.from("config")], programId);
}

export function getCredentialPda(
  doctorPubkey: PublicKey,
  programId = PROGRAM_ID
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("cred"), doctorPubkey.toBuffer()],
    programId
  );
}

export function getRecordPda(
  patientPubkey: PublicKey,
  recordId: BN | number | bigint,
  programId = PROGRAM_ID
): [PublicKey, number] {
  const bn = new BN(recordId.toString());
  return PublicKey.findProgramAddressSync(
    [
      Buffer.from("rec"),
      patientPubkey.toBuffer(),
      bn.toArrayLike(Buffer, "le", 8),
    ],
    programId
  );
}

export function getAccessPda(
  recordPda: PublicKey,
  doctorPubkey: PublicKey,
  programId = PROGRAM_ID
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("acc"), recordPda.toBuffer(), doctorPubkey.toBuffer()],
    programId
  );
}

// -----------------------------------------------------------------------------
// Error Mapping
// -----------------------------------------------------------------------------

export function mapProgramError(error: unknown): string {
  if (!error) return "Unknown error occurred";
  const errString =
    typeof error === "string"
      ? error
      : (error as Error).message || JSON.stringify(error);

  if (errString.includes("Unauthorized") || errString.includes("6000")) {
    return "Unauthorized: You do not have permission to perform this action.";
  }
  if (
    errString.includes("CredentialInactive") ||
    errString.includes("6001") ||
    errString.includes("Doctor credential is inactive")
  ) {
    return "Doctor credential is inactive or revoked.";
  }
  if (
    errString.includes("AccessRevoked") ||
    errString.includes("6002") ||
    errString.includes("Access has been revoked")
  ) {
    return "Access to this medical record has been revoked by the patient.";
  }
  if (
    errString.includes("AccessExpired") ||
    errString.includes("6003") ||
    errString.includes("Access has expired")
  ) {
    return "Access to this medical record has expired.";
  }
  if (errString.includes("CidTooLong") || errString.includes("6004")) {
    return "IPFS CID exceeds maximum allowed length of 64 bytes.";
  }
  if (errString.includes("KeyTooLong") || errString.includes("6005")) {
    return "Encryption key exceeds maximum allowed length of 128 bytes.";
  }
  return errString;
}

// -----------------------------------------------------------------------------
// Instructions (One async function per instruction, returning tx signature)
// -----------------------------------------------------------------------------

export async function initConfig(
  signerKeypair: Keypair,
  connection?: Connection
): Promise<string> {
  const program = getProgram(signerKeypair, connection);
  const [configPda] = getConfigPda(program.programId);

  try {
    const tx = await program.methods
      .initializeConfig()
      .accounts({
        config: configPda,
        authority: signerKeypair.publicKey,
        systemProgram: SystemProgram.programId,
      } as any)
      .signers([signerKeypair])
      .rpc();
    return tx;
  } catch (err) {
    throw new Error(mapProgramError(err));
  }
}

export async function issueCredential(
  signerKeypair: Keypair,
  doctorPubkey: PublicKey,
  connection?: Connection
): Promise<string> {
  const program = getProgram(signerKeypair, connection);
  const [configPda] = getConfigPda(program.programId);
  const [credPda] = getCredentialPda(doctorPubkey, program.programId);

  try {
    const tx = await program.methods
      .issueCredential(doctorPubkey)
      .accounts({
        config: configPda,
        credential: credPda,
        authority: signerKeypair.publicKey,
        systemProgram: SystemProgram.programId,
      } as any)
      .signers([signerKeypair])
      .rpc();
    return tx;
  } catch (err) {
    throw new Error(mapProgramError(err));
  }
}

export async function revokeCredential(
  signerKeypair: Keypair,
  doctorPubkey: PublicKey,
  connection?: Connection
): Promise<string> {
  const program = getProgram(signerKeypair, connection);
  const [configPda] = getConfigPda(program.programId);
  const [credPda] = getCredentialPda(doctorPubkey, program.programId);

  try {
    const tx = await program.methods
      .revokeCredential()
      .accounts({
        config: configPda,
        credential: credPda,
        authority: signerKeypair.publicKey,
      } as any)
      .signers([signerKeypair])
      .rpc();
    return tx;
  } catch (err) {
    throw new Error(mapProgramError(err));
  }
}

export async function registerRecord(
  signerKeypair: Keypair,
  recordId: BN | number | bigint,
  cid: string,
  fileHash: number[] | Uint8Array,
  wrappedKey: Uint8Array,
  connection?: Connection
): Promise<string> {
  const program = getProgram(signerKeypair, connection);
  const bnRecordId = new BN(recordId.toString());
  const [recPda] = getRecordPda(
    signerKeypair.publicKey,
    bnRecordId,
    program.programId
  );

  const hashArray =
    fileHash instanceof Uint8Array ? Array.from(fileHash) : fileHash;
  if (hashArray.length !== 32) {
    throw new Error("fileHash must be exactly 32 bytes");
  }

  try {
    const tx = await program.methods
      .registerRecord(
        bnRecordId,
        cid,
        hashArray as unknown as number[],
        Buffer.from(wrappedKey)
      )
      .accounts({
        record: recPda,
        patient: signerKeypair.publicKey,
        systemProgram: SystemProgram.programId,
      } as any)
      .signers([signerKeypair])
      .rpc();
    return tx;
  } catch (err) {
    throw new Error(mapProgramError(err));
  }
}

export async function grantAccess(
  signerKeypair: Keypair,
  recordPda: PublicKey,
  doctorPubkey: PublicKey,
  durationSecs: BN | number | bigint,
  wrappedKey: Uint8Array,
  connection?: Connection
): Promise<string> {
  const program = getProgram(signerKeypair, connection);
  const [credPda] = getCredentialPda(doctorPubkey, program.programId);
  const [accPda] = getAccessPda(recordPda, doctorPubkey, program.programId);
  const bnDuration = new BN(durationSecs.toString());

  try {
    const tx = await program.methods
      .grantAccess(doctorPubkey, bnDuration, Buffer.from(wrappedKey))
      .accounts({
        record: recordPda,
        credential: credPda,
        access: accPda,
        patient: signerKeypair.publicKey,
        systemProgram: SystemProgram.programId,
      } as any)
      .signers([signerKeypair])
      .rpc();
    return tx;
  } catch (err) {
    throw new Error(mapProgramError(err));
  }
}

export async function revokeAccess(
  signerKeypair: Keypair,
  recordPda: PublicKey,
  doctorPubkey: PublicKey,
  connection?: Connection
): Promise<string> {
  const program = getProgram(signerKeypair, connection);
  const [accPda] = getAccessPda(recordPda, doctorPubkey, program.programId);

  try {
    const tx = await program.methods
      .revokeAccess()
      .accounts({
        record: recordPda,
        access: accPda,
        patient: signerKeypair.publicKey,
      } as any)
      .signers([signerKeypair])
      .rpc();
    return tx;
  } catch (err) {
    throw new Error(mapProgramError(err));
  }
}

export async function accessRecord(
  signerKeypair: Keypair,
  recordPda: PublicKey,
  connection?: Connection
): Promise<string> {
  const program = getProgram(signerKeypair, connection);
  const [credPda] = getCredentialPda(
    signerKeypair.publicKey,
    program.programId
  );
  const [accPda] = getAccessPda(
    recordPda,
    signerKeypair.publicKey,
    program.programId
  );

  try {
    const tx = await program.methods
      .accessRecord()
      .accounts({
        record: recordPda,
        credential: credPda,
        access: accPda,
        doctor: signerKeypair.publicKey,
      } as any)
      .signers([signerKeypair])
      .rpc();
    return tx;
  } catch (err) {
    throw new Error(mapProgramError(err));
  }
}

// -----------------------------------------------------------------------------
// Fetchers
// -----------------------------------------------------------------------------

export async function getConfig(connection?: Connection) {
  const dummy = Keypair.generate();
  const program = getProgram(dummy, connection);
  const [configPda] = getConfigPda(program.programId);
  try {
    return await program.account.config.fetch(configPda);
  } catch {
    return null;
  }
}

export async function getCredential(
  doctorPubkey: PublicKey,
  connection?: Connection
) {
  const dummy = Keypair.generate();
  const program = getProgram(dummy, connection);
  const [credPda] = getCredentialPda(doctorPubkey, program.programId);
  try {
    return await program.account.credential.fetch(credPda);
  } catch {
    return null;
  }
}

export async function getRecord(recordPda: PublicKey, connection?: Connection) {
  const dummy = Keypair.generate();
  const program = getProgram(dummy, connection);
  try {
    return await program.account.record.fetch(recordPda);
  } catch {
    return null;
  }
}

export async function getAccess(
  recordPda: PublicKey,
  doctorPubkey: PublicKey,
  connection?: Connection
) {
  const dummy = Keypair.generate();
  const program = getProgram(dummy, connection);
  const [accPda] = getAccessPda(recordPda, doctorPubkey, program.programId);
  try {
    return await program.account.access.fetch(accPda);
  } catch {
    return null;
  }
}

export async function listRecordsByPatient(
  patientPubkey: PublicKey,
  connection?: Connection
) {
  const dummy = Keypair.generate();
  const program = getProgram(dummy, connection);
  try {
    const all = await program.account.record.all([
      {
        memcmp: {
          offset: 8, // after discriminator
          bytes: patientPubkey.toBase58(),
        },
      },
    ]);
    return all.map((a) => ({
      publicKey: a.publicKey,
      account: a.account,
    }));
  } catch (err) {
    console.warn("Memcmp query failed, falling back to all:", err);
    const all = await program.account.record.all();
    return all
      .filter((a) => a.account.patient.toBase58() === patientPubkey.toBase58())
      .map((a) => ({
        publicKey: a.publicKey,
        account: a.account,
      }));
  }
}

export async function listAccessForDoctor(
  doctorPubkey: PublicKey,
  connection?: Connection
) {
  const dummy = Keypair.generate();
  const program = getProgram(dummy, connection);
  try {
    const all = await program.account.access.all([
      {
        memcmp: {
          offset: 8 + 32, // discriminator + record pubkey
          bytes: doctorPubkey.toBase58(),
        },
      },
    ]);
    return all.map((a) => ({
      publicKey: a.publicKey,
      account: a.account,
    }));
  } catch (err) {
    console.warn("Memcmp query failed, falling back to all:", err);
    const all = await program.account.access.all();
    return all
      .filter((a) => a.account.doctor.toBase58() === doctorPubkey.toBase58())
      .map((a) => ({
        publicKey: a.publicKey,
        account: a.account,
      }));
  }
}

export async function listCredentials(connection?: Connection) {
  const dummy = Keypair.generate();
  const program = getProgram(dummy, connection);
  try {
    const all = await program.account.credential.all();
    return all.map((a) => ({
      publicKey: a.publicKey,
      account: a.account,
    }));
  } catch (err) {
    console.warn("Failed to fetch credentials:", err);
    return [];
  }
}

export async function listAllAccess(connection?: Connection) {
  const dummy = Keypair.generate();
  const program = getProgram(dummy, connection);
  try {
    const all = await program.account.access.all();
    return all.map((a) => ({
      publicKey: a.publicKey,
      account: a.account,
    }));
  } catch (err) {
    console.warn("Failed to fetch all access:", err);
    return [];
  }
}
