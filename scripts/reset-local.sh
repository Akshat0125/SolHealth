#!/usr/bin/env bash
set -euo pipefail

# SolHealth Local Validator Reset & Deployment Helper
# Safely restarts the local Solana test validator and deploys the solhealth program.

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

PROGRAM_ID="52sv1bDkPFyi8mwVG2eYLYPXPmr6n1oTBmmDLsjC9Hhq"
SO_FILE="$PROJECT_ROOT/target/deploy/solhealth.so"
KEYPAIR_FILE="$PROJECT_ROOT/target/deploy/solhealth-keypair.json"

echo "=== SolHealth Localnet Reset Helper ==="

# 1. Stop any currently running solana-test-validator
echo "Stopping any running solana-test-validator..."
pkill -f solana-test-validator 2>/dev/null || true
sleep 1

# 2. Reset test-ledger folder
rm -rf "$PROJECT_ROOT/test-ledger"
mkdir -p "$PROJECT_ROOT/test-ledger"

# 3. Start clean solana-test-validator in the background with --reset
echo "Starting clean solana-test-validator (--reset)..."
setsid nohup solana-test-validator \
  --ledger "$PROJECT_ROOT/test-ledger" \
  --reset \
  --quiet > "$PROJECT_ROOT/test-ledger/validator.log" 2>&1 </dev/null &
disown || true

VALIDATOR_PID=$!
echo "Validator process started (PID: $VALIDATOR_PID). Waiting for RPC to respond at http://127.0.0.1:8899..."

# 4. Wait for validator RPC to be ready
TIMEOUT=30
ELAPSED=0
until solana cluster-version --url http://127.0.0.1:8899 >/dev/null 2>&1; do
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
DEPLOYER_ADDR="$(solana address)"

check_balance() {
  solana balance "$DEPLOYER_ADDR" --url http://127.0.0.1:8899 | awk '{print $1}'
}

BAL="$(check_balance)"
NEED_AIRDROP="$(awk -v b="$BAL" 'BEGIN {print (b < 10) ? 1 : 0}')"
if [ "$NEED_AIRDROP" -eq 1 ]; then
  echo "Deployer balance ($BAL SOL) is below 10 SOL. Requesting airdrop..."
  solana airdrop 10 "$DEPLOYER_ADDR" --url http://127.0.0.1:8899
  sleep 1
  BAL="$(check_balance)"
  echo "Deployer balance is now: $BAL SOL"
fi

# 6. Check if .so is missing or stale
should_build=0
if [ ! -f "$SO_FILE" ]; then
  echo "solhealth.so not found. Building..."
  should_build=1
elif ! readelf -h "$SO_FILE" 2>/dev/null | grep -q "0x3"; then
  echo "solhealth.so is not compiled for sBPFv3 (Flags: 0x3 required). Rebuilding..."
  should_build=1
else
  NEWEST_SRC="$(find "$PROJECT_ROOT/programs/solhealth" "$PROJECT_ROOT/Cargo.toml" "$PROJECT_ROOT/Cargo.lock" -type f -newer "$SO_FILE" 2>/dev/null | head -n 1 || true)"
  if [ -n "$NEWEST_SRC" ]; then
    echo "Source file $NEWEST_SRC is newer than $SO_FILE. Rebuilding..."
    should_build=1
  fi
fi

if [ "$should_build" -eq 1 ]; then
  echo "Building Anchor program..."
  anchor build
fi

if [ ! -f "$KEYPAIR_FILE" ]; then
  echo "ERROR: Program keypair not found at $KEYPAIR_FILE"
  exit 1
fi

# 7. Deploy solhealth program locally
echo "Deploying SolHealth program to localnet..."
solana program deploy "$SO_FILE" \
  --program-id "$KEYPAIR_FILE" \
  --url http://127.0.0.1:8899

# 8. Verify program deployment
echo "Verifying program deployment..."
PROGRAM_INFO="$(solana program show "$PROGRAM_ID" --url http://127.0.0.1:8899)"
if ! echo "$PROGRAM_INFO" | grep -q "Program Id: $PROGRAM_ID"; then
  echo "ERROR: Program $PROGRAM_ID was not found on local validator!"
  exit 1
fi

if ! echo "$PROGRAM_INFO" | grep -q "BPFLoaderUpgradeab1e"; then
  echo "ERROR: Program $PROGRAM_ID is not executable!"
  exit 1
fi

echo "Program deployed: $PROGRAM_ID"

# 9. Print browser next steps
echo ""
echo "================================================================"
echo "          LOCAL ENVIRONMENT READY - BROWSER NEXT STEPS          "
echo "================================================================"
echo "1. Start the web app if not already running: cd app && npm run dev"
echo "2. Open http://localhost:3000 in your browser."
echo "3. Clear localStorage (DevTools -> Application -> Clear Site Data)"
echo "   OR simply click [FUND WALLETS] in the top navigation banner."
echo "4. Switch to PUBLISHER role and click [Set up registry] to initialize."
echo "5. Switch to DOCTOR role to verify the credential is registered."
echo "6. Switch to PATIENT role to upload and share encrypted health records."
echo "================================================================"
