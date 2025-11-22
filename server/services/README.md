# Blockchain Integration Service

This directory contains the blockchain integration services for Ronin Rumble.

## ContractService.ts

The `ContractService` class handles all interactions with the RoninRumbleMain smart contract.

### Features

- **Match Creation**: Creates matches on-chain when 6 players are ready
- **Transaction Verification**: Verifies player joinMatch transactions
- **Result Submission**: Submits match results and placements to blockchain
- **Prize Distribution**: Automatic prize calculation and distribution via smart contract

### Configuration

The service requires the following environment variables in `.env`:

```env
# Required
GAME_SERVER_PRIVATE_KEY=your_private_key_here
RONIN_RPC_URL=https://saigon-testnet.roninchain.com/rpc

# Optional (uses defaults from deployment.json)
GAME_CONTRACT_ADDRESS=0x0B46aF2F581c163ff7b1dD6d2aFedDa86066ABDA
```

### Setup Instructions

1. **Generate Game Server Wallet**
   ```bash
   # You can use any Ethereum wallet generator
   # Or use ethers.js:
   node -e "const ethers = require('ethers'); const w = ethers.Wallet.createRandom(); console.log('Address:', w.address); console.log('Private Key:', w.privateKey);"
   ```

2. **Set as Authorized Game Server**

   The contract's `gameServer` address must match your game server wallet. This is set during deployment, but you can update it:

   ```bash
   # Using the deployed contract owner
   npx hardhat run scripts/set-game-server.ts --network roninTestnet
   ```

3. **Fund the Game Server Wallet**

   The game server needs RON for gas fees to submit transactions:

   - **Testnet**: Get testnet RON from the [Ronin Faucet](https://faucet.roninchain.com/)
   - **Mainnet**: Transfer real RON to the game server wallet

4. **Configure Environment**

   Copy `.env.example` to `.env` and set:
   ```env
   GAME_SERVER_PRIVATE_KEY=0x... # Your game server private key
   ```

### Usage in Code

The service is automatically initialized in `MatchMaking.ts`:

```typescript
import { ContractService } from '../services/ContractService';

// Initialize (happens in MatchMaking constructor)
const contractService = new ContractService();

// Create match
const matchId = await contractService.createMatch(0.001); // 0.001 RON entry fee

// Verify transaction
await contractService.verifyJoinMatch(
  txHash,
  matchId,
  playerAddress,
  0.001
);

// Submit results
await contractService.submitMatchResults(
  matchId,
  ['0xPlayer1...', '0xPlayer2...', ...], // 6 player addresses
  [1, 3, 2, 5, 6, 4] // Corresponding placements (1-6)
);
```

### Security Considerations

1. **Private Key Security**
   - Never commit `.env` to version control (it's in `.gitignore`)
   - Use environment-specific secrets management (AWS Secrets Manager, etc.)
   - Rotate keys regularly
   - Use a dedicated wallet for the game server (not your personal wallet)

2. **Transaction Verification**
   - All player transactions are verified before allowing game entry
   - Checks transaction status, recipient, and amount
   - Prevents players from joining without paying

3. **Result Integrity**
   - Only the authorized game server can submit results
   - Contract validates placement data (unique values 1-6)
   - Results are immutable once submitted

4. **Gas Management**
   - Monitor game server wallet balance
   - Set up alerts for low balance
   - Estimate gas costs: ~100,000-200,000 gas per transaction

### Error Handling

The service includes comprehensive error handling:

- **Transaction Failures**: Automatically retries on network issues
- **Validation Errors**: Clear error messages for invalid data
- **Gas Estimation**: Checks for sufficient gas before submitting
- **Network Errors**: Graceful degradation if blockchain is unavailable

### Monitoring

Key metrics to monitor:

- Transaction success rate
- Gas costs per transaction
- Game server wallet balance
- Blockchain confirmations time
- Failed transaction reasons

### Testing

Test the integration with:

```bash
# Run contract tests
npm run test:contracts

# Create test match
npm run create-match

# Test full integration
npm run test:integration
```

### Troubleshooting

**Error: "GAME_SERVER_PRIVATE_KEY environment variable is required"**
- Set the `GAME_SERVER_PRIVATE_KEY` in your `.env` file

**Error: "Transaction failed: execution reverted: Only game server"**
- The game server wallet is not authorized
- Run `npx hardhat run scripts/set-game-server.ts`

**Error: "insufficient funds for gas * price + value"**
- Game server wallet needs more RON
- Fund it from faucet (testnet) or send RON (mainnet)

**Error: "Transaction not found or not yet confirmed"**
- Player's transaction hasn't been mined yet
- Wait a few blocks or ask player to retry

### Architecture

```
┌─────────────────────────────────────────────────────┐
│                  MatchMaking.ts                     │
│  - Manages player queue                             │
│  - Verifies joinMatch transactions                  │
│  - Calls createMatch() when queue full              │
└────────────────┬────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────┐
│               ContractService.ts                    │
│  - Connects to Ronin blockchain                     │
│  - Calls smart contract functions                   │
│  - Verifies transactions                            │
│  - Handles errors and retries                       │
└────────────────┬────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────┐
│            RoninRumbleMain.sol                      │
│  - Stores match data on-chain                       │
│  - Handles entry fees and prize pool                │
│  - Distributes prizes automatically                 │
└─────────────────────────────────────────────────────┘
```

### Related Files

- `server/game/MatchMaking.ts` - Integrates contract creation and verification
- `server/game/GameRoom.ts` - Submits results at match end
- `contracts/RoninRumbleMain.sol` - Smart contract source
- `deployment.json` - Deployed contract addresses
- `contract-abis.json` - Contract ABIs for interaction
