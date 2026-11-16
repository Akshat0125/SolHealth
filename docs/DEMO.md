# SolHealth 5-Minute Live Demo Walkthrough

This document provides a structured, 5-minute walkthrough of SolHealth for evaluators, judges, and stakeholders using real Solana wallets (Phantom, Solflare, etc.) or demo mode.

---

## 1. Pre-Demo Checklist

Before starting the live demo, ensure the following:
- [ ] **Network Selection**: Solana Devnet configured in `.env.local` (`NEXT_PUBLIC_CLUSTER=devnet`) or local validator running via `npm run demo:reset`.
- [ ] **Pinata JWT Configured**: Valid `PINATA_JWT` present in `.env.local` (server-side only) or using the local CID fallback.
- [ ] **Application Running**: `cd app && npm run dev` accessible at `http://localhost:3000`.
- [ ] **Wallets Ready**:
  - Three distinct browser wallets or browser profiles:
    1. **Publisher**: Authority wallet (`H78HSR4qRGP3wUzimjfrSXgvjULejDtCUc7r8FEBQjW` on Devnet).
    2. **Doctor**: Verified medical practitioner wallet.
    3. **Patient**: Record owner wallet.
  - Phantom set to **Developer / Testnet Mode** and connected to **Solana Devnet**.
  - All three wallets funded with test SOL from the Solana faucet (`https://faucet.solana.com`) or via the navbar dropdown ("Get Devnet SOL").
- [ ] **Optional Demo Mode**: When running without browser extensions, check "Use demo identities" on the Home page to simulate all three roles with deterministic in-browser keypairs.

---

## 2. Five-Minute Click Sequence & Talking Points

### Step 1: Connect Wallet & Encryption Session
- **Actor**: Any role / Patient
- **Action**: Click **Connect Wallet** in the top-right header or on the Home page. Choose **Phantom** or **Solflare** from the custom glass wallet modal.
- **Wallet Popup**: Wallet asks to connect to `SolHealth`. Approve the connection.
- **Talking Point**: *"SolHealth integrates directly with the Solana Wallet Standard. Real wallets never expose secret keys, so SolHealth uses a deterministic off-chain message signature to derive an in-memory X25519 encryption keypair."*

### Step 2: Initialize Registry
- **Actor**: `PUBLISHER` (Connect authority wallet)
- **Action**: Navigate to `/publisher`. If uninitialized, click **Initialize Registry**.
- **Wallet Popup**: Approve the `initialize_config` transaction.
- **Talking Point**: *"The health authority creates the root on-chain `Config` PDA on Solana, establishing the trusted credential issuer for the ecosystem."*

### Step 3: Issue Doctor Credential
- **Actor**: `PUBLISHER`
- **Action**: In `/publisher`, enter the Doctor's public key (or click "Use demo doctor") and click **Verify doctor**.
- **Wallet Popup**: Approve the `issue_credential` transaction.
- **Talking Point**: *"The Publisher issues a verifiable doctor credential stored as a Program Derived Address (PDA). Only doctors with active on-chain credentials can receive access grants."*

### Step 4: Patient Activates Encryption & Uploads Record
- **Actor**: `PATIENT` (Connect patient wallet)
- **Action**: Navigate to `/patient`. Click **Activate encryption session**.
- **Wallet Popup 1**: Approve signing the canonical `ENCRYPTION_MESSAGE`. SolHealth registers the patient's X25519 public key on Solana with `register_encryption_key`.
- **Action**: Select a medical report (up to 4 MB) and click **Encrypt and upload**.
- **Wallet Popup 2**: Approve the `register_record` transaction.
- **Talking Point**: *"The patient's browser encrypts the file in memory with AES-256-GCM. The raw AES key is wrapped for the patient's X25519 public key using NaCl Box. Only ciphertext is sent to IPFS via Pinata. The IPFS CID and SHA-256 integrity hash are permanently recorded on Solana."*

### Step 5: Grant Time-Limited Doctor Access
- **Actor**: `PATIENT`
- **Action**: On the record card in `/patient`, click **Share**. Enter the Doctor's wallet address, choose a validity period (e.g., `1 hour`), and click **Share this record**.
- **Preflight**: SolHealth checks on-chain that the doctor has published an `EncryptionKey`. The browser unwraps the AES key from memory and re-wraps it for the doctor's published X25519 public key.
- **Wallet Popup**: Approve the `grant_access` transaction.
- **Talking Point**: *"The patient creates an on-chain Access PDA containing the expiration timestamp and doctor-specific wrapped key. No centralized key server exists."*

### Step 6: Doctor Opens & Decrypts Record
- **Actor**: `DOCTOR` (Connect doctor wallet)
- **Action**: Navigate to `/doctor`. Click **Activate encryption session** (one-time message signature).
- **Action**: Under 'Records shared with you', click **Open record**.
- **Wallet Popup**: Approve the on-chain `access_record` transaction.
- **Talking Point**: *"The doctor's browser fetches the ciphertext from IPFS, calls the Anchor contract to verify active credentials and grant validity, unwraps the AES key using the doctor's in-memory X25519 secret, and renders the decrypted report in memory."*

### Step 7: Cryptographic Tamper Verification
- **Actor**: `PATIENT` or `DOCTOR`
- **Action**: Click **Check integrity** on the record card.
- **Result**: The UI shows a 3-row verification panel:
  1. **Original**: SHA-256 hash matches the on-chain registered hash.
  2. **Altered**: Flipping a single bit in the ciphertext produces an immediate hash mismatch.
  3. **Decryption**: AES-256-GCM authentication tag rejects altered ciphertext with an authentication error; original ciphertext decrypts cleanly.
- **Talking Point**: *"This proves tamper evidence: decentralized storage nodes or intermediaries cannot modify patient records without cryptographic detection."*

### Step 8: Revoke Access
- **Actor**: `PATIENT`
- **Action**: Under 'Who has access', click **Stop sharing** and confirm.
- **Wallet Popup**: Approve the `revoke_access` transaction.
- **Talking Point**: *"The patient revokes access instantly on-chain, flipping the Access PDA status to revoked."*

### Step 9: Verify Doctor Access Denied
- **Actor**: `DOCTOR`
- **Action**: On `/doctor`, click **Open record** again.
- **Result**: Contract transaction rejects with error `6002: AccessRevoked`.
- **Talking Point**: *"The Solana smart contract strictly enforces access permissions. Revoked or expired grants cannot execute `access_record`."*

### Step 10: Audit Log & Explorer Verification
- **Actor**: Global
- **Action**: Navigate to `/audit`. View real-time decoded Anchor event logs (`CredentialIssued`, `EncryptionKeyRegistered`, `RecordRegistered`, `AccessGranted`, `RecordAccessed`, `AccessRevoked`).
- **Action**: Click **Export CSV** and click any **Explorer ↗** link.
- **Talking Point**: *"Every permission grant and document interaction produces an immutable on-chain event. Anyone can audit compliance on Solana Explorer."*

---

## 3. Real Implementation vs Boundaries

### What is Fully Implemented:
- Standard Solana browser wallet connectivity (Phantom, Solflare, Backpack) via `@solana/wallet-adapter`.
- Deterministic client-side X25519 encryption key derivation from standard wallet message signatures.
- Client-side WebCrypto (AES-256-GCM) + TweetNaCl Box (X25519) key encapsulation.
- Server-side IPFS pinning relay with 4 MB payload enforcement, rate limiting, and kill-switch.
- Smart contract role enforcement, time-bounded grants, expiry, and instant revocation.
- Cryptographic SHA-256 tamper verification and authentication tag enforcement.
- Live audit event timeline with CSV export and Explorer links.

### Technical Boundaries & Design Constraints:
- **Message Signing Requirement**: Wallets must support `signMessage` (supported by all major Solana wallets).
- **Canonical Message**: The `ENCRYPTION_MESSAGE` text must never change, as changing the message changes the derived keys.
- **Decrypted Data Boundary**: Revoking access prevents future key retrieval and transaction execution; it cannot retroactively erase files that a recipient already downloaded or screenshotted.
- **Public Metadata**: While payloads and symmetric keys are encrypted, account PDAs and wallet public keys remain visible on the Solana ledger.
