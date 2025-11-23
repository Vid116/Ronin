# ⚔️ Ronin Rumble

A fast-paced Web3 card-based autobattler built on the Ronin blockchain with trustless battle computation powered by Oasis ROFL (Runtime OFf-chain Logic).

## 🎮 Game Overview

- **Type**: 2-6 player competitive autobattler
- **Match Duration**: 10-15 minutes
- **Platform**: Ronin Chain (Web3)
- **Target**: ETHGlobal Buenos Aires Hackathon
- **Status**: ✅ **Ready for ROFL Deployment & Testing**

## 🏗️ Tech Stack

- **Frontend**: Next.js 15 (App Router), React 19, TypeScript
- **Web3**: RainbowKit 2.2, Wagmi 2.17, Viem
- **Styling**: Tailwind CSS 3.4
- **State**: Zustand + Immer
- **Realtime**: Socket.io
- **Animations**: Framer Motion
- **Drag & Drop**: react-dnd
- **Smart Contracts**: Solidity (Hardhat)
- **Trustless Compute**: Oasis ROFL (TEE-based battle resolution)
- **Backend**: Node.js + Express + Socket.io

## 🚀 Getting Started

### Prerequisites

- Node.js 20+
- npm or yarn
- WalletConnect Project ID ([Get one here](https://cloud.walletconnect.com))

### Installation

```bash
# Install dependencies
npm install

# Create environment file
cp .env.example .env.local

# Add your WalletConnect Project ID to .env.local
# NEXT_PUBLIC_WALLET_CONNECT_ID=your_project_id_here
```

### Running the App

```bash
# Run both client and server
npm run dev:all

# Or run separately:
npm run dev      # Frontend only (http://localhost:3000)
npm run server   # Backend only (http://localhost:3001)
```

Open [http://localhost:3000](http://localhost:3000) to see the app.

## 📁 Project Structure

```
ronin-rumble/
├── app/                              # Next.js App Router
│   ├── lobby/page.tsx               # Matchmaking lobby
│   ├── match/[id]/page.tsx          # Game match view
│   ├── page.tsx                     # Landing page
│   └── providers.tsx                # Web3 providers
├── components/                       # React components
│   ├── game/                        # Game UI components
│   └── ui/                          # Reusable UI components
├── contracts/                        # Smart contracts
│   ├── RoninRumble1v1.sol           # 1v1 match contract
│   ├── RoninRumbleMain.sol          # Main match contract
│   └── test/                        # Contract tests
├── server/                           # Game server
│   ├── game/                        # Game logic
│   │   ├── GameRoom.ts              # Room management + ROFL routing
│   │   ├── MatchMaking.ts           # Player matchmaking
│   │   └── CombatSimulator.ts       # Battle simulation
│   └── services/                    # Backend services
│       ├── ContractService.ts       # Blockchain integration
│       └── ROFLClient.ts            # ROFL service client
├── rofl-service/                     # ROFL TEE service
│   ├── src/
│   │   ├── main.ts                  # HTTP server
│   │   ├── combat-service.ts        # Battle + TEE signing
│   │   └── engine/                  # Deterministic combat
│   ├── Dockerfile                   # Container definition
│   └── rofl.yaml                    # Oasis deployment config
├── lib/combat/                       # Combat engine
│   ├── engine.ts                    # Core battle logic
│   ├── abilities.ts                 # Unit abilities
│   └── rng.ts                       # Deterministic RNG
├── hooks/                           # React hooks
│   ├── useSocket.ts                 # WebSocket connection
│   └── useContract.ts               # Smart contract interaction
└── docs/                            # Documentation
    ├── ROFL_DEPLOYMENT_GUIDE.md     # ROFL deployment
    ├── BLOCKCHAIN_INTEGRATION.md    # Contract integration
    └── ARCHITECTURE_REBUILD.md      # Architecture overview
```

## 📚 Documentation

### Game Design
- [Game Design Document](./docs/ronin-rumble-gdd.md) - Complete game mechanics
- [Unit Collection](./docs/ronin-rumble-units.md) - All 30 units across 5 tiers

### Technical Documentation
- [ROFL Deployment Guide](./ROFL_DEPLOYMENT_GUIDE.md) - Deploy to Oasis testnet
- [ROFL Status](./ROFL_STATUS.md) - Current ROFL integration status
- [Blockchain Integration](./BLOCKCHAIN_INTEGRATION.md) - Smart contract integration
- [Architecture Overview](./ARCHITECTURE_REBUILD.md) - System architecture
- [Wallet Architecture](./WALLET_ARCHITECTURE_BLUEPRINT.md) - Wallet integration blueprint

### Quick Starts
- [Quick Start: Blockchain](./QUICK_START_BLOCKCHAIN.md) - Get started with smart contracts
- [Implementation Guide](./docs/rainbowkit-implementation.md) - Original development roadmap

## 🎯 Current Project Status

### ✅ Completed Features

#### Core Infrastructure
- [x] Project setup with RainbowKit
- [x] Wallet connection + Ronin chain configuration
- [x] Game state management (Zustand + Immer)
- [x] All UI components (Card, Board, Shop, Timer, Stats, OpponentList)
- [x] Custom hooks (useGame, useContract, useSocket)
- [x] Landing page + Lobby + Match pages
- [x] WebSocket server + GameRoom + Matchmaking
- [x] Drag & drop system (react-dnd)
- [x] Real-time multiplayer foundation

#### Game Logic
- [x] ✅ **Complete deterministic combat engine**
- [x] ✅ **30+ unit abilities implemented**
- [x] ✅ **Smart contracts deployed on Ronin Testnet**
- [x] ✅ **Shop generation & economy system**
- [x] ✅ **Round management & state synchronization**

#### Blockchain Integration
- [x] ✅ **1v1 & Main match contracts deployed**
- [x] ✅ **Entry fee system with RON payments**
- [x] ✅ **Prize distribution (91.7% winner, 8.3% platform)**
- [x] ✅ **On-chain match state management**
- [x] ✅ **Wallet-based player authentication**

#### ROFL Integration (Trustless Compute)
- [x] ✅ **ROFL service with TEE signing**
- [x] ✅ **Docker containerization**
- [x] ✅ **Local testing successful (93ms avg)**
- [x] ✅ **Game server ROFL client integration**
- [x] ✅ **Paid vs free match routing**
- [x] ⏳ **Ready for Oasis Testnet deployment**

### 🚀 Ready to Deploy

#### ROFL Service
The trustless battle computation service is containerized and tested locally:
- **Local Endpoint**: http://localhost:8000
- **Performance**: ~93ms battle computation
- **Security**: TEE-signed results with signature verification
- **Status**: ✅ Ready for Oasis Testnet deployment

#### Smart Contracts (Ronin Testnet)

**RoninRumble1v1 Contract:**
- **Address**: `0x4b3F7C33636B1b72312b32Bd1ba93A44D2f2a177`
- **Network**: Ronin Testnet (Chain ID: 2021)
- **Deployer**: `0xfDF0e775aC0E946DC940e3ad301e1E64fc722C51`
- **Game Server**: `0xfDF0e775aC0E946DC940e3ad301e1E64fc722C51`

**Entry Fees:**
- Tier 1: 0.001 RON
- Tier 2: 0.005 RON
- Tier 3: 0.01 RON

**Prize Distribution:**
- Winner: 91.7%
- Platform Fee: 8.3%

**Deployed**: November 23, 2025

### 📋 Next Steps

1. **Deploy ROFL to Oasis Testnet**
   - Get testnet tokens: https://faucet.testnet.oasis.io/
   - Wallet: `oasis1qzp50yuq8j5latfxc2gvgsxa756ja4lmdgvf5vtv`
   - Follow guide: `ROFL_DEPLOYMENT_GUIDE.md`

2. **Test Paid Matches**
   - Create 1v1 matches with entry fees
   - Verify ROFL battle computation
   - Monitor TEE signing and verification

3. **Production Deployment**
   - Deploy ROFL to Oasis mainnet
   - Deploy contracts to Ronin mainnet
   - Set up monitoring and analytics

## 🌐 Blockchain Integration

### Primary Chains
- **Ronin Testnet**: Smart contracts, payments, wallet authentication
- **Oasis Sapphire Testnet**: ROFL trustless battle computation (TEE)

### Planned Integrations
- **Flare**: On-chain RNG for shop generation and matchmaking
- **Filecoin**: Decentralized match replay storage

## 📜 License

MIT

## 🔧 Development Commands

```bash
# Install dependencies
npm install

# Run full stack (frontend + backend)
npm run dev:all

# Run separately
npm run dev           # Frontend (localhost:3000)
npm run server        # Game server (localhost:3001)

# Smart contracts
npm run compile       # Compile contracts
npm run test          # Run contract tests
npm run deploy:1v1:testnet    # Deploy 1v1 contract
npm run deploy:main:testnet   # Deploy main contract

# ROFL service
cd rofl-service
docker build -t ronin-rumble-battle .
docker run -d -p 8000:3000 --env-file .env --name rofl-test ronin-rumble-battle
```

## 🧪 Testing Paid Matches

1. Start all services:
   ```bash
   npm run dev:all
   docker start rofl-test  # If already built
   ```

2. Create a 1v1 match with entry fee > 0

3. Monitor logs:
   ```bash
   # Game server logs
   npm run server

   # ROFL container logs
   docker logs -f rofl-test
   ```

4. Verify ROFL usage in logs:
   ```
   [ROFL] Match is a paid match - ROFL enabled
   [ROFL] Computing battle via ROFL
   [ROFL] Battle computed successfully
   ```

## 🚨 Important Notes

- **Testnet Only**: All contracts currently deployed to Ronin Testnet
- **ROFL Local**: ROFL service running locally, ready for Oasis deployment
- **Entry Fees**: Test with small amounts (0.001-0.01 RON)
- **TEE Security**: All paid match battles are signed by TEE for trustless verification

## 👥 Team

Built for ETHGlobal Buenos Aires

## 🔗 Links

- **Ronin Testnet Explorer**: https://saigon-app.roninchain.com/
- **Oasis ROFL Docs**: https://docs.oasis.io/build/rofl/
- **Oasis Faucet**: https://faucet.testnet.oasis.io/

---

*Last Updated: November 23, 2025*
*Generated with Claude Code*
