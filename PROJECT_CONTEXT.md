# SolHealth Project Context

## Overview
**SolHealth** is a patient-sovereign confidential medical vault prototype running on **Solana Devnet**. It is designed for high-profile individuals (VVIPs, executives, public figures), defence and service personnel, and government or public officials—people for whom a leaked medical history poses a security, reputational, or operational risk.

> **Prototype Disclaimer:** Prototype running on Solana Devnet. Test network, no real money. Do not upload real medical data. Not certified for regulated or classified data (no HIPAA, FIPS, or ISO claims).

## Core Architecture
1. **Deterministic Key Derivation:** Connecting a Solana wallet signs a canonical off-chain challenge in memory (`ENCRYPTION_MESSAGE`), deriving an X25519 encryption keypair client-side. Private keys and seed phrases never leave browser memory.
2. **Client-Side Encryption:** Files (up to 4 MB) are encrypted in browser memory with **AES-256-GCM** using a fresh per-document 256-bit key and 12-byte IV.
3. **Decentralized Ciphertext Storage:** Only opaque ciphertext is pinned to **IPFS** via `/api/pin` (Pinata relay).
4. **On-Chain Governance & Audit Trail:** The Solana Anchor program (`52sv1bDkPFyi8mwVG2eYLYPXPmr6n1oTBmmDLsjC9Hhq` on Devnet) stores only SHA-256 hashes, IPFS CIDs, wrapped keys, access rules, timestamps, and pseudonymous wallet addresses—**never medical content**. Patients grant, expire, or revoke clinician access on-chain, and every read emits an immutable audit event.
5. **Orbit Assistant:** Client-side in-browser assistant (formerly "Guide" in code; UI displays **"Orbit"** with a text-only launcher) providing FAQ search, a `/patient`-only symptom precautions tool, and a rule-based emergency red-flag interceptor (`112` / `14416`).

## Routes
- `/` — Landing page, architecture sandbox, comparison, guardrails, FAQ, and standalone Contact section (`#contact`)
- `/publisher` — Registry setup and clinician credential issuance/revocation
- `/patient` — Encryption activation, file upload/encryption, integrity/tamper checks, time-bound sharing, and revocation
- `/doctor` — Credential status, shared record decryption, and in-browser viewer
- `/audit` — Chronological decoded on-chain event timeline and CSV export
- `/api/pin` — Server-side Pinata IPFS pinning endpoint

## Approved Design Tokens
- Page background: `#FFFFFF`
- Surface / card: `#F7FBFC`
- Border / hairline: `#DCEEF2`
- Ink (headings): `#040B1A`
- Body text: `#1E293B`
- Muted text: `#64748B`
- Mint-aqua status box: `#E6FBF8` / border `#99F0E4`
- Ice-cyan status box: `#E8F7FC` / border `#9CE0F5`
- Brand gradient: `linear-gradient(135deg, #5EFCE8 0%, #2EE8C8 35%, #00C4E0 70%, #0084C2 100%)`
- Accent: `#00B8D9`
- Active dot: `#14D9C4`
- Revoked / neutral surface: `#F1F5F9`

## UI Invariants
- **Floating Navbar:** Three solid-white rounded pills (`brand`, `nav`, `actions`) fixed above all content (`z-index: 1000`), never transparent.
- **Favicon:** Shield logo (`public/logo.png`, `app/icon.png`, `app/apple-icon.png`, `app/favicon.ico`).
- **Orbit Launcher:** Text-only `"Orbit"` pill button (no icon, no dot). Underlying code identifiers retain `Guide` naming.

## Frozen (Do Not Modify During Copy/UI Pivots)
- Wallet connection and provider (`WalletModal`, `Providers`, `solhealth-context.tsx`)
- Devnet status check and RPC polling
- Routes and API routes (`/api/pin`)
- Key derivation, AES-256-GCM encryption/decryption, TweetNaCl X25519 key wrapping
- IPFS pinning/fetching
- On-chain registration, grant/expire/revoke logic, and audit log decoding
- Orbit search/symptom/red-flag logic and emergency hotline numbers

## Recent Pivot Changes (`pivot/vvip-solo`)
- **About Us Hidden:** Team grid on `/` is gated behind `const SHOW_ABOUT = false;` (code and `public/team/*` assets preserved for future restoration). "About" nav/footer links removed.
- **Standalone Contact:** `#contact` section retained on `/` with email (`mailto:akshatupadhyay2501@gmail.com`) and LinkedIn (`https://www.linkedin.com/in/akshat-up`).
- **Solo Positioning:** Removed academic/college references, enrollment numbers, and multi-author/team framing from user-facing UI, metadata, and docs.
- **VVIP / Defence / Government Positioning:** Updated homepage, metadata, role pages, and Orbit greeting/FAQ to a discreet, need-to-know tone, added the "Built for" section, added a simulated emergency access demo control in the homepage sandbox, and reinforced Devnet prototype disclaimers.
