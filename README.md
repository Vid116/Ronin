# ⚔️ Ronin Rumble

A fast-paced Web3 card-based autobattler built on the Ronin blockchain.

## 🎮 Game Overview

- **Type**: 6-player competitive autobattler
- **Match Duration**: 10-15 minutes
- **Platform**: Ronin Chain (Web3)
- **Target**: ETHGlobal Buenos Aires Hackathon

## 🏗️ Tech Stack

- **Frontend**: Next.js 15 (App Router), React 19, TypeScript
- **Web3**: RainbowKit 2.2, Wagmi 2.17, Viem
- **Styling**: Tailwind CSS 3.4
- **State**: Zustand + Immer
- **Realtime**: Socket.io
- **Animations**: Framer Motion
- **Drag & Drop**: react-dnd

## 🚀 Getting Started

### Prerequisites

- Node.js 20+
- npm or yarn

### Installation

```bash
# Install dependencies
npm install

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the app.

## 📁 Project Structure

```
ronin-rumble/
├── app/                    # Next.js App Router
│   ├── layout.tsx         # Root layout with providers
│   ├── page.tsx           # Landing page
│   ├── providers.tsx      # Web3 providers
│   └── globals.css        # Global styles
├── components/            # React components (coming soon)
├── lib/                   # Utilities and configs
│   └── wagmi.ts          # Wagmi/RainbowKit config
├── docs/                  # Documentation
│   ├── ronin-rumble-gdd.md              # Game Design Document
│   ├── ronin-rumble-units.md            # Unit specifications
│   └── rainbowkit-implementation.md     # Implementation guide
└── types/                 # TypeScript types (coming soon)
```

## 📚 Documentation

- [Game Design Document](./docs/ronin-rumble-gdd.md) - Complete game mechanics
- [Unit Collection](./docs/ronin-rumble-units.md) - All 30 units across 5 tiers
- [Implementation Guide](./docs/rainbowkit-implementation.md) - Development roadmap

## 🎯 Development Roadmap

### Week 1: Core Infrastructure ✅ In Progress
- [x] Project setup with RainbowKit
- [x] Wallet connection
- [x] Ronin chain configuration
- [ ] Game state management
- [ ] UI components
- [ ] WebSocket server

### Week 2: Game Logic (Coming Soon)
- Combat engine
- Unit abilities
- Smart contracts
- Synergies & items

### Week 3: Polish & Launch (Coming Soon)
- Animations
- Testing
- Deployment
- Hackathon submission

## 🌐 Blockchain Integration

- **Ronin**: Main game logic, NFTs, wallet integration
- **Flare**: RNG for shop, combat, matchmaking
- **Filecoin**: Match replay storage

## 📜 License

MIT

## 👥 Team

Built for ETHGlobal Buenos Aires

---

*Generated with Claude Code*
