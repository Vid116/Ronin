# Quick Start: Blockchain Integration

This is a quick reference guide to get the blockchain integration running. For detailed information, see `BLOCKCHAIN_INTEGRATION.md`.

---

## ⚡ 5-Minute Setup

### Step 1: Generate Wallet (30 seconds)

```bash
node -e "const ethers = require('ethers'); const w = ethers.Wallet.createRandom(); console.log('Address:', w.address); console.log('Private Key:', w.privateKey);"
```

**Save the output:**
- Address: `0x...` (your game server address)
- Private Key: `0x...` (keep this SECRET!)

---

### Step 2: Configure Environment (1 minute)

Create `.env` file in project root:

```bash
cp .env.example .env
```

Edit `.env` and add:

```env
GAME_SERVER_PRIVATE_KEY=0xYourPrivateKeyFromStep1
```

That's it! The rest of the config uses defaults.

---

### Step 3: Fund Wallet (2 minutes)

**Testnet (recommended for testing):**

1. Visit: https://faucet.roninchain.com/
2. Enter your game server address from Step 1
3. Click "Request RON"
4. Wait for confirmation (~10 seconds)

**Amount needed:** 0.1 RON (enough for ~100-200 matches)

---

### Step 4: Verify Setup (1 minute)

Check if your wallet is authorized:

```bash
# Check game server address in deployed contract
cat deployment.json | grep gameServer
```

**Should show:**
```json
"gameServer": "0xfDF0e775aC0E946DC940e3ad301e1E64fc722C51"
```

**If your wallet address is different**, authorize it:

```bash
npx hardhat run scripts/set-game-server.ts --network roninTestnet
```

---

### Step 5: Start Server (30 seconds)

```bash
npm run dev:server
```

**Look for:**
```
📝 Contract Service initialized
   Contract: 0x0B46aF2F581c163ff7b1dD6d2aFedDa86066ABDA
   Game Server: 0xYourAddress
   Network: https://saigon-testnet.roninchain.com/rpc

✅ ContractService initialized in MatchMaking
```

**If you see errors:**
- ❌ "GAME_SERVER_PRIVATE_KEY required" → Check Step 2
- ❌ "insufficient funds" → Go back to Step 3
- ❌ "Only game server" → Run the command in Step 4

---

## ✅ You're Done!

Your game server is now connected to the blockchain. When players:

1. Call `joinMatch()` and pay entry fee → ✅ Server verifies transaction
2. 6 players join → ✅ Server creates match on-chain
3. Match ends → ✅ Server submits results
4. Winners call `claimRewards()` → ✅ Smart contract pays out prizes

---

## 🧪 Quick Test

### Test with 6 Players:

1. **Frontend:** Connect wallet, call `joinMatch()`, pay 0.001 RON
2. **Copy transaction hash**
3. **Send to server:**
   ```javascript
   socket.emit('client_event', {
     type: 'JOIN_QUEUE',
     data: {
       entryFee: 0.001,
       transactionHash: '0xYourTxHash'
     }
   });
   ```
4. **Repeat for 5 more players**
5. **Watch server console:**
   ```
   🔗 Creating match on blockchain with entry fee: 0.001 RON
      Transaction sent: 0xabc...
      ✅ Transaction confirmed in block 12345
      🎮 Match created with ID: 1
   ```
6. **Play match to completion**
7. **Watch for:**
   ```
   🏆 Submitting match results for match 1
      ✅ Results submitted in block 12350
      🥇 1st place: 0xWinner...
   ```
8. **Winners claim prizes:**
   ```javascript
   await contract.claimRewards();
   ```

---

## 📊 Check Status

### View on Blockchain Explorer:

**Testnet:** https://saigon-app.roninchain.com/

Search for:
- Your game server address
- Contract address: `0x0B46aF2F581c163ff7b1dD6d2aFedDa86066ABDA`
- Player transaction hashes

You'll see all `createMatch()` and `submitMatchResults()` transactions!

---

## 🔧 Troubleshooting

| Problem | Solution |
|---------|----------|
| Server won't start | Check `.env` has `GAME_SERVER_PRIVATE_KEY` |
| "Only game server" error | Run `npx hardhat run scripts/set-game-server.ts --network roninTestnet` |
| "Insufficient funds" | Get more testnet RON from faucet |
| "Transaction not found" | Wait 10 seconds for blockchain confirmation |
| Contract not initialized | Check server logs for ContractService errors |

---

## 📈 Monitor Your Server

### Check Wallet Balance:

Visit: `https://saigon-app.roninchain.com/address/YOUR_GAME_SERVER_ADDRESS`

**Low balance?** Get more from faucet or send RON.

### Gas Costs:

- **createMatch()**: ~0.0001 RON per match
- **submitMatchResults()**: ~0.0002 RON per match
- **Total per match**: ~0.0003 RON

**0.1 RON** = ~300 matches

---

## 🚀 Go to Production

When you're ready for mainnet:

1. **Get contracts audited** (CRITICAL for security)
2. **Deploy to Ronin mainnet:**
   ```bash
   npm run deploy:mainnet
   ```
3. **Generate NEW mainnet game server wallet**
4. **Update `.env` with mainnet RPC:**
   ```env
   RONIN_RPC_URL=https://api.roninchain.com/rpc
   ```
5. **Fund wallet with REAL RON** (start with 1 RON)
6. **Set game server in mainnet contract**
7. **Test with small entry fees first**
8. **Monitor 24/7**

---

## 📚 Full Documentation

- **Complete Guide**: `BLOCKCHAIN_INTEGRATION.md`
- **Implementation Summary**: `INTEGRATION_SUMMARY.md`
- **API Reference**: `server/services/README.md`
- **Contract Details**: `contracts/README.md`

---

## 🎯 Quick Commands

```bash
# Start server with blockchain
npm run dev:server

# Check contract deployment
cat deployment.json

# Create test match manually
npm run create-match

# Run contract tests
npm run test:contracts

# Deploy to testnet
npm run deploy:testnet

# Verify on explorer
npm run verify:testnet
```

---

## ✨ That's It!

You now have a fully functional blockchain-integrated auto battler game with:

✅ On-chain match creation
✅ Transaction verification
✅ Automatic prize distribution
✅ Transparent, trustless results

**Need help?** See the full documentation in `BLOCKCHAIN_INTEGRATION.md` or open an issue on GitHub.

Happy building! 🎮⛓️
