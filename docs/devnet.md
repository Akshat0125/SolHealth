# SolHealth Devnet Deployment

## Overview
The SolHealth Anchor smart contract is deployed to Solana Devnet.

## Deployment Details
- **Program ID**: `52sv1bDkPFyi8mwVG2eYLYPXPmr6n1oTBmmDLsjC9Hhq`
- **Deploy Transaction Signature**: `TYTJVzZ6cpx4rPSBFc3gUqUHbYkCmHLZshfhHHXL4MEdKyTxx6vz1nrEtvMxTm15xSS1wWiVxgHbkZgQ2koQaUs`
- **Cluster**: `devnet`
- **Deployment Date**: 2026-11-17
- **Program Size**: 229,024 bytes
- **Program Keypair File**: `target/deploy/solhealth-keypair.json` (Important: back up this file privately and securely offline; never commit keypairs or secrets to version control)

## Solana Explorer & Live Links
- **Live Application**: [https://sol-health-two.vercel.app/](https://sol-health-two.vercel.app/)
- **Program Account**: [https://explorer.solana.com/address/52sv1bDkPFyi8mwVG2eYLYPXPmr6n1oTBmmDLsjC9Hhq?cluster=devnet](https://explorer.solana.com/address/52sv1bDkPFyi8mwVG2eYLYPXPmr6n1oTBmmDLsjC9Hhq?cluster=devnet)
- **Deployment Transaction**: [https://explorer.solana.com/tx/TYTJVzZ6cpx4rPSBFc3gUqUHbYkCmHLZshfhHHXL4MEdKyTxx6vz1nrEtvMxTm15xSS1wWiVxgHbkZgQ2koQaUs?cluster=devnet](https://explorer.solana.com/tx/TYTJVzZ6cpx4rPSBFc3gUqUHbYkCmHLZshfhHHXL4MEdKyTxx6vz1nrEtvMxTm15xSS1wWiVxgHbkZgQ2koQaUs?cluster=devnet)

## Switching Environments

### Solana CLI
- **Switch to Devnet**:
  ```bash
  solana config set --url https://api.devnet.solana.com
  ```
- **Switch back to Localnet**:
  ```bash
  solana config set --url http://127.0.0.1:8899
  ```

### Anchor Provider (`Anchor.toml`)
- **Devnet**:
  ```toml
  [provider]
  cluster = "devnet"
  wallet = "~/.config/solana/id.json"
  ```
- **Localnet**:
  ```toml
  [provider]
  cluster = "localnet"
  wallet = "~/.config/solana/id.json"
  ```

### Next.js Web Application
The web app defaults to the local validator (`http://127.0.0.1:8899`).
To point the app to Devnet, set the following environment variables in `app/.env.local`:
```bash
NEXT_PUBLIC_CLUSTER=devnet
NEXT_PUBLIC_SOLANA_RPC_URL=https://api.devnet.solana.com
```
To run against the local validator, leave them unset or configure:
```bash
NEXT_PUBLIC_CLUSTER=local
NEXT_PUBLIC_SOLANA_RPC_URL=http://127.0.0.1:8899
```
