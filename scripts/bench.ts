import fs from "fs";
import os from "os";
import path from "path";
import crypto from "crypto";
import {
  Keypair,
  Connection,
  PublicKey,
  LAMPORTS_PER_SOL,
  SystemProgram,
  Transaction,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
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
  getRecordPda,
  LOCALNET_RPC_URL,
} from "../app/lib/solana.ts";
import {
  encryptFile,
  sha256,
  wrapKeyFor,
} from "../app/lib/crypto.ts";

// Helper: Sleep
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Environment Configuration
const BENCH_RPC = process.env.BENCH_RPC || LOCALNET_RPC_URL;
const isDevnet = BENCH_RPC.toLowerCase().includes("devnet");
const BENCH_ITERATIONS = parseInt(
  process.env.BENCH_ITERATIONS || (isDevnet ? "10" : "20"),
  10
);
const BENCH_OUT =
  process.env.BENCH_OUT ||
  (isDevnet ? "./bench-results/devnet" : "./bench-results/local");

interface IterationResult {
  timestamp: string;
  run_id: number;
  operation: string;
  latency_ms: number;
  compute_units: number;
  fee_lamports: number;
  retries: number;
}

interface OperationSummary {
  operation: string;
  samples: number;
  mean_ms: number;
  p50_ms: number;
  p95_ms: number;
  max_ms: number;
  mean_cu: number;
  mean_fee_lamports: number;
  mean_fee_sol: number;
  failures: number;
  retries: number;
}

interface CryptoBenchResult {
  payload: string;
  sizeBytes: number;
  encrypt_ms: number;
  sha256_ms: number;
}

interface RentExemptResult {
  account: string;
  sizeBytes: number;
  rent_lamports: number;
  rent_sol: number;
}

function calculatePercentile(values: number[], p: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, Math.min(index, sorted.length - 1))];
}

function getExistingAuthorityKeypair(): Keypair | null {
  const defaultWalletPath = path.join(os.homedir(), ".config/solana/id.json");
  if (fs.existsSync(defaultWalletPath)) {
    try {
      const raw = JSON.parse(fs.readFileSync(defaultWalletPath, "utf-8"));
      return Keypair.fromSecretKey(new Uint8Array(raw));
    } catch {
      // ignore
    }
  }
  const localAuthPath = path.join(process.cwd(), "scripts/.authority.json");
  if (fs.existsSync(localAuthPath)) {
    try {
      const raw = JSON.parse(fs.readFileSync(localAuthPath, "utf-8"));
      return Keypair.fromSecretKey(new Uint8Array(raw));
    } catch {
      // ignore
    }
  }
  return null;
}

async function requestAirdropSafe(
  connection: Connection,
  pubkey: PublicKey,
  sol: number
): Promise<void> {
  try {
    const sig = await connection.requestAirdrop(pubkey, sol * LAMPORTS_PER_SOL);
    const blockhash = await connection.getLatestBlockhash("confirmed");
    await connection.confirmTransaction(
      {
        signature: sig,
        blockhash: blockhash.blockhash,
        lastValidBlockHeight: blockhash.lastValidBlockHeight,
      },
      "confirmed"
    );
  } catch (err: any) {
    console.warn(
      `  [!] Airdrop request for ${pubkey.toBase58().slice(0, 8)}: ${err.message}`
    );
  }
}

async function fundWalletIfNeeded(
  connection: Connection,
  funder: Keypair,
  recipient: PublicKey,
  neededSol = 0.5
): Promise<void> {
  const balance = await connection.getBalance(recipient, "confirmed");
  if (balance >= neededSol * LAMPORTS_PER_SOL) return;

  // If funder has sufficient balance, transfer directly (bypasses devnet airdrop limits)
  const funderBalance = await connection.getBalance(funder.publicKey, "confirmed");
  if (funderBalance >= (neededSol + 0.05) * LAMPORTS_PER_SOL) {
    console.log(`  Transferring ${neededSol} SOL from authority to ${recipient.toBase58().slice(0, 8)}...`);
    const tx = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: funder.publicKey,
        toPubkey: recipient,
        lamports: Math.round(neededSol * LAMPORTS_PER_SOL),
      })
    );
    await sendAndConfirmTransaction(connection, tx, [funder], {
      commitment: "confirmed",
    });
    return;
  }

  // Otherwise try direct airdrop
  await requestAirdropSafe(connection, recipient, neededSol);
  const updatedBalance = await connection.getBalance(recipient, "confirmed");
  if (updatedBalance >= neededSol * LAMPORTS_PER_SOL) return;

  console.error(
    `\n[ERROR] Insufficient balance for ${recipient.toBase58()} (${updatedBalance / LAMPORTS_PER_SOL} SOL < ${neededSol} SOL).`
  );
  console.error(`Please fund address ${recipient.toBase58()} using https://faucet.solana.com\n`);
  throw new Error(`Insufficient SOL balance for ${recipient.toBase58()}`);
}

async function executeWithRetry(
  opName: string,
  fn: () => Promise<string>,
  connection: Connection
): Promise<{
  signature: string;
  latency_ms: number;
  compute_units: number;
  fee_lamports: number;
  retries: number;
}> {
  // Pause 500ms (400-600ms range) between sequential transactions
  await sleep(500);

  const maxTries = 5;
  let retries = 0;
  let delay = 1000;

  for (let attempt = 0; attempt < maxTries; attempt++) {
    const t0 = performance.now();
    try {
      const sig = await fn();
      const latency = performance.now() - t0;

      // Poll transaction confirmation and metadata
      let txInfo = null;
      for (let poll = 0; poll < 6; poll++) {
        try {
          txInfo = await connection.getTransaction(sig, {
            commitment: "confirmed",
            maxSupportedTransactionVersion: 0,
          });
          if (txInfo) break;
        } catch {
          // ignore transient rpc polling errors
        }
        await sleep(500);
      }

      const computeUnits = txInfo?.meta?.computeUnitsConsumed ?? 0;
      const feeLamports = txInfo?.meta?.fee ?? 5000;

      return {
        signature: sig,
        latency_ms: latency,
        compute_units: computeUnits,
        fee_lamports: feeLamports,
        retries,
      };
    } catch (err: any) {
      const msg = err?.message || String(err);
      const isRetryable =
        msg.includes("429") ||
        msg.includes("Too Many Requests") ||
        msg.includes("rate limit") ||
        msg.includes("timed out") ||
        msg.includes("timeout") ||
        msg.includes("Blockhash not found") ||
        msg.includes("Transaction simulation failed") ||
        msg.includes("Node is behind") ||
        msg.includes("failed to get confirmed block") ||
        msg.includes("fetch failed");

      if (attempt < maxTries - 1 && isRetryable) {
        retries++;
        console.warn(`    [Retry ${retries}/${maxTries - 1}] ${opName}: ${msg.slice(0, 80)}. Retrying in ${delay}ms...`);
        await sleep(delay);
        delay *= 2; // exponential backoff
      } else {
        throw err;
      }
    }
  }
  throw new Error(`${opName} failed after ${maxTries} attempts`);
}

function generateSvgBarChart(
  title: string,
  categories: string[],
  series: { label: string; color: string; values: number[] }[],
  unit: string,
  height = 240
): string {
  const width = 680;
  const margin = { top: 30, right: 20, bottom: 40, left: 70 };
  const chartWidth = width - margin.left - margin.right;
  const chartHeight = height - margin.top - margin.bottom;

  let maxVal = 0;
  for (const s of series) {
    for (const v of s.values) {
      if (v > maxVal) maxVal = v;
    }
  }
  if (maxVal === 0) maxVal = 1;
  const yMax = Math.ceil(maxVal * 1.15);

  const groupWidth = chartWidth / categories.length;
  const barWidth = Math.min(36, (groupWidth * 0.75) / series.length);

  let gridLines = "";
  const yTicks = 4;
  for (let i = 0; i <= yTicks; i++) {
    const yVal = (yMax / yTicks) * i;
    const yPos = margin.top + chartHeight - (i / yTicks) * chartHeight;
    gridLines += `
      <line x1="${margin.left}" y1="${yPos}" x2="${width - margin.right}" y2="${yPos}" stroke="#e2e8f0" stroke-dasharray="3,3" />
      <text x="${margin.left - 8}" y="${yPos + 4}" font-size="10" fill="#64748b" text-anchor="end" font-family="monospace">${yVal.toLocaleString(undefined, { maximumFractionDigits: 1 })}</text>
    `;
  }

  let bars = "";
  categories.forEach((cat, cIdx) => {
    const groupX = margin.left + cIdx * groupWidth + (groupWidth - series.length * barWidth) / 2;
    series.forEach((s, sIdx) => {
      const val = s.values[cIdx];
      const barH = (val / yMax) * chartHeight;
      const x = groupX + sIdx * barWidth;
      const y = margin.top + chartHeight - barH;
      bars += `
        <rect x="${x}" y="${y}" width="${barWidth - 4}" height="${barH}" fill="${s.color}" rx="3" stroke="#000" stroke-width="1.2" />
        <title>${cat} - ${s.label}: ${val.toFixed(2)} ${unit}</title>
      `;
    });
    // Category label
    const labelX = margin.left + cIdx * groupWidth + groupWidth / 2;
    bars += `
      <text x="${labelX}" y="${height - margin.bottom + 18}" font-size="11" font-weight="600" fill="#334155" text-anchor="middle" font-family="system-ui, sans-serif">${cat}</text>
    `;
  });

  let legend = "";
  let legendX = margin.left;
  series.forEach((s) => {
    legend += `
      <rect x="${legendX}" y="10" width="12" height="12" rx="2" fill="${s.color}" stroke="#000" stroke-width="1" />
      <text x="${legendX + 16}" y="20" font-size="11" font-weight="500" fill="#334155" font-family="system-ui, sans-serif">${s.label}</text>
    `;
    legendX += s.label.length * 8 + 40;
  });

  return `
    <div style="background: #ffffff; border: 2px solid #000000; border-radius: 12px; padding: 20px; box-shadow: 4px 4px 0px 0px rgba(0,0,0,0.85); margin-bottom: 24px;">
      <h3 style="margin: 0 0 12px 0; font-size: 15px; font-weight: 700; color: #0f172a; text-transform: uppercase; letter-spacing: 0.04em;">${title} (${unit})</h3>
      <svg viewBox="0 0 ${width} ${height}" style="width: 100%; height: auto; max-width: ${width}px; display: block; overflow: visible;">
        ${legend}
        ${gridLines}
        ${bars}
      </svg>
    </div>
  `;
}

function generateHtmlReport(
  network: string,
  timestamp: string,
  iterations: number,
  opSummaries: OperationSummary[],
  cryptoResults: CryptoBenchResult[],
  rentResults: RentExemptResult[]
): string {
  const operations = opSummaries.map((o) => o.operation);
  
  // Latency Chart
  const latencyChartSvg = generateSvgBarChart(
    "Solana Transaction Latency by Operation",
    operations,
    [
      { label: "p50 ms", color: "#60a5fa", values: opSummaries.map((o) => o.p50_ms) },
      { label: "p95 ms", color: "#f59e0b", values: opSummaries.map((o) => o.p95_ms) },
      { label: "max ms", color: "#f87171", values: opSummaries.map((o) => o.max_ms) },
    ],
    "ms",
    250
  );

  // Compute Units Chart
  const cuChartSvg = generateSvgBarChart(
    "Mean Compute Units Consumed",
    operations,
    [
      { label: "Mean CU", color: "#34d399", values: opSummaries.map((o) => o.mean_cu) },
    ],
    "CU",
    220
  );

  // Crypto Chart
  const cryptoChartSvg = generateSvgBarChart(
    "Client-Side Cryptography Latency",
    cryptoResults.map((c) => c.payload),
    [
      { label: "AES-256-GCM Encrypt", color: "#fbbf24", values: cryptoResults.map((c) => c.encrypt_ms) },
      { label: "SHA-256 Hash", color: "#a78bfa", values: cryptoResults.map((c) => c.sha256_ms) },
    ],
    "ms",
    220
  );

  const txRows = opSummaries
    .map(
      (o) => `
    <tr>
      <td style="padding: 10px 14px; font-weight: 600; font-family: monospace;">${o.operation}</td>
      <td style="padding: 10px 14px; text-align: center;">${o.samples}</td>
      <td style="padding: 10px 14px; text-align: right; font-family: monospace;">${o.p50_ms.toFixed(2)} ms</td>
      <td style="padding: 10px 14px; text-align: right; font-family: monospace;">${o.p95_ms.toFixed(2)} ms</td>
      <td style="padding: 10px 14px; text-align: right; font-family: monospace;">${o.max_ms.toFixed(2)} ms</td>
      <td style="padding: 10px 14px; text-align: right; font-family: monospace;">${o.mean_cu.toLocaleString()}</td>
      <td style="padding: 10px 14px; text-align: right; font-family: monospace;">${o.mean_fee_sol.toFixed(8)} SOL</td>
    </tr>`
    )
    .join("\n");

  const cryptoRows = cryptoResults
    .map(
      (c) => `
    <tr>
      <td style="padding: 10px 14px; font-weight: 600;">${c.payload} (${(c.sizeBytes / 1024).toLocaleString()} KB)</td>
      <td style="padding: 10px 14px; text-align: right; font-family: monospace;">${c.encrypt_ms.toFixed(2)} ms</td>
      <td style="padding: 10px 14px; text-align: right; font-family: monospace;">${c.sha256_ms.toFixed(2)} ms</td>
    </tr>`
    )
    .join("\n");

  const rentRows = rentResults
    .map(
      (r) => `
    <tr>
      <td style="padding: 10px 14px; font-weight: 600;">${r.account}</td>
      <td style="padding: 10px 14px; text-align: center; font-family: monospace;">${r.sizeBytes} B</td>
      <td style="padding: 10px 14px; text-align: right; font-family: monospace;">${r.rent_lamports.toLocaleString()} lamports</td>
      <td style="padding: 10px 14px; text-align: right; font-family: monospace;">${r.rent_sol.toFixed(6)} SOL</td>
    </tr>`
    )
    .join("\n");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SolHealth Benchmark Report</title>
  <style>
    body {
      margin: 0;
      padding: 32px 20px;
      background: #fbf8ee;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      color: #1c1917;
    }
    .container {
      max-width: 900px;
      margin: 0 auto;
    }
    .header {
      background: #ffffff;
      border: 2px solid #000000;
      border-radius: 14px;
      padding: 24px;
      box-shadow: 4px 4px 0px 0px rgba(0,0,0,0.85);
      margin-bottom: 24px;
    }
    .badge {
      display: inline-block;
      padding: 4px 10px;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      border-radius: 9999px;
      border: 1.5px solid #000000;
      background: #fef08a;
      margin-right: 8px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;
      margin-top: 8px;
    }
    th {
      background: #f8fafc;
      border-bottom: 2px solid #000000;
      padding: 10px 14px;
      text-align: left;
      font-weight: 700;
      text-transform: uppercase;
      font-size: 11px;
      letter-spacing: 0.05em;
      color: #475569;
    }
    tr:nth-child(even) {
      background: #f8fafc;
    }
    tr {
      border-bottom: 1px solid #e2e8f0;
    }
    .card {
      background: #ffffff;
      border: 2px solid #000000;
      border-radius: 12px;
      padding: 20px;
      box-shadow: 4px 4px 0px 0px rgba(0,0,0,0.85);
      margin-bottom: 24px;
      overflow-x: auto;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;">
        <div>
          <span class="badge">Benchmark Report</span>
          <span class="badge" style="background: #e0e7ff;">${iterations} Iterations</span>
          <h1 style="margin: 10px 0 4px 0; font-size: 26px; font-weight: 800; letter-spacing: -0.02em;">SolHealth Performance Benchmark</h1>
          <p style="margin: 0; font-size: 13px; color: #64748b; font-family: monospace;">Network: ${network} | Date: ${timestamp}</p>
        </div>
      </div>
    </div>

    ${latencyChartSvg}
    ${cuChartSvg}
    ${cryptoChartSvg}

    <div class="card">
      <h3 style="margin: 0 0 12px 0; font-size: 15px; font-weight: 700; color: #0f172a; text-transform: uppercase;">Table 1: Solana On-Chain Transactions</h3>
      <table>
        <thead>
          <tr>
            <th>Operation</th>
            <th style="text-align: center;">Samples</th>
            <th style="text-align: right;">p50 ms</th>
            <th style="text-align: right;">p95 ms</th>
            <th style="text-align: right;">max ms</th>
            <th style="text-align: right;">Mean CU</th>
            <th style="text-align: right;">Mean Fee SOL</th>
          </tr>
        </thead>
        <tbody>
          ${txRows}
        </tbody>
      </table>
    </div>

    <div class="card">
      <h3 style="margin: 0 0 12px 0; font-size: 15px; font-weight: 700; color: #0f172a; text-transform: uppercase;">Table 2: Client-Side Cryptography (Browser-Safe WebCrypto)</h3>
      <table>
        <thead>
          <tr>
            <th>Payload</th>
            <th style="text-align: right;">AES-256-GCM Encrypt ms</th>
            <th style="text-align: right;">SHA-256 ms</th>
          </tr>
        </thead>
        <tbody>
          ${cryptoRows}
        </tbody>
      </table>
    </div>

    <div class="card">
      <h3 style="margin: 0 0 12px 0; font-size: 15px; font-weight: 700; color: #0f172a; text-transform: uppercase;">Table 3: Account Space & Rent-Exempt Deposits</h3>
      <table>
        <thead>
          <tr>
            <th>Account</th>
            <th style="text-align: center;">Size (InitSpace)</th>
            <th style="text-align: right;">Rent Lamports</th>
            <th style="text-align: right;">Rent-Exempt Deposit SOL</th>
          </tr>
        </thead>
        <tbody>
          ${rentRows}
        </tbody>
      </table>
    </div>
  </div>
</body>
</html>`;
}

function padRight(str: string, len: number): string {
  return str.length >= len ? str : str + " ".repeat(len - str.length);
}

function padLeft(str: string, len: number): string {
  return str.length >= len ? str : " ".repeat(len - str.length) + str;
}

function printAsciiTable(
  headers: string[],
  rows: string[][],
  alignments: ("left" | "right")[]
): void {
  const colWidths = headers.map((h, i) => {
    let max = h.length;
    for (const r of rows) {
      if (r[i] && r[i].length > max) max = r[i].length;
    }
    return max + 2;
  });

  const separator =
    "+" + colWidths.map((w) => "-".repeat(w)).join("+") + "+";

  console.log(separator);
  const headerLine =
    "|" +
    headers
      .map((h, i) =>
        alignments[i] === "right"
          ? padLeft(" " + h + " ", colWidths[i])
          : padRight(" " + h + " ", colWidths[i])
      )
      .join("|") +
    "|";
  console.log(headerLine);
  console.log(separator);

  for (const row of rows) {
    const line =
      "|" +
      row
        .map((cell, i) =>
          alignments[i] === "right"
            ? padLeft(" " + cell + " ", colWidths[i])
            : padRight(" " + cell + " ", colWidths[i])
        )
        .join("|") +
      "|";
    console.log(line);
  }
  console.log(separator);
}

async function runBenchmark(): Promise<void> {
  console.log("==================================================");
  console.log("            SOLHEALTH BENCHMARK SUITE             ");
  console.log("==================================================");
  console.log(`RPC Endpoint: ${BENCH_RPC}`);
  console.log(`Iterations:   ${BENCH_ITERATIONS}`);
  console.log(`Output Dir:   ${BENCH_OUT}`);
  console.log("--------------------------------------------------\n");

  const connection = new Connection(BENCH_RPC, "confirmed");

  // Step 1: Set up authority, patient, and doctor
  console.log("1. Setting up benchmark accounts...");
  let authority = getExistingAuthorityKeypair();
  const existingConfig = await getConfig(connection);

  if (existingConfig) {
    if (authority && authority.publicKey.equals(existingConfig.authority)) {
      console.log(`✓ Loaded existing config authority: ${authority.publicKey.toBase58()}`);
    } else {
      console.log(`ℹ Config exists on-chain with authority: ${existingConfig.authority.toBase58()}`);
      if (!authority) {
        authority = Keypair.generate();
      }
    }
  } else {
    if (!authority) {
      authority = Keypair.generate();
    }
    console.log(`Initializing config with authority: ${authority.publicKey.toBase58()}...`);
    await fundWalletIfNeeded(connection, authority, authority.publicKey, isDevnet ? 0.5 : 2);
    await initConfig(authority, connection);
    console.log("✓ Config initialized on-chain");
  }

  const patient = Keypair.generate();
  const doctor = Keypair.generate();

  console.log("Funding patient and doctor wallets...");
  await fundWalletIfNeeded(connection, authority, patient.publicKey, isDevnet ? 0.3 : 1);
  await fundWalletIfNeeded(connection, authority, doctor.publicKey, isDevnet ? 0.1 : 0.5);
  console.log("✓ Wallets funded");

  // Verify / issue doctor credential
  const cred = await getCredential(doctor.publicKey, connection);
  if (!cred || !cred.active) {
    console.log("Issuing doctor credential...");
    await issueCredential(authority, doctor.publicKey, connection);
    console.log("✓ Doctor credential issued");
  } else {
    console.log("✓ Doctor credential is active");
  }

  // Step 2: Payload setup for on-chain tests
  const sampleData = new TextEncoder().encode(
    "SolHealth Benchmark Medical Record Payload - Confidential Health Assessment"
  );
  const { cipher, rawKey } = await encryptFile(sampleData);
  const fileHash = await sha256(cipher);
  const patientWrappedKey = wrapKeyFor(patient.publicKey, rawKey);
  const doctorWrappedKey = wrapKeyFor(doctor.publicKey, rawKey);

  // Step 3: Run transactions benchmark loop
  console.log(`\n2. Running ${BENCH_ITERATIONS} iterations of on-chain operations...`);
  const results: IterationResult[] = [];
  const baseRecordId = Date.now();

  for (let i = 1; i <= BENCH_ITERATIONS; i++) {
    const recordId = new BN(baseRecordId + i);
    const cid = `QmBench${i}${Buffer.from(fileHash).toString("hex").slice(0, 32)}`;
    const [recordPda] = getRecordPda(patient.publicKey, recordId);

    // Operation 1: register_record
    const resReg = await executeWithRetry(
      "register_record",
      () =>
        registerRecord(
          patient,
          recordId,
          cid,
          fileHash,
          patientWrappedKey,
          connection
        ),
      connection
    );
    results.push({
      timestamp: new Date().toISOString(),
      run_id: i,
      operation: "register_record",
      latency_ms: resReg.latency_ms,
      compute_units: resReg.compute_units,
      fee_lamports: resReg.fee_lamports,
      retries: resReg.retries,
    });

    // Operation 2: grant_access
    const duration = new BN(3600);
    const resGrant = await executeWithRetry(
      "grant_access",
      () =>
        grantAccess(
          patient,
          recordPda,
          doctor.publicKey,
          duration,
          doctorWrappedKey,
          connection
        ),
      connection
    );
    results.push({
      timestamp: new Date().toISOString(),
      run_id: i,
      operation: "grant_access",
      latency_ms: resGrant.latency_ms,
      compute_units: resGrant.compute_units,
      fee_lamports: resGrant.fee_lamports,
      retries: resGrant.retries,
    });

    // Operation 3: access_record
    const resAccess = await executeWithRetry(
      "access_record",
      () => accessRecord(doctor, recordPda, connection),
      connection
    );
    results.push({
      timestamp: new Date().toISOString(),
      run_id: i,
      operation: "access_record",
      latency_ms: resAccess.latency_ms,
      compute_units: resAccess.compute_units,
      fee_lamports: resAccess.fee_lamports,
      retries: resAccess.retries,
    });

    // Operation 4: revoke_access
    const resRevoke = await executeWithRetry(
      "revoke_access",
      () =>
        revokeAccess(
          patient,
          recordPda,
          doctor.publicKey,
          connection
        ),
      connection
    );
    results.push({
      timestamp: new Date().toISOString(),
      run_id: i,
      operation: "revoke_access",
      latency_ms: resRevoke.latency_ms,
      compute_units: resRevoke.compute_units,
      fee_lamports: resRevoke.fee_lamports,
      retries: resRevoke.retries,
    });

    const iterRetries =
      resReg.retries + resGrant.retries + resAccess.retries + resRevoke.retries;
    console.log(
      `  Iteration ${i}/${BENCH_ITERATIONS}: reg=${resReg.latency_ms.toFixed(0)}ms grant=${resGrant.latency_ms.toFixed(0)}ms access=${resAccess.latency_ms.toFixed(0)}ms revoke=${resRevoke.latency_ms.toFixed(0)}ms (retries=${iterRetries})`
    );
  }
  console.log(`\n✓ All ${BENCH_ITERATIONS} iterations finished successfully.\n`);

  // Step 4: Compute Aggregated Statistics
  const operations = ["register_record", "grant_access", "access_record", "revoke_access"];
  const opSummaries: OperationSummary[] = operations.map((op) => {
    const opResults = results.filter((r) => r.operation === op);
    const latencies = opResults.map((r) => r.latency_ms);
    const cus = opResults.map((r) => r.compute_units);
    const fees = opResults.map((r) => r.fee_lamports);
    const totalRetries = opResults.reduce((sum, r) => sum + (r.retries || 0), 0);

    const meanLatency =
      latencies.length > 0
        ? latencies.reduce((a, b) => a + b, 0) / latencies.length
        : 0;
    const meanCu =
      cus.length > 0 ? Math.round(cus.reduce((a, b) => a + b, 0) / cus.length) : 0;
    const meanFeeLamports =
      fees.length > 0
        ? Math.round(fees.reduce((a, b) => a + b, 0) / fees.length)
        : 5000;

    return {
      operation: op,
      samples: opResults.length,
      mean_ms: meanLatency,
      p50_ms: calculatePercentile(latencies, 50),
      p95_ms: calculatePercentile(latencies, 95),
      max_ms: latencies.length > 0 ? Math.max(...latencies) : 0,
      mean_cu: meanCu,
      mean_fee_lamports: meanFeeLamports,
      mean_fee_sol: meanFeeLamports / LAMPORTS_PER_SOL,
      failures: 0,
      retries: totalRetries,
    };
  });

  // Step 5: Rent-Exempt Balance Calculation
  console.log("3. Measuring Rent-Exempt Account Deposits...");
  const rentAccounts = [
    { account: "Record", sizeBytes: 289 },
    { account: "Access", sizeBytes: 214 },
    { account: "Credential", sizeBytes: 82 },
  ];
  const rentResults: RentExemptResult[] = [];
  for (const acc of rentAccounts) {
    const rentLamports = await connection.getMinimumBalanceForRentExemption(acc.sizeBytes);
    rentResults.push({
      account: acc.account,
      sizeBytes: acc.sizeBytes,
      rent_lamports: rentLamports,
      rent_sol: rentLamports / LAMPORTS_PER_SOL,
    });
  }
  console.log("✓ Rent-exempt deposits measured");

  // Step 6: Client-Side Crypto Benchmark
  console.log("4. Running Client-Side Cryptography Benchmark...");
  const cryptoPayloads = [
    { label: "100KB", size: 100 * 1024 },
    { label: "1MB", size: 1024 * 1024 },
    { label: "5MB", size: 5 * 1024 * 1024 },
  ];
  const cryptoResults: CryptoBenchResult[] = [];

  for (const item of cryptoPayloads) {
    const data = crypto.randomBytes(item.size);
    // Warm-up
    await encryptFile(data.subarray(0, 1024));

    const t0 = performance.now();
    const { cipher: encrypted } = await encryptFile(data);
    const encTime = performance.now() - t0;

    const t1 = performance.now();
    await sha256(encrypted);
    const shaTime = performance.now() - t1;

    cryptoResults.push({
      payload: item.label,
      sizeBytes: item.size,
      encrypt_ms: encTime,
      sha256_ms: shaTime,
    });
  }
  console.log("✓ Cryptography benchmarks completed\n");

  // Step 7: Print ASCII Tables
  console.log("Table 1: Solana transactions");
  printAsciiTable(
    [
      "Operation",
      "Samples",
      "Mean ms",
      "p50 ms",
      "p95 ms",
      "max ms",
      "Mean CU",
      "Mean Fee SOL",
      "Retries",
    ],
    opSummaries.map((s) => [
      s.operation,
      s.samples.toString(),
      s.mean_ms.toFixed(2),
      s.p50_ms.toFixed(2),
      s.p95_ms.toFixed(2),
      s.max_ms.toFixed(2),
      s.mean_cu.toLocaleString(),
      s.mean_fee_sol.toFixed(8),
      s.retries.toString(),
    ]),
    ["left", "right", "right", "right", "right", "right", "right", "right", "right"]
  );

  console.log("\nTable 2: Client-side crypto");
  printAsciiTable(
    ["Payload", "Encrypt ms", "SHA-256 ms"],
    cryptoResults.map((c) => [
      c.payload,
      c.encrypt_ms.toFixed(2),
      c.sha256_ms.toFixed(2),
    ]),
    ["left", "right", "right"]
  );

  console.log("\nRent-Exempt Account Deposits:");
  printAsciiTable(
    ["Account", "Size (bytes)", "Rent Lamports", "Rent Deposit SOL"],
    rentResults.map((r) => [
      r.account,
      r.sizeBytes.toString(),
      r.rent_lamports.toLocaleString(),
      r.rent_sol.toFixed(6),
    ]),
    ["left", "right", "right", "right"]
  );

  // Step 8: Write Output Files
  if (!fs.existsSync(BENCH_OUT)) {
    fs.mkdirSync(BENCH_OUT, { recursive: true });
  }

  // results.csv
  const resultsCsvHeader =
    "timestamp,run_id,operation,latency_ms,compute_units,fee_lamports,retries\n";
  const resultsCsvRows = results
    .map(
      (r) =>
        `${r.timestamp},${r.run_id},${r.operation},${r.latency_ms.toFixed(2)},${r.compute_units},${r.fee_lamports},${r.retries}`
    )
    .join("\n");
  fs.writeFileSync(path.join(BENCH_OUT, "results.csv"), resultsCsvHeader + resultsCsvRows);

  // summary.csv
  const summaryCsvHeader =
    "operation,samples,mean_ms,p50_ms,p95_ms,max_ms,mean_cu,mean_fee_lamports,mean_fee_sol,failures,retries\n";
  const summaryCsvRows = opSummaries
    .map(
      (s) =>
        `${s.operation},${s.samples},${s.mean_ms.toFixed(2)},${s.p50_ms.toFixed(2)},${s.p95_ms.toFixed(2)},${s.max_ms.toFixed(2)},${s.mean_cu},${s.mean_fee_lamports},${s.mean_fee_sol.toFixed(8)},${s.failures},${s.retries}`
    )
    .join("\n");

  const rentCsv =
    "\n# Rent-Exempt Deposits\naccount,size_bytes,rent_lamports,rent_sol\n" +
    rentResults
      .map(
        (r) =>
          `${r.account},${r.sizeBytes},${r.rent_lamports},${r.rent_sol.toFixed(6)}`
      )
      .join("\n");

  const cryptoCsv =
    "\n# Client-Side Crypto\npayload,encrypt_ms,sha256_ms\n" +
    cryptoResults
      .map((c) => `${c.payload},${c.encrypt_ms.toFixed(2)},${c.sha256_ms.toFixed(2)}`)
      .join("\n");

  fs.writeFileSync(
    path.join(BENCH_OUT, "summary.csv"),
    summaryCsvHeader + summaryCsvRows + "\n" + rentCsv + "\n" + cryptoCsv
  );

  // chart.html
  const htmlContent = generateHtmlReport(
    BENCH_RPC,
    new Date().toISOString(),
    BENCH_ITERATIONS,
    opSummaries,
    cryptoResults,
    rentResults
  );
  fs.writeFileSync(path.join(BENCH_OUT, "chart.html"), htmlContent);

  console.log(`\nBenchmark artifacts saved to ${BENCH_OUT}:`);
  console.log(`  - ${path.join(BENCH_OUT, "results.csv")}`);
  console.log(`  - ${path.join(BENCH_OUT, "summary.csv")}`);
  console.log(`  - ${path.join(BENCH_OUT, "chart.html")}\n`);
}

runBenchmark().catch((err) => {
  console.error("Benchmark failed with error:", err);
  process.exit(1);
});
