# SolHealth Devnet Deployment

## Overview
The SolHealth Anchor smart contract is deployed to Solana Devnet.

## Deployment Details
- **Program ID**: `6EZgFcGtnBqhor99gzCoqyzqRpfrU9fyP6NRUuqqS7xe`
- **Deploy Transaction Signature**: `2QdyTB4G119VNkvXVVXFnf9v87hsPUZ2891596SqVep62kJs9iNYTsDPJz183kf36wry8LoxhbzeLFhjFpT1oZ2e`
- **Cluster**: `devnet`
- **Deployment Date**: 2026-10-14
- **Program Size**: 248,432 bytes

## Solana Explorer Links
- **Program Account**: [https://explorer.solana.com/address/6EZgFcGtnBqhor99gzCoqyzqRpfrU9fyP6NRUuqqS7xe?cluster=devnet](https://explorer.solana.com/address/6EZgFcGtnBqhor99gzCoqyzqRpfrU9fyP6NRUuqqS7xe?cluster=devnet)
- **Deployment Transaction**: [https://explorer.solana.com/tx/2QdyTB4G119VNkvXVVXFnf9v87hsPUZ2891596SqVep62kJs9iNYTsDPJz183kf36wry8LoxhbzeLFhjFpT1oZ2e?cluster=devnet](https://explorer.solana.com/tx/2QdyTB4G119VNkvXVVXFnf9v87hsPUZ2891596SqVep62kJs9iNYTsDPJz183kf36wry8LoxhbzeLFhjFpT1oZ2e?cluster=devnet)

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
