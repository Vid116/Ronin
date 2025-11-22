# Ronin Rumble Smart Contract Deployment Checklist

## Pre-Deployment

### 1. Environment Setup
- [ ] Install all dependencies: `npm install`
- [ ] Create `.env` file from `.env.example`
- [ ] Add `PRIVATE_KEY` (deployer wallet private key)
- [ ] Add `GAME_SERVER_ADDRESS` (authorized game server address)
- [ ] Set `NFT_BASE_URI` (metadata API endpoint)
- [ ] Verify RPC URLs are correct

### 2. Testing
- [ ] Compile contracts: `npm run compile`
- [ ] Run all tests: `npm run test:contracts`
- [ ] Check test coverage: `npm run coverage:contracts`
- [ ] Review gas costs: `npm run test:contracts:gas`
- [ ] All tests passing (30+ tests)

### 3. Code Review
- [ ] Review `RoninRumbleMain.sol` for security issues
- [ ] Review `RoninRumbleNFT.sol` for security issues
- [ ] Verify prize distribution percentages (72%, 18%, 10%)
- [ ] Verify platform fee (8.3%)
- [ ] Verify entry fee tiers (2, 10, 50 RON)
- [ ] Check rarity supply limits

### 4. Wallet Preparation
- [ ] Deployer wallet has sufficient RON for gas (~2-3 RON recommended)
- [ ] Game server wallet address is known
- [ ] Owner wallet is secure (controls admin functions)

## Testnet Deployment (Saigon)

### 1. Deploy Contracts
```bash
npm run deploy:testnet
```

- [ ] Deployment successful
- [ ] `deployment.json` created
- [ ] `contract-abis.json` created
- [ ] Contract addresses recorded

### 2. Verify Contracts
```bash
npm run verify:testnet
```

- [ ] RoninRumbleMain verified on explorer
- [ ] RoninRumbleNFT verified on explorer
- [ ] Contract source code visible on explorer

### 3. Test Deployment
```bash
npm run create-match
npm run mint-nft
```

- [ ] Test match created successfully
- [ ] Test NFTs minted successfully
- [ ] Explorer shows transactions

### 4. Frontend Integration
- [ ] Update frontend with contract addresses
- [ ] Import generated TypeScript types
- [ ] Test wallet connection
- [ ] Test joining a match
- [ ] Test claiming rewards
- [ ] Test NFT minting (if applicable)

### 5. Backend Integration
- [ ] Update game server with contract addresses
- [ ] Configure game server private key
- [ ] Test match creation from server
- [ ] Test result submission from server
- [ ] Verify prize distribution is correct

### 6. End-to-End Testing
- [ ] Create match from game server
- [ ] 6 players join with wallets
- [ ] Play full game
- [ ] Submit results from server
- [ ] Players claim rewards successfully
- [ ] Verify balances are correct
- [ ] Test NFT equipping (if applicable)

## Mainnet Preparation

### 1. Security Audit
- [ ] Contract code reviewed by security expert
- [ ] Test suite covers all edge cases
- [ ] No critical vulnerabilities found
- [ ] Gas optimizations reviewed
- [ ] Access control verified

### 2. Final Checks
- [ ] All testnet tests successful
- [ ] No bugs found in week of testing
- [ ] Prize distribution verified accurate
- [ ] Platform fee collection working
- [ ] Emergency pause function tested

### 3. Mainnet Wallet Setup
- [ ] Mainnet deployer wallet funded (5-10 RON recommended)
- [ ] Mainnet game server wallet created
- [ ] Owner wallet secured (hardware wallet recommended)
- [ ] Backup private keys stored securely

## Mainnet Deployment

### 1. Deploy to Mainnet
```bash
npm run deploy:mainnet
```

- [ ] Deployment successful
- [ ] Contract addresses saved
- [ ] Transaction hashes recorded
- [ ] Gas costs acceptable

### 2. Verify on Mainnet
```bash
npm run verify:mainnet
```

- [ ] Contracts verified on mainnet explorer
- [ ] Source code visible and matches

### 3. Configuration
- [ ] Update production `.env` with mainnet addresses
- [ ] Update frontend production config
- [ ] Update game server production config
- [ ] Set appropriate NFT base URI for production

### 4. Initial Setup
- [ ] Transfer ownership if needed
- [ ] Set game server address correctly
- [ ] Verify all permissions are correct
- [ ] Test pause/unpause functionality

## Post-Deployment

### 1. Monitoring Setup
- [ ] Set up event listeners for critical events:
  - [ ] MatchCreated
  - [ ] PlayerJoinedMatch
  - [ ] MatchFinalized
  - [ ] RewardClaimed
  - [ ] Platform fee withdrawals
- [ ] Set up alerts for unusual activity
- [ ] Monitor contract balance
- [ ] Monitor platform fee accumulation

### 2. Documentation
- [ ] Update README with mainnet addresses
- [ ] Document deployment date/time
- [ ] Record initial configuration
- [ ] Create runbook for common operations

### 3. Team Access
- [ ] Share contract addresses with team
- [ ] Share ABI files with frontend team
- [ ] Share deployment info with backend team
- [ ] Ensure all team members can access explorer

### 4. User Communication
- [ ] Announce contract deployment
- [ ] Share contract addresses publicly
- [ ] Provide instructions for users
- [ ] Set up support channels

## Ongoing Maintenance

### Weekly Checks
- [ ] Monitor contract activity
- [ ] Check for any failed transactions
- [ ] Verify prize distributions are correct
- [ ] Review platform fee withdrawals

### Monthly Tasks
- [ ] Review gas costs
- [ ] Check for any issues reported by users
- [ ] Consider optimizations if needed
- [ ] Backup important data

## Emergency Procedures

### If Critical Bug Found
1. [ ] Pause contracts immediately: `contract.pause()`
2. [ ] Notify all users
3. [ ] Assess severity
4. [ ] Plan fix or migration
5. [ ] Emergency withdrawal if needed (when paused)

### Contact Information
- **Contract Owner**: [Add wallet address]
- **Game Server**: [Add address]
- **Deployment Date**: [Add date]
- **Network**: Ronin Mainnet (2020) / Testnet (2021)

## Contract Addresses

### Testnet (Saigon - Chain ID 2021)
- **RoninRumbleMain**: [Fill after deployment]
- **RoninRumbleNFT**: [Fill after deployment]
- **Deployed**: [Date/Time]
- **Explorer**: https://saigon-app.roninchain.com

### Mainnet (Chain ID 2020)
- **RoninRumbleMain**: [Fill after deployment]
- **RoninRumbleNFT**: [Fill after deployment]
- **Deployed**: [Date/Time]
- **Explorer**: https://app.roninchain.com

## Quick Reference

### Common Operations

**Pause Contracts (Emergency)**
```bash
npx hardhat console --network roninMainnet
> const contract = await ethers.getContractAt("RoninRumbleMain", "0x...")
> await contract.pause()
```

**Withdraw Platform Fees**
```bash
> await contract.withdrawPlatformFees()
```

**Update Game Server**
```bash
> await contract.setGameServer("0xNEW_ADDRESS")
```

**Check Contract Status**
```bash
> await contract.paused() // true/false
> await contract.totalPlatformFees() // amount in wei
> await contract.nextMatchId() // next match ID
```

## Notes

- Always test on testnet first
- Keep private keys secure
- Monitor gas prices before deployment
- Have emergency plan ready
- Document all changes
- Communicate with users

---

**Last Updated**: 2025-11-22
**Version**: 1.0.0
