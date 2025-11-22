# Ronin Rumble Smart Contracts

Complete Solidity smart contracts for Ronin Chain integration with the Ronin Rumble auto battler game.

## Overview

This system includes two main contracts:

1. **RoninRumbleMain** - Handles match entry fees, prize distribution, and game results
2. **RoninRumbleNFT** - Optional NFT contract for cosmetic card skins

## Contract Addresses

After deployment, contract addresses will be saved in `deployment.json`:

```json
{
  "contracts": {
    "RoninRumbleMain": {
      "address": "0x..."
    },
    "RoninRumbleNFT": {
      "address": "0x..."
    }
  }
}
```

## RoninRumbleMain Contract

### Features

- **Entry Fee Tiers**: 2, 10, and 50 RON
- **6-Player Matches**: Battle royale format with 6 players per match
- **Prize Distribution**:
  - 1st Place: 72% of prize pool
  - 2nd Place: 18% of prize pool
  - 3rd Place: 10% of prize pool
  - Platform Fee: 8.3%
- **Security**: ReentrancyGuard, Pausable, Access Control

### Key Functions

#### Player Functions

```solidity
// Join a match by paying the entry fee
function joinMatch(uint256 _matchId) external payable;

// Claim accumulated rewards
function claimRewards() external;

// Withdraw balance (alias for claimRewards)
function withdrawBalance() external;

// View functions
function getMatch(uint256 _matchId) external view returns (...);
function getPlayerBalance(address _player) external view returns (uint256);
function isPlayerInMatch(uint256 _matchId, address _player) external view returns (bool);
```

#### Game Server Functions

```solidity
// Create a new match
function createMatch(uint256 _entryFee) external returns (uint256 matchId);

// Submit match results and distribute prizes
function submitMatchResults(
    uint256 _matchId,
    address[6] calldata _players,
    uint8[6] calldata _placements
) external;
```

#### Owner Functions

```solidity
// Admin controls
function setGameServer(address _newGameServer) external;
function pause() external;
function unpause() external;
function withdrawPlatformFees() external;
function emergencyWithdraw() external; // Only when paused
```

### Events

```solidity
event MatchCreated(uint256 indexed matchId, uint256 entryFee, uint256 timestamp);
event PlayerJoinedMatch(uint256 indexed matchId, address indexed player, uint256 entryFee);
event MatchFinalized(uint256 indexed matchId, address[6] players, uint8[6] placements, uint256 prizePool);
event RewardClaimed(address indexed player, uint256 amount);
event BalanceWithdrawn(address indexed player, uint256 amount);
```

## RoninRumbleNFT Contract

### Features

- **ERC-721 NFT Standard** for card skins
- **Rarity System**: Common, Rare, Epic, Legendary, Mythic
- **Equip/Unequip System**: Players can equip skins for specific card types
- **Mint Limits**: Each rarity has a maximum supply

### Key Functions

```solidity
// Mint a new card skin (owner only)
function mintCardSkin(
    address to,
    string memory name,
    string memory cardType,
    Rarity rarity,
    string memory tokenURI
) external returns (uint256);

// Equip/unequip skins
function equipSkin(uint256 tokenId) external;
function unequipSkin(string memory cardType) external;

// View functions
function getEquippedSkin(address player, string memory cardType) external view returns (uint256);
function getTokensByOwner(address owner) external view returns (uint256[] memory);
function getCardSkin(uint256 tokenId) external view returns (...);
```

### Rarity Limits

| Rarity    | Max Supply |
|-----------|------------|
| Common    | 10,000     |
| Rare      | 5,000      |
| Epic      | 2,000      |
| Legendary | 500        |
| Mythic    | 100        |

## Setup & Installation

### Prerequisites

- Node.js v18+
- npm or yarn
- Hardhat

### Install Dependencies

```bash
npm install
```

### Environment Configuration

Create a `.env` file:

```env
# Deployment
PRIVATE_KEY=your_private_key_here
GAME_SERVER_ADDRESS=0x...

# RPC URLs
RONIN_TESTNET_RPC=https://saigon-testnet.roninchain.com/rpc
RONIN_MAINNET_RPC=https://api.roninchain.com/rpc

# NFT Configuration
NFT_BASE_URI=https://api.roninrumble.com/metadata/

# Optional
RONIN_EXPLORER_API_KEY=
REPORT_GAS=false
```

## Compilation

```bash
npx hardhat compile
```

This generates:
- Contract artifacts in `artifacts/`
- TypeScript types in `typechain-types/`

## Testing

Run the comprehensive test suite:

```bash
# Run all tests
npx hardhat test

# Run specific test file
npx hardhat test contracts/test/RoninRumble.test.ts

# Run with gas reporting
REPORT_GAS=true npx hardhat test

# Run with coverage
npx hardhat coverage
```

### Test Coverage

The test suite includes:
- Contract deployment
- Match creation and joining
- Match finalization and prize distribution
- Reward claiming
- Platform fee withdrawal
- NFT minting and equipping
- Admin functions
- Edge cases and security validations

## Deployment

### Deploy to Ronin Testnet (Saigon)

```bash
npx hardhat run scripts/deploy.ts --network roninTestnet
```

### Deploy to Ronin Mainnet

```bash
npx hardhat run scripts/deploy.ts --network roninMainnet
```

### Deployment Output

After deployment, the script creates:

1. `deployment.json` - Contract addresses and deployment info
2. `contract-abis.json` - Simplified ABIs for frontend integration

### Verify Contracts

```bash
npx hardhat run scripts/verify.ts --network roninTestnet
```

## Usage Examples

### Create a Match (Game Server)

```typescript
import { ethers } from "hardhat";

const contract = await ethers.getContractAt("RoninRumbleMain", contractAddress);
const TIER_2 = ethers.parseEther("10"); // 10 RON

const tx = await contract.createMatch(TIER_2);
const receipt = await tx.wait();

const event = receipt.logs.find(log => log.fragment?.name === "MatchCreated");
const matchId = event.args[0];
console.log("Match ID:", matchId);
```

### Join a Match (Player)

```typescript
const TIER_2 = ethers.parseEther("10");

const tx = await contract.connect(player).joinMatch(matchId, {
  value: TIER_2
});
await tx.wait();
```

### Submit Match Results (Game Server)

```typescript
const players = [
  "0xPlayer1...",
  "0xPlayer2...",
  "0xPlayer3...",
  "0xPlayer4...",
  "0xPlayer5...",
  "0xPlayer6..."
];

const placements = [1, 2, 3, 4, 5, 6]; // 1st place, 2nd place, etc.

const tx = await contract.submitMatchResults(matchId, players, placements);
await tx.wait();
```

### Claim Rewards (Player)

```typescript
const balance = await contract.getPlayerBalance(playerAddress);
console.log("Claimable:", ethers.formatEther(balance), "RON");

const tx = await contract.connect(player).claimRewards();
await tx.wait();
```

### Mint NFT (Owner)

```typescript
const nftContract = await ethers.getContractAt("RoninRumbleNFT", nftAddress);

const tx = await nftContract.mintCardSkin(
  playerAddress,
  "Dragon Warrior",
  "Warrior",
  3, // LEGENDARY
  "dragon-warrior.json"
);

const receipt = await tx.wait();
const event = receipt.logs.find(log => log.fragment?.name === "CardSkinMinted");
const tokenId = event.args[0];
```

## Utility Scripts

### Create Test Match

```bash
npx hardhat run scripts/create-match.ts --network roninTestnet
```

### Mint Test NFTs

```bash
npx hardhat run scripts/mint-nft.ts --network roninTestnet
```

## Security Features

### RoninRumbleMain

1. **ReentrancyGuard**: Protects against reentrancy attacks
2. **Pausable**: Emergency pause functionality
3. **Access Control**: Only authorized game server can submit results
4. **Input Validation**:
   - Valid entry fees only (2, 10, or 50 RON)
   - Placement validation (1-6, unique)
   - Player verification (must be in match)
5. **Safe Transfers**: Uses call pattern with proper error handling

### RoninRumbleNFT

1. **ERC-721 Standard**: Industry-standard NFT implementation
2. **Pausable**: Emergency pause functionality
3. **Supply Limits**: Enforced rarity limits
4. **Ownership Checks**: Only owners can equip their NFTs

## Gas Optimization

- Optimized for 200 runs
- Efficient storage patterns
- Minimal external calls
- Batch operations where possible

## Network Configuration

### Ronin Testnet (Saigon)
- Chain ID: 2021
- RPC: https://saigon-testnet.roninchain.com/rpc
- Explorer: https://saigon-app.roninchain.com

### Ronin Mainnet
- Chain ID: 2020
- RPC: https://api.roninchain.com/rpc
- Explorer: https://app.roninchain.com

## Prize Distribution Example

For a 10 RON entry fee match (6 players):

- **Total Prize Pool**: 60 RON
- **Platform Fee (8.3%)**: 4.98 RON
- **Distribution Pool**: 55.02 RON
  - **1st Place (72%)**: 39.61 RON
  - **2nd Place (18%)**: 9.90 RON
  - **3rd Place (10%)**: 5.50 RON
  - **4th-6th Place**: 0 RON

## Troubleshooting

### Common Issues

1. **"Invalid entry fee tier"**
   - Use only 2, 10, or 50 RON as entry fees

2. **"Only game server can call this"**
   - Ensure game server address is correctly set
   - Use the authorized game server account

3. **"Match is full"**
   - Match already has 6 players
   - Create a new match

4. **"Already in this match"**
   - Each address can only join a match once

5. **Gas estimation errors**
   - Increase gas limit manually
   - Check network connectivity

## Frontend Integration

Import the generated ABIs:

```typescript
import deploymentInfo from './deployment.json';
import { RoninRumbleMain__factory } from './typechain-types';

const contract = RoninRumbleMain__factory.connect(
  deploymentInfo.contracts.RoninRumbleMain.address,
  signer
);
```

## License

MIT License

## Support

For issues and questions:
- GitHub Issues: [Create an issue]
- Documentation: See main README.md
- Contract Source: `contracts/`

## Audit Status

Status: Unaudited (Development Version)

Recommended: Get professional audit before mainnet deployment with significant funds.
