#!/usr/bin/env bash
set -euo pipefail

# SolHealth Local Validator Reset & Deployment Helper
# Safely restarts the local Solana test validator and deploys the solhealth program.

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

echo "=== SolHealth Localnet Reset Helper ==="

# 1. Stop any currently running solana-test-validator
echo "Stopping any running solana-test-validator..."
pkill -f solana-test-validator 2>/dev/null || true
sleep 1

# 2. Ensure test-ledger folder exists for validator logs
mkdir -p "$PROJECT_ROOT/test-ledger"

# 3. Start clean solana-test-validator in the background with --reset
echo "Starting clean solana-test-validator (--reset)..."
nohup solana-test-validator \
  --ledger "$PROJECT_ROOT/test-ledger" \
  --reset \
  --quiet > "$PROJECT_ROOT/test-ledger/validator.log" 2>&1 </dev/null &
disown || true

VALIDATOR_PID=$!
echo "Validator process started (PID: $VALIDATOR_PID). Waiting for RPC to respond at http://127.0.0.1:8899..."

# 4. Wait for validator RPC to be ready
TIMEOUT=30
ELAPSED=0
until solana ping --url http://127.0.0.1:8899 -c 1 >/dev/null 2>&1; do
  sleep 1
  ELAPSED=$((ELAPSED + 1))
  if [ "$ELAPSED" -ge "$TIMEOUT" ]; then
    echo "ERROR: solana-test-validator failed to respond within ${TIMEOUT}s."
    echo "Check logs at $PROJECT_ROOT/test-ledger/validator.log"
    exit 1
  fi
done

echo "✓ Local Solana validator is online and healthy."

# 5. Fund local deployer wallet
echo "Funding deployer wallet on localnet..."
solana config set --url http://127.0.0.1:8899 >/dev/null
solana airdrop 10 --url http://127.0.0.1:8899 >/dev/null 2>&1 || true

# 6. Deploy solhealth program locally
echo "Deploying SolHealth program to localnet..."
solana program deploy target/deploy/solhealth.so \
  --program-id target/deploy/solhealth-keypair.json \
  --url http://127.0.0.1:8899

echo "✓ SolHealth program deployed to localnet (6EZgFcGtnBqhor99gzCoqyzqRpfrU9fyP6NRUuqqS7xe)"

# 7. Print browser next steps
echo ""
echo "================================================================"
echo "          LOCAL ENVIRONMENT READY - BROWSER NEXT STEPS          "
echo "================================================================"
echo "1. Start the web app if not already running: cd app && npm run dev"
echo "2. Open http://localhost:3000 in your browser."
echo "3. Clear localStorage (DevTools -> Application -> Clear Site Data)"
echo "   OR simply click [FUND WALLETS] in the top navigation banner."
echo "4. Switch to ISSUER role and click [Set up registry] to initialize."
echo "5. Switch to DOCTOR role to verify the credential is registered."
echo "6. Switch to PATIENT role to upload and share encrypted health records."
echo "================================================================"
