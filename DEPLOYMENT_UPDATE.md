# Contract Deployment Update - Nov 22, 2025

## New Contract Addresses (Testnet)

**Updated:** 2025-11-22 at 04:45 UTC

- **RoninRumbleMain:** `0x0B46aF2F581c163ff7b1dD6d2aFedDa86066ABDA`
- **RoninRumbleNFT:** `0x45cE44B8CFE6D42aF521eCd010538411d4222CFE`

## What Changed

### Entry Fees (Reduced 2000x-5000x!)

| Tier | Old Price | New Price | Change |
|------|-----------|-----------|--------|
| Tier 1 | 2 RON | **0.001 RON** | 2000x cheaper |
| Tier 2 | 10 RON | **0.005 RON** | 2000x cheaper |
| Tier 3 | 50 RON | **0.01 RON** | 5000x cheaper |

### Updated Files

1. **`.env`** - Added contract addresses:
   - `NEXT_PUBLIC_RONIN_RUMBLE_MAIN_ADDRESS`
   - `NEXT_PUBLIC_RONIN_RUMBLE_NFT_ADDRESS`

2. **`contracts/RoninRumbleMain.sol`** - Updated entry fee constants
3. **`contracts/test/RoninRumble.test.ts`** - Updated test values
4. **`data/constants.ts`** - Updated ENTRY_FEES values
5. **`lib/contracts.ts`** - NEW file with contract config and ABIs
6. **`deployment.json`** - Auto-updated with new deployment info

## Testing Capacity with 1 RON

With the new cheaper fees and 0.9 RON remaining:

- **~150 full matches** at Tier 1 (6 × 0.001 = 0.006 RON/match)
- **~30 full matches** at Tier 2 (6 × 0.005 = 0.03 RON/match)
- **~15 full matches** at Tier 3 (6 × 0.01 = 0.06 RON/match)

## Next Steps

1. ✅ Contracts deployed to testnet
2. ✅ Frontend configuration updated
3. ✅ All tests passing (42/42)
4. 🔄 Update frontend components to use new contract addresses
5. 🔄 Test contract interactions from frontend
6. 🔄 Verify contracts on Ronin Explorer (optional)

## How to Use in Frontend

```typescript
import { CONTRACTS, RONIN_RUMBLE_MAIN_ABI, ENTRY_FEE_TIERS } from '@/lib/contracts';

// Use contract address
const mainContractAddress = CONTRACTS.RONIN_RUMBLE_MAIN.address;

// Use ABI
const abi = RONIN_RUMBLE_MAIN_ABI;

// Use entry fees
const tier1Fee = ENTRY_FEE_TIERS.TIER_1; // 0.001 RON in wei
```

## Contract Details

- **Network:** Ronin Testnet (Saigon)
- **Chain ID:** 2021
- **Explorer:** https://saigon-app.roninchain.com/
- **Deployer:** 0xfDF0e775aC0E946DC940e3ad301e1E64fc722C51
- **Balance Remaining:** 0.902 RON

