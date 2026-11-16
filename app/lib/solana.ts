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
import nacl from "tweetnacl";
import solhealthIdl from "./idl/solhealth.json" with { type: "json" };
import type { Solhealth } from "./types/solhealth.ts";
import { getSolanaConnection, LOCALNET_RPC_URL } from "./roles.ts";
import { PROGRAM_ID as CONFIG_PROGRAM_ID, withRpcRetry } from "./config.ts";

export { LOCALNET_RPC_URL, getSolanaConnection };

export const PROGRAM_ID = CONFIG_PROGRAM_ID;

/**
 * Standard signer abstraction for SolHealth compatible with browser wallets and keypairs.
 */
export interface SolhealthSigner {
  publicKey: PublicKey;
  signTransaction<T extends Transaction | VersionedTransaction>(tx: T): Promise<T>;
  signAllTransactions<T extends Transaction | VersionedTransaction>(txs: T[]): Promise<T[]>;
  signMessage?(message: Uint8Array): Promise<Uint8Array>;
}

export type SolhealthSignerOrKeypair = SolhealthSigner | Keypair;

/**
 * Wrap a Solana Keypair into a SolhealthSigner for scripts and demo mode.
 */
export function keypairToSigner(keypair: Keypair): SolhealthSigner {
  return {
    publicKey: keypair.publicKey,
    async signTransaction<T extends Transaction | VersionedTransaction>(tx: T): Promise<T> {
      if ("partialSign" in tx) {
        tx.partialSign(keypair);
      } else {
        (tx as VersionedTransaction).sign([keypair]);
      }
      return tx;
    },
    async signAllTransactions<T extends Transaction | VersionedTransaction>(txs: T[]): Promise<T[]> {
      return Promise.all(
        txs.map(async (tx) => {
          if ("partialSign" in tx) {
            tx.partialSign(keypair);
          } else {
            (tx as VersionedTransaction).sign([keypair]);
          }
          return tx;
        })
      );
    },
    async signMessage(message: Uint8Array): Promise<Uint8Array> {
      return nacl.sign.detached(message, keypair.secretKey);
    },
  };
}

export function ensureSigner(signerOrKeypair: SolhealthSignerOrKeypair): SolhealthSigner {
  if ("secretKey" in signerOrKeypair && (signerOrKeypair as any).secretKey) {
    return keypairToSigner(signerOrKeypair as Keypair);
  }
  return signerOrKeypair as SolhealthSigner;
}

/**
 * Custom Anchor Wallet implementation for SolhealthSigner.
 */
export class SolhealthSignerWallet implements anchor.Wallet {
  readonly signer: SolhealthSigner;

  constructor(signer: SolhealthSigner) {
    this.signer = signer;
  }

  async signTransaction<T extends Transaction | VersionedTransaction>(
    tx: T
  ): Promise<T> {
    return this.signer.signTransaction(tx);
  }

  async signAllTransactions<T extends Transaction | VersionedTransaction>(
    txs: T[]
  ): Promise<T[]> {
    return this.signer.signAllTransactions(txs);
  }

  get publicKey(): PublicKey {
    return this.signer.publicKey;
  }

  get payer(): Keypair {
    throw new Error("Payer keypair not accessible on SolhealthSignerWallet");
  }
}

/**
 * Backward compatibility alias for KeypairWallet
 */
export class KeypairWallet extends SolhealthSignerWallet {
  constructor(keypair: Keypair) {
    super(keypairToSigner(keypair));
  }
}

/**
 * Instantiate an Anchor Program client with a SolhealthSigner.
 */
export function getProgram(
  signer: SolhealthSignerOrKeypair,
  connection?: Connection
): Program<Solhealth> {
  const conn = connection || getSolanaConnection();
  const solhealthSigner = ensureSigner(signer);
  const wallet = new SolhealthSignerWallet(solhealthSigner);
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

export function getEncryptionKeyPda(
  owner: PublicKey,
  programId = PROGRAM_ID
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("enc"), owner.toBuffer()],
    programId
  );
}

// -----------------------------------------------------------------------------
// Error Mapping
// -----------------------------------------------------------------------------

export function mapProgramError(error: unknown): string {
  if (!error) return "Unknown error occurred";
  let errString =
    typeof error === "string"
      ? error
      : (error as Error).message || JSON.stringify(error);

  if (
    errString.includes("program that does not exist") ||
    errString.includes("ProgramAccountNotFound") ||
    errString.includes("invalid program for execution") ||
    errString.includes("could not find account") ||
    errString.includes("Unable to find the account") ||
    errString.includes("failed to get account data") ||
    errString.includes("program has not been deployed") ||
    (errString.includes("AccountNotFound") && errString.includes("52sv"))
  ) {
    return "SolHealth program is not deployed on this network. Run npm run demo:reset in a terminal.";
  }

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
  if (
    errString.includes("InvalidEncryptionKey") ||
    errString.includes("6006") ||
    errString.includes("Invalid encryption key")
  ) {
    return "Invalid encryption key: key cannot be all zeros.";
  }

  if (
    errString.includes("User rejected") ||
    errString.includes("user rejected") ||
    errString.includes("Transaction cancelled") ||
    errString.includes("WalletSignTransactionError") ||
    errString.includes("WalletSignMessageError") ||
    errString.includes("WalletConnectionError") ||
    errString.includes("Rejected by user")
  ) {
    return "You cancelled the request in your wallet.";
  }

  // Remove noise such as "Catch the SendTransactionError and call getLogs()"
  errString = errString
    .replace(/Catch the SendTransactionError and call getLogs\(\)[^.]*\.?/gi, "")
    .replace(/SendTransactionError:\s*/gi, "")
    .trim();

  return errString;
}

// -----------------------------------------------------------------------------
// Instructions (One async function per instruction, returning tx signature)
// Uses AnchorProvider built from SolhealthSigner; NO .signers([keypair]) calls.
// -----------------------------------------------------------------------------

export async function registerEncryptionKey(
  signer: SolhealthSignerOrKeypair,
  x25519Pubkey: Uint8Array | number[],
  version = 1,
  connection?: Connection
): Promise<string> {
  const s = ensureSigner(signer);
  const program = getProgram(s, connection);
  const [encPda] = getEncryptionKeyPda(s.publicKey, program.programId);
  const keyArr =
    x25519Pubkey instanceof Uint8Array ? Array.from(x25519Pubkey) : x25519Pubkey;
  if (keyArr.length !== 32) {
    throw new Error("x25519Pubkey must be exactly 32 bytes");
  }

  try {
    const tx = await program.methods
      .registerEncryptionKey(keyArr as unknown as number[], version)
      .accounts({
        encryptionKey: encPda,
        owner: s.publicKey,
        systemProgram: SystemProgram.programId,
      } as any)
      .rpc();
    return tx;
  } catch (err) {
    throw new Error(mapProgramError(err));
  }
}

export async function initConfig(
  signer: SolhealthSignerOrKeypair,
  connection?: Connection
): Promise<string> {
  const s = ensureSigner(signer);
  const program = getProgram(s, connection);
  const [configPda] = getConfigPda(program.programId);

  try {
    const tx = await program.methods
      .initializeConfig()
      .accounts({
        config: configPda,
        authority: s.publicKey,
        systemProgram: SystemProgram.programId,
      } as any)
      .rpc();
    return tx;
  } catch (err) {
    throw new Error(mapProgramError(err));
  }
}

export async function issueCredential(
  signer: SolhealthSignerOrKeypair,
  doctorPubkey: PublicKey,
  connection?: Connection
): Promise<string> {
  const s = ensureSigner(signer);
  const program = getProgram(s, connection);
  const [configPda] = getConfigPda(program.programId);
  const [credPda] = getCredentialPda(doctorPubkey, program.programId);

  try {
    const tx = await program.methods
      .issueCredential(doctorPubkey)
      .accounts({
        config: configPda,
        credential: credPda,
        authority: s.publicKey,
        systemProgram: SystemProgram.programId,
      } as any)
      .rpc();
    return tx;
  } catch (err) {
    throw new Error(mapProgramError(err));
  }
}

export async function revokeCredential(
  signer: SolhealthSignerOrKeypair,
  doctorPubkey: PublicKey,
  connection?: Connection
): Promise<string> {
  const s = ensureSigner(signer);
  const program = getProgram(s, connection);
  const [configPda] = getConfigPda(program.programId);
  const [credPda] = getCredentialPda(doctorPubkey, program.programId);

  try {
    const tx = await program.methods
      .revokeCredential()
      .accounts({
        config: configPda,
        credential: credPda,
        authority: s.publicKey,
      } as any)
      .rpc();
    return tx;
  } catch (err) {
    throw new Error(mapProgramError(err));
  }
}

export async function registerRecord(
  signer: SolhealthSignerOrKeypair,
  recordId: BN | number | bigint,
  cid: string,
  fileHash: number[] | Uint8Array,
  wrappedKey: Uint8Array,
  connection?: Connection
): Promise<string> {
  const s = ensureSigner(signer);
  const program = getProgram(s, connection);
  const bnRecordId = new BN(recordId.toString());
  const [recPda] = getRecordPda(
    s.publicKey,
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
        patient: s.publicKey,
        systemProgram: SystemProgram.programId,
      } as any)
      .rpc();
    return tx;
  } catch (err) {
    throw new Error(mapProgramError(err));
  }
}

export async function grantAccess(
  signer: SolhealthSignerOrKeypair,
  recordPda: PublicKey,
  doctorPubkey: PublicKey,
  durationSecs: BN | number | bigint,
  wrappedKey: Uint8Array,
  connection?: Connection
): Promise<string> {
  const s = ensureSigner(signer);
  const program = getProgram(s, connection);
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
        patient: s.publicKey,
        systemProgram: SystemProgram.programId,
      } as any)
      .rpc();
    return tx;
  } catch (err) {
    throw new Error(mapProgramError(err));
  }
}

export async function revokeAccess(
  signer: SolhealthSignerOrKeypair,
  recordPda: PublicKey,
  doctorPubkey: PublicKey,
  connection?: Connection
): Promise<string> {
  const s = ensureSigner(signer);
  const program = getProgram(s, connection);
  const [accPda] = getAccessPda(recordPda, doctorPubkey, program.programId);

  try {
    const tx = await program.methods
      .revokeAccess()
      .accounts({
        record: recordPda,
        access: accPda,
        patient: s.publicKey,
      } as any)
      .rpc();
    return tx;
  } catch (err) {
    throw new Error(mapProgramError(err));
  }
}

export async function accessRecord(
  signer: SolhealthSignerOrKeypair,
  recordPda: PublicKey,
  connection?: Connection
): Promise<string> {
  const s = ensureSigner(signer);
  const program = getProgram(s, connection);
  const [credPda] = getCredentialPda(
    s.publicKey,
    program.programId
  );
  const [accPda] = getAccessPda(
    recordPda,
    s.publicKey,
    program.programId
  );

  try {
    const tx = await program.methods
      .accessRecord()
      .accounts({
        record: recordPda,
        credential: credPda,
        access: accPda,
        doctor: s.publicKey,
      } as any)
      .rpc();
    return tx;
  } catch (err) {
    throw new Error(mapProgramError(err));
  }
}

// -----------------------------------------------------------------------------
// Fetchers
// -----------------------------------------------------------------------------

function getReadOnlyProgram(connection?: Connection): Program<Solhealth> {
  const dummy = Keypair.generate();
  return getProgram(dummy, connection);
}

export async function getEncryptionKey(
  owner: PublicKey,
  connection?: Connection
) {
  const program = getReadOnlyProgram(connection);
  const [encPda] = getEncryptionKeyPda(owner, program.programId);
  return withRpcRetry(async () => {
    try {
      return await program.account.encryptionKey.fetch(encPda);
    } catch {
      return null;
    }
  }, "fetch encryption key");
}

export async function getConfig(connection?: Connection) {
  const program = getReadOnlyProgram(connection);
  const [configPda] = getConfigPda(program.programId);
  return withRpcRetry(async () => {
    try {
      return await program.account.config.fetch(configPda);
    } catch {
      return null;
    }
  }, "fetch registry config");
}

export async function getCredential(
  doctorPubkey: PublicKey,
  connection?: Connection
) {
  const program = getReadOnlyProgram(connection);
  const [credPda] = getCredentialPda(doctorPubkey, program.programId);
  return withRpcRetry(async () => {
    try {
      return await program.account.credential.fetch(credPda);
    } catch {
      return null;
    }
  }, "fetch doctor credential");
}

export async function getRecord(recordPda: PublicKey, connection?: Connection) {
  const program = getReadOnlyProgram(connection);
  return withRpcRetry(async () => {
    try {
      return await program.account.record.fetch(recordPda);
    } catch {
      return null;
    }
  }, "fetch medical record");
}

export async function getAccess(
  recordPda: PublicKey,
  doctorPubkey: PublicKey,
  connection?: Connection
) {
  const program = getReadOnlyProgram(connection);
  const [accPda] = getAccessPda(recordPda, doctorPubkey, program.programId);
  return withRpcRetry(async () => {
    try {
      return await program.account.access.fetch(accPda);
    } catch {
      return null;
    }
  }, "fetch access grant");
}

export async function listRecordsByPatient(
  patientPubkey: PublicKey,
  connection?: Connection
) {
  const program = getReadOnlyProgram(connection);
  return withRpcRetry(async () => {
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
  }, "list patient records");
}

export async function listAccessForDoctor(
  doctorPubkey: PublicKey,
  connection?: Connection
) {
  const program = getReadOnlyProgram(connection);
  return withRpcRetry(async () => {
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
  }, "list doctor access grants");
}

export async function listCredentials(connection?: Connection) {
  const program = getReadOnlyProgram(connection);
  return withRpcRetry(async () => {
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
  }, "list credentials");
}

export async function listAllAccess(connection?: Connection) {
  const program = getReadOnlyProgram(connection);
  return withRpcRetry(async () => {
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
  }, "list all access grants");
}
