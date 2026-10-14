# SolHealth 5-Minute Live Demo Script

This document provides a structured, 5-minute walkthrough of SolHealth for evaluators, judges, and stakeholders.

---

## 1. Pre-Demo Checklist

Before starting the demo, ensure the following are prepared:
- [ ] **Validator / RPC Running**: Local validator running via `npm run demo:reset` or devnet configured.
- [ ] **Pinata JWT Configured**: Valid `PINATA_JWT` present in `app/.env.local`.
- [ ] **App Server Running**: `cd app && npm run dev` accessible at `http://localhost:3000`.
- [ ] **Demo Wallets Funded**: Click `[FUND WALLETS]` in the header banner so Issuer, Patient, and Doctor have SOL.
- [ ] **Browser Display**: Browser window set to 100% or 110% zoom, console open in split view if needed.
- [ ] **Backup Recording Ready**: Video recording and [docs/devnet.md](devnet.md) Explorer URLs open in a background tab as fallback.

---

## 2. Five-Minute Click Sequence & Talking Points

### Step 1: Fund Wallets & Environment
- **Role**: Header / Global
- **Click**: Click `[FUND WALLETS]` button in the top navigation bar.
- **Talking Point**: *"For this zero-friction demo, each role uses an in-browser keypair stored in localStorage. Funding requests airdrop or transfers SOL so all actors can sign on-chain transactions."*

### Step 2: Initialize Registry
- **Role**: `ISSUER` (Click `Issuer` in the role selector)
- **Click**: Click `[Set up registry]` button.
- **Talking Point**: *"The health authority initializes the root configuration PDA on Solana, establishing the trusted credential issuer for the ecosystem."*

### Step 3: Issue Doctor Credential
- **Role**: `ISSUER`
- **Click**: Enter doctor's public key (pre-filled by demo helper) and click `[Issue Credential]`.
- **Talking Point**: *"The authority issues a verifiable doctor credential stored in a Program Derived Address (PDA). Only doctors with active on-chain credentials can receive access grants."*

### Step 4: Encrypt and Upload Medical Record
- **Role**: `PATIENT` (Switch to `Patient` role)
- **Click**: Select a medical file (or click `Load Sample Lab Report`), then click `[Encrypt & Upload Record]`.
- **Talking Point**: *"The patient's browser generates an AES-256-GCM symmetric key to encrypt the record locally. The key is wrapped with the patient's public key using NaCl Box (Curve25519). Only ciphertext is sent to IPFS via Pinata, while the CID and SHA-256 integrity hash are registered on Solana."*

### Step 5: Grant Time-Limited Doctor Access
- **Role**: `PATIENT`
- **Click**: In the record card, select Doctor, specify validity (e.g., `1 Hour`), and click `[Grant Access]`.
- **Talking Point**: *"The patient re-wraps the AES key for the doctor's Curve25519 public key and publishes a time-bounded Access PDA on Solana. No central database holds decryption keys."*

### Step 6: Doctor Opens & Decrypts Record
- **Role**: `DOCTOR` (Switch to `Doctor` role)
- **Click**: In the 'Records Shared With You' section, click `[Open Record]`.
- **Talking Point**: *"The doctor's browser fetches the ciphertext from IPFS, un-wraps the AES symmetric key using their private key, and decrypts the document directly in memory. Plaintext never touches a server."*

### Step 7: Cryptographic Integrity Verification
- **Role**: `DOCTOR`
- **Click**: Click `[Verify Integrity]`. Observe the green **Verified Match** badge. Then toggle `[Test Tamper Detection]`.
- **Talking Point**: *"The browser computes the SHA-256 checksum of the downloaded file and compares it against the immutable hash stored on Solana. If even a single bit of the file is modified on IPFS, SolHealth flags a tamper mismatch."*

### Step 8: Revoke Sharing
- **Role**: `PATIENT` (Switch back to `Patient` role)
- **Click**: In the record card, click `[Stop Sharing]`.
- **Talking Point**: *"The patient revokes access on-chain immediately. The Access PDA's active flag is flipped to inactive with a permanent audit event."*

### Step 9: Doctor Access Denied
- **Role**: `DOCTOR` (Switch to `Doctor` role)
- **Click**: Click `[Open Record]` again.
- **Talking Point**: *"The Solana smart contract rejects the transaction with error code 6002 (`AccessRevoked`), demonstrating strict on-chain permission enforcement."*

### Step 10: Audit Timeline & Explorer Links
- **Role**: Global / Audit Page (Click `Audit Log` in the navigation)
- **Click**: View timeline of all signed events, click `[Export CSV]`, and click any `[Explorer ↗]` link.
- **Talking Point**: *"Every action—creation, credentialing, upload, grant, access, and revocation—produces an immutable on-chain event. Evaluators can verify every signature on Solana Explorer."*

---

## 3. What is Real vs Future Work Talking Points

### What is Implemented Today (Production-Ready Demo):
- Full Anchor smart contract deployed to Solana Devnet and local validator.
- Client-side WebCrypto (AES-256-GCM) + TweetNaCl key wrapping (X25519 / Ed25519).
- Encrypted IPFS pinning through a zero-knowledge relay route.
- On-chain time-bound access delegations, revocations, and expiry checks.
- Cryptographic SHA-256 tamper verification.
- Comprehensive audit timeline with CSV export and Explorer transaction links.

### Future Work (Not Claimed as Implemented):
- Zero-knowledge emergency access circuits (Circom/snarkjs with replay protection).
- Native wallet-app integration (Phantom, Solflare) with deterministic key-derivation schemes.
- ABDM (Ayushman Bharat Digital Mission) / FHIR conformance for healthcare data exchange.
- DPDP (Digital Personal Data Protection) statutory privacy assessment.
- Hardware Security Module (HSM) and redundant multi-cloud decentralized pinning.

---

## 4. Fallback Plan (If Live Network or Pinata Degrades)

1. **IPFS / Pinata Degradation**:
   - The application displays cached demo payload data and computes local SHA-256 comparisons.
   - Explain: *"Decentralized gateway timeouts can occur; the cryptographic hash verification on Solana remains intact."*
2. **Solana RPC Outage / Rate Limits**:
   - Immediately switch to local validator using `npm run demo:reset`.
   - Point evaluators to the verified Devnet deployment and transaction signatures in [docs/devnet.md](devnet.md) on Solana Explorer.
3. **Emergency Backup**:
   - Screen-share the pre-recorded 5-minute video walkthrough showing identical workflows with on-chain confirmation.
