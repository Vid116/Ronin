# 🎮 RONIN RUMBLE - Hybrid Architecture Plan

## Executive Summary
A fast-paced autobattler using **Ronin** for entry fees/rewards, **Oasis ROFL** for verifiable combat, and **off-chain server** for gameplay. Players get blockchain security without the cost or slowness.

---

## 🏗️ ARCHITECTURE OVERVIEW

```
┌─────────────────────────────────────────────────────────┐
│                     FRONTEND (Next.js)                   │
│                   RainbowKit + Wagmi                     │
└────────────┬────────────────────────┬────────────────────┘
             │                        │
             ▼                        ▼
┌─────────────────────┐   ┌──────────────────────────────┐
│   GAME SERVER       │   │     BLOCKCHAIN LAYER         │
│   (Node + Socket.io)│   │                              │
│                     │   │  ┌────────────────────┐      │
│  • Matchmaking      │   │  │   RONIN CHAIN      │      │
│  • Shop Generation  │───┼─▶│  • Entry Fees      │      │
│  • Planning Phase   │   │  │  • Prize Payouts   │      │
│  • Game State       │   │  │  • Match Results   │      │
│  • Real-time Updates│   │  │  • NFT Skins       │      │
│                     │   │  └────────────────────┘      │
└──────────┬──────────┘   │                              │
           │              │  ┌────────────────────┐      │
           │              │  │   OASIS ROFL       │      │
           └──────────────┼─▶│  • Combat Engine   │      │
                          │  │  • Battle Proofs   │      │
                          │  │  • Deterministic   │      │
                          │  └────────────────────┘      │
                          └──────────────────────────────┘
```

---

## 📍 WHAT GOES WHERE

### **RONIN CHAIN (Money & Assets)**
```solidity
contract RoninRumbleMain {
    // Entry fee management
    mapping(uint256 => Match) public matches;
    mapping(address => uint256) public playerBalances;
    
    // Core functions
    function joinQueue(uint256 entryFee) external payable;
    function submitMatchResults(uint256 matchId, address[6] players, uint8[6] placements);
    function claimRewards() external;
    function withdrawBalance() external;
}

contract RoninRumbleNFT {
    // Optional: Cosmetic card skins
    function mintCardSkin(uint256 cardId, string uri) external;
    function equipSkin(uint256 tokenId) external;
}
```

**Stored on Ronin:**
- Entry fees (2, 10, 50 RON tiers)
- Match results (final placements)
- Prize distributions
- Player balances
- NFT cosmetic skins (optional)
- Historical match records

### **OASIS ROFL (Combat Verification)**
```rust
// ROFL Runtime - Deterministic combat simulation
pub fn simulate_combat(
    player1_board: Board,
    player2_board: Board,
    round: u32,
    random_seed: [u8; 32],
) -> CombatResult {
    // Initialize combat state
    let mut combat = CombatEngine::new(random_seed);
    
    // Process each position (1-8)
    for position in 0..8 {
        let p1_unit = player1_board.get_unit(position);
        let p2_unit = player2_board.get_unit(position);
        
        // Simultaneous activation
        if let Some(unit) = p1_unit {
            combat.process_attack(unit, player2_board);
        }
        if let Some(unit) = p2_unit {
            combat.process_attack(unit, player1_board);
        }
        
        // Process end-of-position effects
        combat.process_position_effects();
    }
    
    // Return verifiable result
    CombatResult {
        winner: combat.get_winner(),
        damage: combat.calculate_damage(),
        proof: combat.generate_proof(),
        events: combat.get_events(),
    }
}
```

**ROFL Handles:**
- Combat simulation (all 8 positions)
- Ability triggers (on attack, on hit, on death, etc.)
- Damage calculations
- Target prioritization (taunt, flying, etc.)
- RNG for crits/dodges (using seed)
- Generating cryptographic proof

### **OFF-CHAIN SERVER (Game Logic)**
```typescript
// server/GameRoom.ts
class GameRoom {
    players: Player[];
    round: number;
    phase: 'PLANNING' | 'COMBAT' | 'TRANSITION';
    
    // Matchmaking
    async findMatch(entryFee: number) {
        // Group 6 players
        // Create room
        // Start game
    }
    
    // Shop Generation  
    generateShop(player: Player): Card[] {
        // Use player level
        // Apply probabilities
        // Check shared pool
    }
    
    // Planning Phase
    handleCardPurchase(playerId: string, cardIndex: number);
    handleCardPlacement(playerId: string, card: Card, position: number);
    handleReroll(playerId: string);
    
    // Combat Phase
    async runCombat(p1: Player, p2: Player) {
        // Send to ROFL
        const result = await oasisROFL.simulateCombat(
            p1.board,
            p2.board,
            this.round,
            generateSeed()
        );
        
        // Verify proof
        if (!verifyProof(result.proof)) {
            throw new Error('Invalid combat proof');
        }
        
        // Update game state
        this.applyDamage(result);
        
        // Broadcast to clients
        this.broadcast('combat_result', result);
    }
    
    // End Game
    async finalizeMatch() {
        // Calculate placements
        // Submit to Ronin chain
        // Trigger payouts
    }
}
```

**Server Manages:**
- Matchmaking queue
- Shop generation & rerolls
- Unit placement & bench
- Gold & XP economy
- Round progression
- WebSocket connections
- Combat orchestration
- Synergy calculations
- Item assignments

---

## 🎮 GAME FLOW

### **1. MATCH START**
```mermaid
Player → Ronin: Pay entry fee (10 RON)
Ronin → Server: Player joined queue
Server: Wait for 6 players
Server → Players: Match found, start game
```

### **2. GAMEPLAY LOOP**
```mermaid
PLANNING PHASE (20 seconds):
- Server generates shops
- Players buy/place units
- Real-time via WebSocket

COMBAT PHASE:
- Server pairs opponents
- Server → ROFL: Simulate combat
- ROFL → Server: Return proof + result
- Server → Players: Show animations
- Server: Update HP/gold

REPEAT until 1 player left
```

### **3. MATCH END**
```mermaid
Server: Calculate final placements
Server → Ronin: Submit match results
Ronin: Distribute prizes (40/10/5 RON)
Players → Ronin: Claim winnings
```

---

## 💻 TECHNICAL IMPLEMENTATION

### **Frontend (Next.js + RainbowKit)**
```typescript
// hooks/useRoninRumble.ts
export function useRoninRumble() {
    // Join match with entry fee
    const { write: joinQueue } = useContractWrite({
        address: RONIN_CONTRACT,
        abi: GAME_ABI,
        functionName: 'joinQueue',
        value: parseEther('10'), // 10 RON
    });
    
    // Claim rewards after match
    const { write: claimRewards } = useContractWrite({
        address: RONIN_CONTRACT,
        abi: GAME_ABI,
        functionName: 'claimRewards',
    });
    
    return { joinQueue, claimRewards };
}

// hooks/useGameSocket.ts
export function useGameSocket() {
    const socket = io(GAME_SERVER_URL);
    
    useEffect(() => {
        socket.on('match_found', (data) => {
            // Start game
        });
        
        socket.on('shop_update', (shop) => {
            // Update shop
        });
        
        socket.on('combat_result', (result) => {
            // Show combat with proof verification badge
        });
    }, []);
    
    return socket;
}
```

### **Game Server**
```typescript
// server/index.ts
import { Server } from 'socket.io';
import { OasisROFLClient } from '@oasis/rofl-client';
import { ethers } from 'ethers';

const io = new Server(3001);
const rofl = new OasisROFLClient(OASIS_ENDPOINT);
const ronin = new ethers.Contract(CONTRACT_ADDRESS, ABI, provider);

// Player joins
io.on('connection', (socket) => {
    socket.on('queue_join', async (data) => {
        // Verify on-chain payment
        const paid = await ronin.hasPlayerPaid(data.address);
        if (!paid) return;
        
        // Add to matchmaking
        matchmaking.add(socket, data.entryFee);
        
        // Check for full lobby
        if (matchmaking.canStartMatch()) {
            const players = matchmaking.getPlayers();
            const room = new GameRoom(players);
            room.start();
        }
    });
});

// Combat simulation
async function simulateCombat(board1: Board, board2: Board) {
    // Call ROFL runtime
    const result = await rofl.execute({
        runtime: 'ronin-rumble-combat',
        function: 'simulate_combat',
        args: {
            player1_board: board1,
            player2_board: board2,
            round: currentRound,
            seed: generateSeed(),
        }
    });
    
    // Verify the proof
    const isValid = await rofl.verifyProof(result.proof);
    if (!isValid) throw new Error('Invalid combat proof');
    
    return result;
}
```

### **ROFL Combat Runtime**
```rust
// rofl/src/combat.rs
use oasis_runtime_sdk::modules::rofl::app::prelude::*;

#[derive(Serialize, Deserialize)]
pub struct Board {
    top: Vec<Option<Unit>>,
    bottom: Vec<Option<Unit>>,
}

#[derive(Serialize, Deserialize)]
pub struct CombatResult {
    winner: String,
    damage: u32,
    events: Vec<CombatEvent>,
    proof: Vec<u8>,
}

pub fn simulate_combat(
    env: &mut Environment,
    player1_board: Board,
    player2_board: Board,
    round: u32,
    seed: [u8; 32],
) -> Result<CombatResult, Error> {
    let mut rng = ChaCha8Rng::from_seed(seed);
    let mut events = Vec::new();
    
    // Process positions 0-7
    for position in 0..8 {
        // Get units at this position
        let p1_unit = get_unit_at(&player1_board, position);
        let p2_unit = get_unit_at(&player2_board, position);
        
        // Process attacks
        if let Some(unit) = p1_unit {
            process_unit_attack(unit, &mut player2_board, &mut events, &mut rng);
        }
        if let Some(unit) = p2_unit {
            process_unit_attack(unit, &mut player1_board, &mut events, &mut rng);
        }
        
        // Remove dead units
        remove_dead_units(&mut player1_board);
        remove_dead_units(&mut player2_board);
    }
    
    // Determine winner and damage
    let winner = determine_winner(&player1_board, &player2_board);
    let damage = calculate_damage(&winner, &player1_board, &player2_board, round);
    
    // Generate proof
    let proof = env.prove(|p| {
        p.insert("boards", (player1_board, player2_board));
        p.insert("result", (winner, damage));
        p.insert("seed", seed);
    })?;
    
    Ok(CombatResult {
        winner,
        damage,
        events,
        proof: proof.to_bytes(),
    })
}
```

---

## 📊 DATA FLOW

### **Planning Phase Data**
```
Client ←→ Server (WebSocket)
- Real-time, no blockchain
- Instant shop refreshes
- Drag & drop units
- No gas costs
```

### **Combat Data**
```
Server → ROFL → Server → Client
- Server sends boards to ROFL
- ROFL returns proof + result  
- Server broadcasts to clients
- Clients show animations
```

### **Financial Data**
```
Client → Ronin → Server → Ronin → Client
- Entry fee payment on-chain
- Server monitors blockchain
- Results submitted on-chain
- Players claim rewards
```

---

## 🚀 DEVELOPMENT PHASES

### **Phase 1: Core Game (Week 1)**
- [x] Game design document
- [ ] Setup RainbowKit + Next.js
- [ ] Create game server with Socket.io
- [ ] Implement board & shop UI
- [ ] Basic combat engine (TypeScript)
- [ ] Matchmaking system

### **Phase 2: Blockchain Integration (Week 2)**
- [ ] Deploy Ronin contracts (entry fees, payouts)
- [ ] Integrate wallet connection
- [ ] Setup ROFL runtime environment
- [ ] Port combat engine to Rust
- [ ] Test proof generation
- [ ] Connect server to both chains

### **Phase 3: Polish & Testing (Week 3)**
- [ ] Combat animations
- [ ] Sound effects
- [ ] Error handling
- [ ] Gas optimization
- [ ] Security audit
- [ ] Demo video creation

---

## 🏆 HACKATHON PITCH POINTS

### **For Ronin Prize:**
- "Native RON integration for entry fees"
- "Instant payouts to winners"
- "Optional NFT card skins"
- "Bringing competitive gaming to Ronin"

### **For Oasis Prize:**
- "ROFL ensures 100% fair combat"
- "Uncheatable game engine"
- "Cryptographic proof for every battle"
- "Perfect use case for off-chain compute"

### **For Filecoin Prize:**
- "Store match replays on IPFS"
- "Permanent tournament history"
- "Decentralized leaderboards"
- "Player statistics storage"

---

## 💰 ECONOMICS

### **Entry Fees & Prizes (10 RON example)**
```
Total Pool: 60 RON (6 players × 10 RON)
Platform Fee: 5 RON (8.3%)
Prize Pool: 55 RON

Distribution:
1st: 40 RON (4x return)
2nd: 10 RON (break even)
3rd: 5 RON (50% back)
4th-6th: 0 RON
```

### **Transaction Costs**
```
Player Costs:
- Join match: ~0.1 RON (one transaction)
- Claim reward: ~0.1 RON (one transaction)
- Total: ~0.2 RON per match

Game Costs:
- Submit results: ~0.2 RON (once per match)
- ROFL verification: Free (off-chain)
```

---

## 🔑 KEY BENEFITS

### **For Players:**
- ✅ Fast 10-minute matches
- ✅ Low gas costs (only 2 transactions)
- ✅ Provably fair combat
- ✅ Instant gameplay (no waiting for blocks)
- ✅ Professional wallet UX (RainbowKit)

### **For Developers:**
- ✅ Simple architecture
- ✅ Minimal on-chain storage
- ✅ Scalable to thousands of matches
- ✅ Clear separation of concerns
- ✅ Easy to debug and test

### **For Judges:**
- ✅ Practical use of blockchain
- ✅ Solves real problems (fairness, trust)
- ✅ Not over-engineered
- ✅ Actually fun to play
- ✅ Sustainable economics

---

## 🎯 SUCCESS METRICS

- **Technical**: 60 FPS animations, <100ms response time, zero-downtime
- **Economic**: Positive unit economics after platform fees
- **Gameplay**: 10-15 minute matches, balanced meta
- **Security**: No funds at risk, verifiable combat, no cheating possible

---

## 📝 SUMMARY

**Ronin Rumble** uses a hybrid architecture that puts each component where it works best:
- **Ronin** for money (secure, trusted)
- **ROFL** for combat (fair, verifiable)  
- **Server** for gameplay (fast, responsive)

This gives players the best of both worlds: blockchain security without the cost or complexity.

*"We built a game that's actually fun to play, not just technically impressive."*
