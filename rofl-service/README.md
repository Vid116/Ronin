# RoninRumble ROFL Battle Service

This service runs RoninRumble battle computations in Oasis ROFL (Runtime Off-Chain Logic) Trusted Execution Environment (TEE) for paid matches.

## What is ROFL?

ROFL allows off-chain compute to run in a secure, verifiable Trusted Execution Environment (Intel TDX/SGX). This provides:

- **Trustless Computation**: Battle results are computed in TEE and cryptographically signed
- **Verifiable Randomness**: Deterministic RNG with verifiable seeds
- **Privacy**: Computation happens in secure enclave
- **Integrity**: Results cannot be manipulated by game server

## Architecture

```
Paid Match Flow:
Frontend → Game Server → ROFL Service (Oasis TEE) → Game Server → Ronin Contracts

Free Match Flow:
Frontend → Game Server → Local Engine → Broadcast
```

### Why ROFL for Paid Matches?

- **Trust**: Players can verify battle results were computed fairly in TEE
- **Security**: Entry fees are protected by cryptographic guarantees
- **Transparency**: Battle computation is deterministic and auditable

## Directory Structure

```
rofl-service/
├── src/
│   ├── main.ts              # HTTP server entry point
│   ├── combat-service.ts    # Battle computation & TEE signing
│   └── engine/              # Pure combat engine (copied from rofl-combat/)
│       ├── engine.ts        # Combat simulation logic
│       ├── types.ts         # Type definitions
│       └── validator.ts     # Input validation
├── Dockerfile               # Container for Oasis deployment
├── compose.yaml             # Docker Compose configuration
├── rofl.yaml                # Oasis ROFL configuration
├── package.json             # Node.js dependencies
└── tsconfig.json            # TypeScript configuration
```

## Setup

### Prerequisites

1. **Node.js 20+**
2. **Oasis CLI** (installed and configured)
3. **Oasis testnet tokens** (~150 TEST for deployment)
4. **Docker** (for building container)

### Environment Variables

Create `.env` file:

```bash
# Server Configuration
PORT=3000
NODE_ENV=production

# TEE Signing Key
# In production, this comes from Oasis ROFL KMS
# For testing, use a dedicated wallet
ROFL_SIGNING_KEY=0x...your-private-key...

# ROFL Configuration
ROFL_ENCLAVE_ID=ronin-rumble-battle-v1
ROFL_TEE_TYPE=tdx
```

## Local Development

### Install Dependencies

```bash
cd rofl-service
npm install
```

### Build

```bash
npm run build
```

### Run Locally (Development)

```bash
npm run dev
```

The service will start on `http://localhost:3000`.

### Test Battle Endpoint

```bash
curl -X POST http://localhost:3000/compute-battle \
  -H "Content-Type: application/json" \
  -d '{
    "matchId": "test-123",
    "round": 1,
    "board1": { "units": [null, null, null, null, null, null, null, null] },
    "board2": { "units": [null, null, null, null, null, null, null, null] },
    "player1Address": "0x...",
    "player2Address": "0x...",
    "seed": 12345
  }'
```

## Deployment to Oasis

### Step 1: Initialize ROFL Configuration

Already done! `rofl.yaml` is configured with:
- **TEE**: TDX (Intel Trust Domain Extensions)
- **Resources**: 1GB RAM, 1 CPU, 512MB storage
- **Container**: Node.js 20 Alpine

### Step 2: Build Docker Container

```bash
# Build for linux/amd64 (required for ROFL)
docker buildx build --platform linux/amd64 -t ronin-rumble-battle:latest .
```

### Step 3: Deploy to Oasis Testnet

```bash
# Initialize ROFL app (creates registration)
oasis rofl init

# Create app on-chain
oasis rofl create --network testnet

# This will output your app ID - save it!
# Example: rofl1abc...xyz
```

### Step 4: Build ROFL Bundle

```bash
# On Linux (native)
oasis rofl build

# On Windows/Mac (use Docker)
docker run --platform linux/amd64 --volume .:/src -it ghcr.io/oasisprotocol/rofl-dev:main oasis rofl build
```

This creates a `.orc` bundle file.

### Step 5: Upload Secrets

```bash
# Set TEE signing key (securely stored in ROFL KMS)
echo -n "0x...your-private-key..." | oasis rofl secret set ROFL_SIGNING_KEY -

# Update on-chain with bundle info
oasis rofl update
```

### Step 6: Deploy to ROFL Node

```bash
# Deploy to Oasis Foundation ROFL provider
oasis rofl deploy --network testnet

# Check status
oasis rofl machine show

# View logs
oasis rofl machine logs
```

### Step 7: Get ROFL Endpoint

```bash
# Get your ROFL service URL
oasis rofl info

# Example output:
# https://rofl-pool.oasis.network/rofl1abc...xyz
```

## Game Server Integration

### Update Game Server Environment

Add to your main `.env` file:

```bash
# ROFL Configuration
ROFL_ENDPOINT=https://rofl-pool.oasis.network/rofl1abc...xyz
ROFL_SIGNER_ADDRESS=0x...your-rofl-signer-address...
ROFL_TIMEOUT_MS=10000
ROFL_MAX_RETRIES=3
```

### Test Integration

1. **Start Game Server**: `npm run server`
2. **Create Paid Match**: Set entry fee > 0
3. **Check Logs**: Should see `[ROFL] Match is a paid match - ROFL enabled`
4. **Run Battle**: Logs will show `[ROFL] Computing battle via ROFL`

## API Endpoints

### Health Check

```
GET /health
```

Response:
```json
{
  "status": "healthy",
  "service": "ronin-rumble-rofl-battle",
  "version": "1.0.0",
  "tee": "active"
}
```

### Compute Battle

```
POST /compute-battle
```

Request:
```json
{
  "matchId": "match-123",
  "round": 3,
  "board1": { "units": [...] },
  "board2": { "units": [...] },
  "player1Address": "0x...",
  "player2Address": "0x...",
  "seed": 12345
}
```

Response:
```json
{
  "winner": "player1",
  "damageToLoser": 5,
  "finalBoard1": { "units": [...] },
  "finalBoard2": { "units": [...] },
  "events": [...],
  "resultHash": "0x...",
  "signature": "0x...",
  "seed": 12345,
  "timestamp": 1234567890,
  "executionTimeMs": 45
}
```

## Verification

### Verify TEE Signature (Example)

```typescript
import { ethers } from 'ethers';

function verifyBattleResult(response) {
  const { resultHash, matchId, round, signature } = response;

  // Recreate signed message
  const message = ethers.solidityPacked(
    ['bytes32', 'string', 'uint256'],
    [resultHash, matchId, round]
  );

  const messageHash = ethers.keccak256(message);
  const signer = ethers.verifyMessage(ethers.getBytes(messageHash), signature);

  console.log('Signer:', signer);
  console.log('Expected:', ROFL_SIGNER_ADDRESS);
  return signer.toLowerCase() === ROFL_SIGNER_ADDRESS.toLowerCase();
}
```

## Monitoring

### Check ROFL Service Health

```bash
# Via Oasis CLI
oasis rofl machine show

# Via HTTP
curl https://rofl-pool.oasis.network/rofl1abc...xyz/health
```

### View ROFL Logs

```bash
oasis rofl machine logs

# Follow logs in real-time
oasis rofl machine logs --follow
```

### Monitor Battle Requests

Logs include:
- `[ROFL] Computing battle - Match X, Round Y`
- `[ROFL] Battle computed successfully`
- `[ROFL] Signing result with TEE key`

## Troubleshooting

### ROFL Service Unavailable

**Symptom**: `ROFL service unavailable after 3 attempts`

**Solutions**:
1. Check ROFL service health: `oasis rofl machine show`
2. Verify `ROFL_ENDPOINT` in `.env`
3. Check Oasis testnet status
4. Restart ROFL machine if needed

### Invalid Signature

**Symptom**: `Invalid ROFL signature - battle result cannot be trusted`

**Solutions**:
1. Verify `ROFL_SIGNER_ADDRESS` matches deployed TEE key
2. Check TEE signing key was set correctly: `oasis rofl secret list`
3. Ensure `.env` has correct signer address

### Docker Build Fails

**Symptom**: Build errors during `oasis rofl build`

**Solutions**:
1. Ensure platform is `linux/amd64`
2. Run build in Docker: `docker run --platform linux/amd64 ...`
3. Check TypeScript compilation: `npm run build`

### Out of Memory

**Symptom**: ROFL service crashes during battle

**Solutions**:
1. Increase memory in `rofl.yaml` (currently 1024MB)
2. Optimize combat engine if needed
3. Check for memory leaks in logs

## Cost Estimates

### Testnet (Free)
- Registration: ~100 TEST tokens (from faucet)
- Deployment: ~50 TEST tokens
- Per-battle: Negligible

### Mainnet (Estimated)
- Registration: Research current ROFL pricing
- Deployment: TBD based on Oasis ROFL mainnet costs
- Per-battle: Based on compute time (~50ms average)

## Security Considerations

1. **Private Keys**: Never commit ROFL_SIGNING_KEY to git
2. **TEE Attestation**: Production should verify TEE attestation
3. **Rate Limiting**: Consider adding rate limits to prevent abuse
4. **Input Validation**: All boards are validated before computation
5. **Result Verification**: Game server MUST verify signatures

## Next Steps

1. **Test thoroughly on testnet**
2. **Monitor performance and costs**
3. **Add TEE attestation verification**
4. **Consider horizontal scaling** (multiple ROFL instances)
5. **Deploy to mainnet** when ready

## Support

- **Oasis Docs**: https://docs.oasis.io/build/rofl/
- **Discord**: Join Oasis Protocol Discord
- **Issues**: Report bugs in main RoninRumble repo

---

**Built with ♥ for trustless gaming on Oasis**
