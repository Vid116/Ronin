# ROFL Deployment Guide - Quick Start

## Overview

RoninRumble now supports **ROFL (Runtime Off-Chain Logic)** for paid matches, providing trustless battle computation in Oasis Trusted Execution Environment (TEE).

## What Changed?

### Architecture

**Before**:
```
All Matches: Game Server → Local Engine → Ronin Contracts
```

**After**:
```
Paid Matches:  Game Server → ROFL (Oasis TEE) → Game Server → Ronin Contracts
Free Matches:  Game Server → Local Engine → Broadcast (unchanged)
```

### Key Benefits

- **Trustless**: Battle results computed in secure TEE, cryptographically signed
- **Verifiable**: Players can verify results weren't manipulated
- **Fair**: Entry fees protected by cryptographic guarantees
- **Hybrid**: Free matches use fast local engine, paid matches use ROFL

## Quick Setup (Testnet)

### 1. Install Dependencies

```bash
# Install ROFL service dependencies
cd rofl-service
npm install
cd ..

# Oasis CLI already installed ✓
```

### 2. Get Testnet Tokens

You already have your Oasis wallet:
- **Address**: `oasis1qzp50yuq8j5latfxc2gvgsxa756ja4lmdgvf5vtv`

Get tokens from faucet:
```bash
# Visit https://faucet.testnet.oasis.io/
# Paste your address and request tokens
```

### 3. Configure Environment

Create `rofl-service/.env`:
```bash
PORT=3000
NODE_ENV=development

# Use your existing wallet or create a dedicated ROFL signing key
ROFL_SIGNING_KEY=your-private-key-here
```

Update main `.env` file (once deployed):
```bash
# Add these lines to your existing .env
ROFL_ENDPOINT=http://localhost:3000  # For local testing
# ROFL_ENDPOINT=https://rofl-pool.oasis.network/rofl1...  # After deployment
ROFL_SIGNER_ADDRESS=0x...  # Address of ROFL_SIGNING_KEY
ROFL_TIMEOUT_MS=10000
ROFL_MAX_RETRIES=3
```

### 4. Test Locally (Optional)

```bash
# Terminal 1: Start ROFL service
cd rofl-service
npm run dev

# Terminal 2: Start game server
cd ..
npm run server

# Terminal 3: Test
# Create a paid match (entryFee > 0)
# Watch logs for: "[ROFL] Match is a paid match - ROFL enabled"
```

### 5. Deploy to Oasis Testnet

```bash
cd rofl-service

# Step 1: Create ROFL app on-chain
oasis rofl create --network testnet

# Save the app ID from output!
# Example: rofl1qpj8...xyz

# Step 2: Build ROFL bundle
# On Windows/Mac:
docker run --platform linux/amd64 --volume .:/src -it ghcr.io/oasisprotocol/rofl-dev:main oasis rofl build

# On Linux:
oasis rofl build

# Step 3: Set secrets (your signing key)
echo -n "0x...your-private-key..." | oasis rofl secret set ROFL_SIGNING_KEY -

# Step 4: Update bundle on-chain
oasis rofl update --network testnet

# Step 5: Deploy to ROFL node
oasis rofl deploy --network testnet

# Step 6: Check status
oasis rofl machine show

# Step 7: Get endpoint URL
oasis rofl info
# Copy the endpoint URL (e.g., https://rofl-pool.oasis.network/rofl1...)
```

### 6. Update Game Server

Update main `.env`:
```bash
ROFL_ENDPOINT=https://rofl-pool.oasis.network/rofl1...  # From step 5
ROFL_SIGNER_ADDRESS=0x...  # Address of your ROFL signing key
```

Restart game server:
```bash
npm run server
```

## Testing

### Create Paid Match

In your matchmaking code, set `entryFee > 0`:

```typescript
// Example: 1v1 paid match
const match = await matchMaking.createMatch({
  playerCount: 2,
  entryFee: 1000000000000000000, // 1 token in wei
  // ...
});
```

### Verify ROFL Integration

Check logs:
```bash
# Game server logs
[ROFL] Match abc-123 is a paid match (fee: 1000000000000000000) - ROFL enabled
[ROFL] Computing battle via ROFL for paid match
[ROFL] Battle computed successfully via ROFL

# ROFL service logs
oasis rofl machine logs
```

## Current Status

✅ **Completed**:
- ROFL service created (`rofl-service/`)
- Battle computation with TEE signing
- Game server integration
- Local engine fallback for free matches
- Comprehensive documentation

⏳ **Remaining**:
- Deploy to Oasis testnet
- Update Ronin contracts for signature verification
- End-to-end testing with paid matches
- Mainnet deployment

## File Changes Summary

### New Files Created

```
rofl-service/
├── src/
│   ├── main.ts                 # HTTP server
│   ├── combat-service.ts       # Battle computation + signing
│   └── engine/                 # Combat engine (copied)
│       ├── engine.ts
│       ├── types.ts
│       └── validator.ts
├── Dockerfile
├── compose.yaml
├── rofl.yaml
├── package.json
├── tsconfig.json
├── .env.example
├── .gitignore
└── README.md

server/services/
└── ROFLClient.ts              # ROFL HTTP client
```

### Modified Files

```
server/game/GameRoom.ts
- Added ROFL client initialization
- Added async battle routing
- Added ROFL vs local engine logic
- Added board format conversion
- Added TEE signature handling
```

## Next Steps

1. **Deploy to Testnet**: Follow Step 5 above
2. **Test Paid Matches**: Create matches with entryFee > 0
3. **Monitor Performance**: Check ROFL logs and battle latency
4. **Update Contracts**: Add signature verification (optional for testnet)
5. **Mainnet**: Deploy when ready

## Troubleshooting

### "ROFL client not initialized"
- Check `.env` has `ROFL_ENDPOINT` configured
- Verify ROFL service is running/deployed

### "ROFL service unavailable"
- Check `oasis rofl machine show` status
- Verify endpoint URL is correct
- Check Oasis testnet status

### "Invalid ROFL signature"
- Verify `ROFL_SIGNER_ADDRESS` matches your TEE key
- Check signing key was set: `oasis rofl secret list`

## Cost Estimate

**Testnet**: Free (use faucet tokens)
- Registration: ~100 TEST
- Deployment: ~50 TEST
- Per-battle: Negligible

**Mainnet**: TBD (research current ROFL pricing)

## Support

- ROFL Service README: `rofl-service/README.md`
- Oasis ROFL Docs: https://docs.oasis.io/build/rofl/
- Your Oasis wallet: `oasis1qzp50yuq8j5latfxc2gvgsxa756ja4lmdgvf5vtv`

---

**Status**: Ready for testnet deployment 🚀
**Architecture**: Hybrid (ROFL for paid, local for free)
**Security**: TEE-signed battle results
**Next**: Deploy to Oasis testnet
