# Blockchain Integration Guide

This document explains how Ronin Rumble integrates with the RoninRumbleMain smart contract to create fully on-chain matches with automated prize distribution.

## Overview

Ronin Rumble uses a **hybrid architecture**:
- **Off-chain**: Game logic, combat simulation, matchmaking (Node.js server)
- **On-chain**: Entry fees, match creation, prize distribution (Ronin blockchain)

This allows for fast, responsive gameplay while ensuring transparent and trustless prize handling.

---

## Architecture

```
┌─────────────────┐         ┌──────────────────┐         ┌─────────────────────┐
│                 │         │                  │         │                     │
│  Frontend App   │◄───────►│  Game Server     │◄───────►│  Smart Contract     │
│  (Next.js)      │         │  (Node.js)       │         │  (RoninRumbleMain)  │
│                 │         │                  │         │                     │
└─────────────────┘         └──────────────────┘         └─────────────────────┘
      │                            │                              │
      │ 1. joinMatch()             │                              │
      │    (pay entry fee)         │                              │
      ├────────────────────────────┼─────────────────────────────►│
      │                            │                              │
      │ 2. JOIN_QUEUE              │                              │
      │    (with tx hash)          │                              │
      ├───────────────────────────►│                              │
      │                            │                              │
      │                            │ 3. Verify transaction        │
      │                            ├─────────────────────────────►│
      │                            │                              │
      │                            │ 4. When 6 players ready:     │
      │                            │    createMatch()             │
      │                            ├─────────────────────────────►│
      │                            │    Returns matchId           │
      │                            │◄─────────────────────────────┤
      │                            │                              │
      │ 5. MATCH_FOUND             │                              │
      │◄───────────────────────────┤                              │
      │                            │                              │
      │ 6. Play game...            │                              │
      │    (off-chain)             │                              │
      │◄──────────────────────────►│                              │
      │                            │                              │
      │                            │ 7. Match ends:               │
      │                            │    submitMatchResults()      │
      │                            ├─────────────────────────────►│
      │                            │                              │
      │                            │                              │ Prizes
      │                            │                              │ calculated
      │                            │                              │ & stored
      │                            │                              │
      │ 8. PRIZES_CLAIMABLE        │                              │
      │◄───────────────────────────┤                              │
      │                            │                              │
      │ 9. claimRewards()          │                              │
      │    (withdraw winnings)     │                              │
      ├────────────────────────────┼─────────────────────────────►│
      │                            │                              │
      │◄─────────────────────── RON transferred ─────────────────┤
      │                            │                              │
```

---

## Setup Instructions

### 1. Install Dependencies

The integration uses ethers.js v6 for blockchain interaction:

```bash
cd server
npm install ethers@^6.13.0
```

### 2. Generate Game Server Wallet

The game server needs its own wallet to submit transactions:

```bash
# Using ethers.js
node -e "const ethers = require('ethers'); const w = ethers.Wallet.createRandom(); console.log('Address:', w.address); console.log('Private Key:', w.privateKey);"
```

**Output:**
```
Address: 0xYourGameServerAddress...
Private Key: 0xYourPrivateKey...
```

⚠️ **IMPORTANT**: Save the private key securely! Never commit it to version control.

### 3. Configure Environment

Copy `.env.example` to `.env` and configure:

```env
# Game Server Blockchain Configuration
RONIN_RPC_URL=https://saigon-testnet.roninchain.com/rpc
GAME_SERVER_PRIVATE_KEY=0xYourPrivateKeyHere
GAME_CONTRACT_ADDRESS=0x0B46aF2F581c163ff7b1dD6d2aFedDa86066ABDA
```

### 4. Set Game Server in Contract

The contract must authorize your game server wallet. If you're using the deployer wallet as the game server (default), this is already set. Otherwise, update it:

```bash
npx hardhat run scripts/set-game-server.ts --network roninTestnet
```

Or call `setGameServer()` directly from the owner wallet:

```javascript
await contract.setGameServer("0xYourGameServerAddress");
```

### 5. Fund Game Server Wallet

The game server needs RON for gas fees:

**Testnet:**
1. Visit [Ronin Faucet](https://faucet.roninchain.com/)
2. Request testnet RON for your game server address
3. Recommended: 0.1 RON (enough for ~100-200 transactions)

**Mainnet:**
1. Transfer real RON to the game server wallet
2. Monitor balance and set up auto-refill alerts

### 6. Test the Integration

```bash
# Compile contracts
npm run compile

# Run contract tests
npm run test:contracts

# Start the game server
npm run dev:server

# In another terminal, start the frontend
npm run dev
```

---

## How It Works

### Flow 1: Player Joins Match

**Frontend (Player):**
```typescript
// 1. Player calls joinMatch on contract
const tx = await writeContract({
  address: GAME_CONTRACT_ADDRESS,
  abi: GAME_CONTRACT_ABI,
  functionName: 'joinMatch',
  args: [matchId],
  value: parseEther('0.001'), // Entry fee
});

// 2. Wait for transaction
await tx.wait();

// 3. Send transaction hash to server
socket.emit('client_event', {
  type: 'JOIN_QUEUE',
  data: {
    entryFee: 0.001,
    transactionHash: tx.hash,
  },
});
```

**Server:**
```typescript
// 1. Receive JOIN_QUEUE event with transaction hash
async function handleJoinQueue(socket, entryFee, transactionHash) {
  // 2. Verify transaction on blockchain
  const receipt = await provider.getTransactionReceipt(transactionHash);

  // 3. Verify transaction succeeded and is to our contract
  if (receipt.status !== 1) throw new Error('Transaction failed');
  if (receipt.to !== GAME_CONTRACT_ADDRESS) throw new Error('Wrong contract');

  // 4. Parse PlayerJoinedMatch event
  const event = parsePlayerJoinedEvent(receipt);

  // 5. Add to queue
  await matchMaking.addToQueue(socket.id, entryFee, transactionHash);
}
```

### Flow 2: Match Creation

**Server (when 6 players in queue):**
```typescript
async function tryCreateMatch() {
  // 1. Take 6 players from queue
  const matchPlayers = queue.splice(0, 6);
  const entryFee = matchPlayers[0].entryFee;

  // 2. Create match on blockchain
  const blockchainMatchId = await contractService.createMatch(entryFee);

  // 3. Link blockchain match to game room
  const gameRoom = new GameRoom(
    localMatchId,
    matchPlayers,
    io,
    contractService,
    blockchainMatchId // Link to on-chain match
  );

  // 4. Notify players
  matchPlayers.forEach(({ socketId }) => {
    io.to(socketId).emit('server_event', {
      type: 'MATCH_FOUND',
      data: {
        id: localMatchId,
        blockchainMatchId, // Players know the on-chain match ID
        entryFee,
        prizePool: entryFee * 6,
      },
    });
  });

  // 5. Start game
  gameRoom.start();
}
```

**Smart Contract:**
```solidity
function createMatch(uint256 _entryFee) external onlyGameServer returns (uint256) {
    uint256 matchId = nextMatchId++;

    Match storage newMatch = matches[matchId];
    newMatch.entryFee = _entryFee;
    newMatch.timestamp = block.timestamp;

    emit MatchCreated(matchId, _entryFee, block.timestamp);

    return matchId;
}
```

### Flow 3: Results Submission

**Server (when match ends):**
```typescript
async function endMatch() {
  // 1. Get final placements
  const sortedPlayers = Array.from(players.values())
    .sort((a, b) => a.placement - b.placement);

  // 2. Extract addresses and placements
  const playerAddresses = sortedPlayers.map(p => p.address);
  const playerPlacements = sortedPlayers.map(p => p.placement);

  // 3. Submit to blockchain
  await contractService.submitMatchResults(
    blockchainMatchId,
    playerAddresses,  // [0xWinner, 0x2nd, 0x3rd, 0x4th, 0x5th, 0x6th]
    playerPlacements  // [1, 2, 3, 4, 5, 6]
  );

  // 4. Notify players prizes are claimable
  io.emit('server_event', {
    type: 'PRIZES_CLAIMABLE',
    data: { blockchainMatchId },
  });
}
```

**Smart Contract:**
```solidity
function submitMatchResults(
    uint256 _matchId,
    address[6] calldata _players,
    uint8[6] calldata _placements
) external onlyGameServer {
    // 1. Validate input
    require(!matches[_matchId].finalized, "Already finalized");
    _validateMatchData(_matchId, _players, _placements);

    // 2. Store results
    matches[_matchId].players = _players;
    matches[_matchId].placements = _placements;
    matches[_matchId].finalized = true;

    // 3. Distribute prizes
    _distributePrizes(_matchId, _players, _placements, matches[_matchId].prizePool);

    emit MatchFinalized(_matchId, _players, _placements, matches[_matchId].prizePool);
}

function _distributePrizes(...) internal {
    uint256 platformFee = (prizePool * 83) / 1000;  // 8.3%
    totalPlatformFees += platformFee;

    uint256 distributionPool = prizePool - platformFee;
    uint256 firstPrize = (distributionPool * 720) / 1000;   // 72%
    uint256 secondPrize = (distributionPool * 180) / 1000;  // 18%
    uint256 thirdPrize = (distributionPool * 100) / 1000;   // 10%

    for (uint256 i = 0; i < 6; i++) {
        if (_placements[i] == 1) playerBalances[_players[i]] += firstPrize;
        else if (_placements[i] == 2) playerBalances[_players[i]] += secondPrize;
        else if (_placements[i] == 3) playerBalances[_players[i]] += thirdPrize;
    }
}
```

### Flow 4: Claiming Prizes

**Frontend (Winner):**
```typescript
// Check claimable balance
const balance = await readContract({
  address: GAME_CONTRACT_ADDRESS,
  abi: GAME_CONTRACT_ABI,
  functionName: 'getPlayerBalance',
  args: [playerAddress],
});

console.log(`Claimable: ${balance} RON`);

// Claim rewards
const tx = await writeContract({
  address: GAME_CONTRACT_ADDRESS,
  abi: GAME_CONTRACT_ABI,
  functionName: 'claimRewards',
  args: [],
});

await tx.wait();
// RON is now in player's wallet!
```

**Smart Contract:**
```solidity
function claimRewards() external nonReentrant {
    uint256 balance = playerBalances[msg.sender];
    require(balance > 0, "No rewards to claim");

    // Clear balance BEFORE transfer (prevent re-entrancy)
    playerBalances[msg.sender] = 0;

    // Transfer RON to player
    (bool success, ) = msg.sender.call{value: balance}("");
    require(success, "Transfer failed");

    emit RewardClaimed(msg.sender, balance);
}
```

---

## Key Components

### ContractService.ts

Located in `server/services/ContractService.ts`, this service handles all blockchain interactions:

```typescript
class ContractService {
  // Create match on-chain
  async createMatch(entryFee: number): Promise<number>

  // Verify player's joinMatch transaction
  async verifyJoinMatch(txHash: string, matchId: number, player: string, fee: number): Promise<boolean>

  // Submit final results and trigger prize distribution
  async submitMatchResults(matchId: number, players: string[], placements: number[]): Promise<void>

  // Query functions
  async getMatch(matchId: number): Promise<MatchData>
  async isPlayerInMatch(matchId: number, player: string): Promise<boolean>
  async getPlayerBalance(player: string): Promise<string>
}
```

### MatchMaking.ts

Integrates contract service for match creation:

```typescript
class MatchMaking {
  private contractService: ContractService | null;

  // Verify transaction before adding to queue
  async addToQueue(socketId: string, entryFee: number, txHash?: string): Promise<void>

  // Create match on blockchain when queue is full
  private async tryCreateMatch(): Promise<void>
}
```

### GameRoom.ts

Submits results at match end:

```typescript
class GameRoom {
  private contractService: ContractService | null;
  private blockchainMatchId: number | null;

  // Submit results to blockchain
  private async endMatch(): Promise<void>
}
```

---

## Security Considerations

### 1. Private Key Management

**Development:**
- Use `.env` file (git-ignored)
- Never commit private keys

**Production:**
- Use environment variables in hosting platform
- Consider AWS Secrets Manager / HashiCorp Vault
- Rotate keys regularly
- Use different wallets for testnet/mainnet

### 2. Transaction Verification

The server verifies all player transactions:

```typescript
// Check transaction succeeded
if (receipt.status !== 1) throw new Error('Transaction failed');

// Check correct contract
if (receipt.to !== GAME_CONTRACT_ADDRESS) throw new Error('Wrong contract');

// Parse event to verify parameters
const event = parsePlayerJoinedEvent(receipt);
if (event.matchId !== expectedMatchId) throw new Error('Match ID mismatch');
```

### 3. Trust Model

- **Game Server is Trusted**: Only the authorized game server can submit results
- **Players Cannot Cheat**: Entry fees are verified on-chain before game starts
- **Results are Immutable**: Once submitted, results cannot be changed
- **No Game Logic On-Chain**: The contract trusts the server's placements

### 4. Gas Management

Monitor gas costs and wallet balance:

```typescript
// Estimate gas for transactions
const gasLimit = await contract.estimateGas.submitMatchResults(...);

// Check wallet balance
const balance = await provider.getBalance(gameServerAddress);
if (balance < minimumBalance) {
  alertAdmin('Game server wallet low on RON');
}
```

**Gas Cost Estimates (Ronin testnet):**
- `createMatch()`: ~50,000-80,000 gas
- `submitMatchResults()`: ~120,000-200,000 gas
- Gas price on Ronin: ~20 gwei

**Daily Costs (1000 matches/day):**
- Testnet: Free (faucet)
- Mainnet: ~0.2-0.4 RON/day at current prices

---

## Error Handling

### Common Errors

**1. "GAME_SERVER_PRIVATE_KEY environment variable is required"**
```
Solution: Set GAME_SERVER_PRIVATE_KEY in .env file
```

**2. "Transaction failed: execution reverted: Only game server"**
```
Solution: Run setGameServer() to authorize your wallet
Command: npx hardhat run scripts/set-game-server.ts --network roninTestnet
```

**3. "insufficient funds for gas * price + value"**
```
Solution: Fund game server wallet with testnet RON
Faucet: https://faucet.roninchain.com/
```

**4. "Transaction not found or not yet confirmed"**
```
Solution: Wait for transaction confirmation, or ask player to retry
Note: Ronin blocks are ~3 seconds
```

**5. "Invalid player count: 5. Expected 6"**
```
Solution: Ensure all 6 players remain in match until end
Cause: Player disconnected before match ended
```

### Retry Logic

The ContractService includes automatic retry for network errors:

```typescript
async function submitWithRetry(fn: () => Promise<any>, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await sleep(1000 * (i + 1)); // Exponential backoff
    }
  }
}
```

---

## Testing

### Unit Tests

```bash
# Run contract tests
npm run test:contracts

# Test specific function
npx hardhat test --grep "submitMatchResults"
```

### Integration Tests

```bash
# Start local blockchain (optional)
npx hardhat node

# Deploy contracts
npm run deploy:testnet

# Create test match
npm run create-match

# Test full flow
npm run test:integration
```

### Manual Testing

1. **Start server with blockchain integration:**
   ```bash
   GAME_SERVER_PRIVATE_KEY=0x... npm run dev:server
   ```

2. **Connect wallet in frontend:**
   - Use testnet (Saigon)
   - Get testnet RON from faucet

3. **Join match:**
   - Call `joinMatch()` on contract
   - Copy transaction hash
   - Join queue with tx hash

4. **Wait for match:**
   - Server creates match when 6 players ready
   - Check console for blockchain transaction

5. **Play and finish:**
   - Complete match
   - Server submits results
   - Check your claimable balance

6. **Claim prizes:**
   - Call `claimRewards()`
   - Verify RON in wallet

---

## Monitoring & Analytics

### Key Metrics

**Blockchain Transactions:**
- Match creation success rate
- Result submission success rate
- Average gas cost
- Transaction confirmation time

**Player Actions:**
- joinMatch() call rate
- claimRewards() call rate
- Unclaimed prize pool value

**Server Health:**
- ContractService initialization success
- Transaction verification pass rate
- API call latency to Ronin RPC

### Logging

The integration logs all blockchain operations:

```
🔗 Creating match on blockchain with entry fee: 0.001 RON
   Transaction sent: 0xabc123...
   ✅ Transaction confirmed in block 12345678
   🎮 Match created with ID: 42

🔍 Verifying joinMatch transaction: 0xdef456...
   ✅ Transaction verified successfully

🏆 Submitting match results for match 42
   Players: 6
   Placements: 1, 2, 3, 4, 5, 6
   Transaction sent: 0x789xyz...
   ✅ Results submitted in block 12345680
   🥇 1st place: 0xWinner...
   🥈 2nd place: 0x2ndPlace...
   🥉 3rd place: 0x3rdPlace...
```

### Dashboards

Consider monitoring:
- Wallet balance alerts
- Failed transaction alerts
- Match creation rate
- Prize distribution rate
- Unclaimed prize amount

---

## Deployment Checklist

### Testnet Deployment

- [ ] Deploy contracts to Ronin testnet
- [ ] Verify contracts on Ronin Explorer
- [ ] Generate game server wallet
- [ ] Set game server address in contract
- [ ] Fund game server with testnet RON (0.1 RON)
- [ ] Configure `.env` with testnet RPC and private key
- [ ] Test match creation
- [ ] Test result submission
- [ ] Test prize claiming
- [ ] Monitor gas costs

### Mainnet Deployment

- [ ] **Security audit** of smart contracts
- [ ] Deploy to Ronin mainnet
- [ ] Verify on mainnet Explorer
- [ ] Generate new mainnet game server wallet
- [ ] Set mainnet game server address
- [ ] Fund with mainnet RON (start with 1 RON)
- [ ] Update `.env` to mainnet RPC
- [ ] Set up monitoring and alerts
- [ ] Enable auto-refill for game server wallet
- [ ] Test with small entry fees first
- [ ] Gradual rollout to users
- [ ] Monitor 24/7 for first week

---

## Advanced Topics

### Multi-Server Setup

For high availability, run multiple game servers with load balancing:

```typescript
// Each server uses the same game server wallet
// Implement distributed locking for match creation
const lockKey = `match-creation-lock`;
await redisClient.set(lockKey, serverId, 'EX', 10, 'NX');
```

### Gas Optimization

Reduce gas costs by batching operations:

```typescript
// Instead of creating matches individually
// Batch multiple match creations in one transaction
async createMatches(entryFees: number[]): Promise<number[]>
```

### Failover Strategy

Handle blockchain downtime gracefully:

```typescript
if (!contractService || !contractService.isHealthy()) {
  // Allow free matches during downtime
  // Store results for later submission
  queueResultsForLaterSubmission(matchResults);
}
```

### Analytics Integration

Track blockchain events:

```typescript
contract.on('MatchCreated', (matchId, entryFee, timestamp) => {
  analytics.track('Match Created', {
    matchId,
    entryFee: ethers.formatEther(entryFee),
    timestamp,
  });
});
```

---

## Additional Resources

- [Ronin Documentation](https://docs.roninchain.com/)
- [Ethers.js Documentation](https://docs.ethers.org/)
- [Hardhat Documentation](https://hardhat.org/docs)
- [Smart Contract Security Best Practices](https://consensys.github.io/smart-contract-best-practices/)

---

## Support

For issues with blockchain integration:

1. Check server logs for error messages
2. Verify environment configuration
3. Test RPC connectivity: `curl https://saigon-testnet.roninchain.com/rpc`
4. Check game server wallet balance
5. Review this documentation
6. Open GitHub issue with logs and error details
