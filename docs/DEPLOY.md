# SolHealth Deployment Guide (Vercel & Solana Devnet)

This guide covers deploying SolHealth to Vercel (Hobby/Free tier) against Solana Devnet.

---

## 1. Vercel Project Setup

Because SolHealth is a monorepo containing both the Anchor smart contract (`programs/solhealth`) and the Next.js web application (`app/`), you must configure Vercel's root directory:

1. **Import Git Repository**: In your Vercel Dashboard, select **Add New Project** and import the SolHealth repository.
2. **Root Directory**: Click **Edit** next to Root Directory and set it to `app`.
3. **Framework Preset**: Next.js (automatically detected).
4. **Build & Development Settings**:
   - Build Command: `next build` (or `yarn build`)
   - Output Directory: `.next`
   - Install Command: `yarn install` (or `npm install`)

### Known install warnings

During `yarn install`, peer dependency warnings may appear for `react-native@>0.74` from `@solana-mobile/wallet-adapter-mobile` and `@react-native-async-storage/async-storage`. These originate from the optional Solana mobile wallet adapter bundled into `@solana/wallet-adapter-react`. They are expected and completely harmless for this web application; do not install React Native dependencies.

---

## 2. Environment Variables Configuration

Configure the following variables in **Project Settings > Environment Variables** on Vercel:

| Variable Name | Value | Scope | Description |
|---|---|---|---|
| `NEXT_PUBLIC_CLUSTER` | `devnet` | Production, Preview | Tells the client app to connect to Solana Devnet |
| `NEXT_PUBLIC_SOLANA_RPC_URL` | `https://api.devnet.solana.com` (or dedicated RPC) | Production, Preview | RPC endpoint for on-chain queries and transaction submission |
| `NEXT_PUBLIC_ENABLE_DEMO` | `false` | Production | Disables demo simulated identities; requires real browser wallets |
| `PINATA_JWT` | `<your-pinata-jwt>` | Server-side only | Scoped Pinata API token for IPFS ciphertext pinning |
| `UPLOADS_ENABLED` | `true` | Production, Preview | Emergency kill-switch: set to `false` to immediately reject new uploads |
| `NEXT_PUBLIC_ENABLE_GUIDE` | `true` (optional) | Production, Preview | Optional feature flag: set to `false` to disable the in-browser Guide Bot and omit all guide bundles |

> [!IMPORTANT]
> - **Security**: `PINATA_JWT` and `UPLOADS_ENABLED` must **NEVER** use the `NEXT_PUBLIC_` prefix. They remain strictly server-side in API routes.
> - **Pinata Scope**: Generate a Pinata API Key with restricted permissions: enable only **Pinning > pinFileToIPFS** / **Files > Write**. Never use admin keys with account or billing permissions.

---

## 3. Dedicated RPC Provider Recommendations

Solana's public Devnet endpoint (`https://api.devnet.solana.com`) enforces strict IP-based rate limiting (HTTP 429) and may drop requests during network congestion.

For production or reliable demo environments, we strongly recommend obtaining a free Devnet RPC endpoint from one of the following providers:
- **Helius**: Free tier offers high-speed RPC and enhanced WebSocket support.
- **QuickNode**: Free Solana Devnet endpoints with generous daily request allowances.
- **Alchemy**: Free tier with Solana Devnet support and request caching.
- **Triton / RPC Pool**: High-performance dedicated nodes.

Set `NEXT_PUBLIC_SOLANA_RPC_URL` to your provider endpoint URL (e.g., `https://devnet.helius-rpc.com/?api-key=...`).

---

## 4. Client Wallet Setup

Users and testers interact with SolHealth using standard Solana browser extension wallets:

1. **Install Wallet**: Install [Phantom](https://phantom.app/) or [Solflare](https://solflare.com/).
2. **Enable Developer Mode**:
   - In Phantom: Open **Settings > Developer Settings** and turn on **Testnet Mode**.
   - Change Network from **Mainnet** to **Solana Devnet**.
3. **Fund with Devnet SOL**:
   - Request test SOL directly via the SolHealth wallet dropdown menu ("Get Devnet SOL").
   - Or request test SOL from the official faucet: [https://faucet.solana.com](https://faucet.solana.com).

---

## 5. Post-Deployment Checklist

Once deployed on Vercel, complete the setup sequence in order:

1. **Step 1: Initialize Registry (Publisher)**
   - Connect the deployer/authority wallet (`H78HSR4qRGP3wUzimjfrSXgvjULejDtCUc7r8FEBQjW`).
   - Navigate to `/publisher`.
   - Click **Initialize Registry** to initialize the on-chain `Config` PDA.
2. **Step 2: Verify Doctor Credential**
   - In `/publisher`, enter the doctor's public key into the verification input.
   - Click **Verify doctor** (`issue_credential` instruction) to issue their on-chain medical credential.
3. **Step 3: Activate Encryption Sessions**
   - Connect with the Patient wallet; navigate to `/patient`.
   - Click **Activate encryption session** and sign the one-time `ENCRYPTION_MESSAGE` prompt to register the patient's X25519 public key on Solana.
   - Connect with the Doctor wallet; navigate to `/doctor` and activate the doctor's encryption session.
4. **Step 4: End-to-End Workflow Verification**
   - **Upload**: As patient, upload and encrypt an encrypted health report (AES-256-GCM, <= 4 MB). Verify CID pinning and on-chain registration.
   - **Integrity**: Click **Check integrity** to verify SHA-256 on-chain hash match, simulated bit flip detection, and authentication tag rejection.
   - **Share**: Grant time-bound access to the verified doctor.
   - **Access**: Switch to doctor wallet on `/doctor`, click **Open record**, verify ciphertext retrieval, key unwrapping, and plaintext display.
   - **Revoke**: As patient, click **Stop sharing**; verify doctor access is immediately denied on-chain.

---

## 6. Rollback & Maintenance

- **Vercel Instant Rollback**: In the Vercel Deployments dashboard, select any previous successful deployment and click **Promote to Production** for zero-downtime rollback.
- **Upload Kill-Switch**: If IPFS or spam issues arise, set `UPLOADS_ENABLED=false` in Vercel environment variables and redeploy to reject uploads with HTTP 503 while preserving read access.
- **Program Authority**: The program upgrade authority is stored offline in the deployer keypair. Keep keypair backups in secure cold storage. Upgrades are performed with `anchor upgrade --program-id <PROGRAM_ID> target/deploy/solhealth.so --provider.cluster devnet`.
