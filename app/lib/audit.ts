import { Connection, PublicKey } from "@solana/web3.js";
import { EventParser, BorshCoder } from "@coral-xyz/anchor";
import solhealthIdl from "./idl/solhealth.json" with { type: "json" };
import { getSolanaConnection, PROGRAM_ID } from "./solana";
import { formatShortAddress } from "./format";

export interface AuditLogEntry {
  signature: string;
  slot: number;
  blockTime: number | null;
  eventName: string;
  fields: Record<string, string>;
  success: boolean;
}

export interface FormattedAuditEvent extends AuditLogEntry {
  sentence: string;
  category: "credentials" | "records" | "access" | "transactions";
  status: "ok" | "warn" | "danger";
  utcTime: string;
}

const coder = new BorshCoder(solhealthIdl as any);
const eventParser = new EventParser(PROGRAM_ID, coder);

async function mapConcurrent<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T) => Promise<R>
): Promise<R[]> {
  const results: R[] = [];
  for (let i = 0; i < items.length; i += concurrency) {
    const batch = items.slice(i, i + concurrency);
    const batchResults = await Promise.all(batch.map(fn));
    results.push(...batchResults);
  }
  return results;
}

/**
 * Fetch and decode on-chain events from transaction logs
 */
export async function fetchAuditLogs(connection?: Connection): Promise<AuditLogEntry[]> {
  const conn = connection || getSolanaConnection();

  // 1. Fetch recent signatures for PROGRAM_ID (up to 50)
  const sigInfos = await conn.getSignaturesForAddress(PROGRAM_ID, { limit: 50 });
  if (sigInfos.length === 0) return [];

  // 2. Fetch full transactions in batches of 5
  const rawTxs = await mapConcurrent(sigInfos, 5, async (sigInfo) => {
    try {
      const tx = await conn.getTransaction(sigInfo.signature, {
        maxSupportedTransactionVersion: 0,
        commitment: "confirmed",
      });
      return { sigInfo, tx };
    } catch (e) {
      console.warn(`Failed to fetch tx ${sigInfo.signature}:`, e);
      return { sigInfo, tx: null };
    }
  });

  const entries: AuditLogEntry[] = [];

  for (const { sigInfo, tx } of rawTxs) {
    if (!tx || !tx.meta) continue;

    const success = tx.meta.err === null;
    const logMessages = tx.meta.logMessages || [];

    // Parse Anchor events from logs
    let parsedCount = 0;
    try {
      for (const event of eventParser.parseLogs(logMessages)) {
        const fields: Record<string, string> = {};
        if (event.data && typeof event.data === "object") {
          for (const [key, val] of Object.entries(event.data)) {
            if (val && typeof (val as any).toBase58 === "function") {
              fields[key] = (val as any).toBase58();
            } else if (val && typeof (val as any).toString === "function") {
              fields[key] = (val as any).toString();
            } else {
              fields[key] = String(val);
            }
          }
        }

        entries.push({
          signature: sigInfo.signature,
          slot: tx.slot,
          blockTime: tx.blockTime ?? null,
          eventName: event.name,
          fields,
          success,
        });
        parsedCount++;
      }
    } catch (parseErr) {
      console.warn("Event parser error on tx:", sigInfo.signature, parseErr);
    }

    // If transaction failed or has no parsed event, record transaction level entry
    if (parsedCount === 0) {
      if (!success) {
        entries.push({
          signature: sigInfo.signature,
          slot: tx.slot,
          blockTime: tx.blockTime ?? null,
          eventName: "FailedAttempt",
          fields: {},
          success: false,
        });
      }
    }
  }

  // Sort newest first by slot / blockTime descending
  entries.sort((a, b) => {
    const timeA = a.blockTime ?? 0;
    const timeB = b.blockTime ?? 0;
    if (timeA !== timeB) return timeB - timeA;
    return b.slot - a.slot;
  });

  return entries;
}

/**
 * Resolve known address to role name
 */
export function resolveAddress(
  addr: string,
  known: { issuer?: string; patient?: string; doctor?: string } = {}
): { label: string; isKnown: boolean } {
  if (known?.issuer && addr === known.issuer) return { label: "Issuer", isKnown: true };
  if (known?.patient && addr === known.patient) return { label: "Patient", isKnown: true };
  if (known?.doctor && addr === known.doctor) return { label: "Doctor", isKnown: true };
  return { label: formatShortAddress(addr, 6), isKnown: false };
}

/**
 * Format audit entry to plain sentence, category, and status
 */
export function formatAuditEntry(
  entry: AuditLogEntry,
  known: { issuer?: string; patient?: string; doctor?: string } = {}
): FormattedAuditEvent {
  let sentence = "";
  let category: "credentials" | "records" | "access" | "transactions" = "transactions";
  let status: "ok" | "warn" | "danger" = "ok";

  const doctorResolved = entry.fields.doctor ? resolveAddress(entry.fields.doctor, known) : null;
  const patientResolved = entry.fields.patient ? resolveAddress(entry.fields.patient, known) : null;

  switch (entry.eventName) {
    case "CredentialIssued": {
      category = "credentials";
      status = "ok";
      sentence = doctorResolved?.isKnown
        ? "Issuer verified a doctor"
        : `Issuer verified doctor ${doctorResolved?.label || ""}`.trim();
      break;
    }
    case "CredentialRevoked": {
      category = "credentials";
      status = "danger";
      sentence = doctorResolved?.isKnown
        ? "Issuer removed a doctor's verification"
        : `Issuer removed verification for doctor ${doctorResolved?.label || ""}`.trim();
      break;
    }
    case "RecordRegistered": {
      category = "records";
      status = "ok";
      sentence = "Patient registered a record";
      break;
    }
    case "AccessGranted": {
      category = "access";
      status = "ok";
      sentence = doctorResolved?.isKnown
        ? "Patient shared a record with Doctor"
        : `Patient shared a record with doctor ${doctorResolved?.label || ""}`.trim();
      break;
    }
    case "AccessRevoked": {
      category = "access";
      status = "danger";
      sentence = doctorResolved?.isKnown
        ? "Patient stopped sharing"
        : `Patient stopped sharing with doctor ${doctorResolved?.label || ""}`.trim();
      break;
    }
    case "RecordAccessed": {
      category = "access";
      status = "ok";
      sentence = "Doctor opened a record";
      break;
    }
    default: {
      category = "transactions";
      if (!entry.success) {
        status = "warn";
        sentence = "Failed attempt";
      } else {
        status = "ok";
        sentence = "Program call executed on Solana";
      }
      break;
    }
  }

  // Format UTC time strictly without locale
  let utcTime = "----";
  if (entry.blockTime) {
    const d = new Date(entry.blockTime * 1000);
    const yr = d.getUTCFullYear();
    const mo = String(d.getUTCMonth() + 1).padStart(2, "0");
    const da = String(d.getUTCDate()).padStart(2, "0");
    const hr = String(d.getUTCHours()).padStart(2, "0");
    const mn = String(d.getUTCMinutes()).padStart(2, "0");
    const sc = String(d.getUTCSeconds()).padStart(2, "0");
    utcTime = `${yr}-${mo}-${da} ${hr}:${mn}:${sc} UTC`;
  }

  return {
    ...entry,
    sentence,
    category,
    status,
    utcTime,
  };
}
