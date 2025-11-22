import { ethers } from 'ethers';
import contractAbis from '../../contract-abis.json';
import deployment from '../../deployment.json';

/**
 * Service for interacting with RoninRumbleMain smart contract
 * Handles match creation, result submission, and transaction verification
 */
export class ContractService {
  private provider: ethers.JsonRpcProvider;
  private wallet: ethers.Wallet;
  private contract: ethers.Contract;
  private contractAddress: string;

  constructor() {
    // Get RPC URL from environment or use default testnet
    const rpcUrl = process.env.RONIN_RPC_URL || 'https://saigon-testnet.roninchain.com/rpc';

    // Initialize provider
    this.provider = new ethers.JsonRpcProvider(rpcUrl);

    // Initialize wallet with private key from environment
    const privateKey = process.env.GAME_SERVER_PRIVATE_KEY;
    if (!privateKey) {
      throw new Error('GAME_SERVER_PRIVATE_KEY environment variable is required');
    }

    this.wallet = new ethers.Wallet(privateKey, this.provider);

    // Get contract address and ABI from deployment files
    this.contractAddress = deployment.contracts.RoninRumbleMain.address;
    const abi = contractAbis.RoninRumbleMain.abi;

    // Initialize contract instance
    this.contract = new ethers.Contract(this.contractAddress, abi, this.wallet);

    console.log(`📝 Contract Service initialized`);
    console.log(`   Contract: ${this.contractAddress}`);
    console.log(`   Game Server: ${this.wallet.address}`);
    console.log(`   Network: ${rpcUrl}`);
  }

  /**
   * Create a new match on-chain
   * @param entryFee Entry fee in RON (0.001, 0.005, or 0.01)
   * @returns Match ID from the blockchain
   */
  async createMatch(entryFee: number): Promise<number> {
    try {
      console.log(`🔗 Creating match on-chain with entry fee: ${entryFee} RON`);

      // Convert entry fee to wei
      const entryFeeWei = ethers.parseEther(entryFee.toString());

      // Call createMatch on contract
      const tx = await this.contract.createMatch(entryFeeWei);
      console.log(`   Transaction sent: ${tx.hash}`);

      // Wait for transaction confirmation
      const receipt = await tx.wait();
      console.log(`   ✅ Transaction confirmed in block ${receipt.blockNumber}`);

      // Parse MatchCreated event to get matchId
      const matchCreatedEvent = receipt.logs
        .map((log: any) => {
          try {
            return this.contract.interface.parseLog(log);
          } catch {
            return null;
          }
        })
        .find((parsed: any) => parsed && parsed.name === 'MatchCreated');

      if (!matchCreatedEvent) {
        throw new Error('MatchCreated event not found in transaction receipt');
      }

      const matchId = Number(matchCreatedEvent.args.matchId);
      console.log(`   🎮 Match created with ID: ${matchId}`);

      return matchId;
    } catch (error: any) {
      console.error('❌ Error creating match:', error.message);
      throw new Error(`Failed to create match: ${error.message}`);
    }
  }

  /**
   * Verify that a player successfully joined a match
   * @param txHash Transaction hash from player's joinMatch call
   * @param expectedMatchId Expected match ID
   * @param expectedPlayer Expected player address
   * @param expectedEntryFee Expected entry fee in RON
   * @returns True if transaction is valid, throws error otherwise
   */
  async verifyJoinMatch(
    txHash: string,
    expectedMatchId: number,
    expectedPlayer: string,
    expectedEntryFee: number
  ): Promise<boolean> {
    try {
      console.log(`🔍 Verifying joinMatch transaction: ${txHash}`);

      // Get transaction receipt
      const receipt = await this.provider.getTransactionReceipt(txHash);

      if (!receipt) {
        throw new Error('Transaction not found');
      }

      // Check if transaction succeeded
      if (receipt.status !== 1) {
        throw new Error('Transaction failed on blockchain');
      }

      // Verify transaction is to our contract
      if (receipt.to?.toLowerCase() !== this.contractAddress.toLowerCase()) {
        throw new Error('Transaction is not to the game contract');
      }

      // Parse PlayerJoinedMatch event
      const playerJoinedEvent = receipt.logs
        .map((log: any) => {
          try {
            return this.contract.interface.parseLog(log);
          } catch {
            return null;
          }
        })
        .find((parsed: any) => parsed && parsed.name === 'PlayerJoinedMatch');

      if (!playerJoinedEvent) {
        throw new Error('PlayerJoinedMatch event not found');
      }

      // Verify event parameters
      const { matchId, player, entryFee } = playerJoinedEvent.args;

      if (Number(matchId) !== expectedMatchId) {
        throw new Error(`Match ID mismatch: expected ${expectedMatchId}, got ${matchId}`);
      }

      if (player.toLowerCase() !== expectedPlayer.toLowerCase()) {
        throw new Error(`Player address mismatch: expected ${expectedPlayer}, got ${player}`);
      }

      const entryFeeRon = Number(ethers.formatEther(entryFee));
      if (Math.abs(entryFeeRon - expectedEntryFee) > 0.0001) {
        throw new Error(`Entry fee mismatch: expected ${expectedEntryFee}, got ${entryFeeRon}`);
      }

      console.log(`   ✅ Transaction verified successfully`);
      return true;
    } catch (error: any) {
      console.error(`   ❌ Verification failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Submit match results to the blockchain
   * @param matchId Match ID
   * @param players Array of 6 player addresses in order
   * @param placements Array of 6 placements (1-6) corresponding to players
   */
  async submitMatchResults(
    matchId: number,
    players: string[],
    placements: number[]
  ): Promise<void> {
    try {
      console.log(`🏆 Submitting match results for match ${matchId}`);
      console.log(`   Players: ${players.length}`);
      console.log(`   Placements: ${placements.join(', ')}`);

      // Validate input
      if (players.length !== 6 || placements.length !== 6) {
        throw new Error('Must provide exactly 6 players and 6 placements');
      }

      // Validate placements are 1-6 and unique
      const placementSet = new Set(placements);
      if (placementSet.size !== 6 || !placements.every(p => p >= 1 && p <= 6)) {
        throw new Error('Placements must be unique values from 1 to 6');
      }

      // Convert to fixed-size arrays for contract
      const playersArray = players as [string, string, string, string, string, string];
      const placementsArray = placements as [number, number, number, number, number, number];

      // Call submitMatchResults on contract
      const tx = await this.contract.submitMatchResults(
        matchId,
        playersArray,
        placementsArray
      );
      console.log(`   Transaction sent: ${tx.hash}`);

      // Wait for confirmation
      const receipt = await tx.wait();
      console.log(`   ✅ Results submitted in block ${receipt.blockNumber}`);

      // Log prize distribution
      for (let i = 0; i < players.length; i++) {
        const placement = placements[i];
        let prize = '';
        if (placement === 1) prize = '🥇 1st place';
        else if (placement === 2) prize = '🥈 2nd place';
        else if (placement === 3) prize = '🥉 3rd place';
        else prize = `${placement}th place`;

        console.log(`   ${prize}: ${players[i].substring(0, 10)}...`);
      }
    } catch (error: any) {
      console.error('❌ Error submitting results:', error.message);
      throw new Error(`Failed to submit match results: ${error.message}`);
    }
  }

  /**
   * Get match details from blockchain
   * @param matchId Match ID to query
   */
  async getMatch(matchId: number): Promise<{
    entryFee: string;
    players: string[];
    placements: number[];
    finalized: boolean;
    prizePool: string;
    timestamp: number;
  }> {
    try {
      const match = await this.contract.getMatch(matchId);

      return {
        entryFee: ethers.formatEther(match.entryFee),
        players: match.players,
        placements: match.placements.map((p: bigint) => Number(p)),
        finalized: match.finalized,
        prizePool: ethers.formatEther(match.prizePool),
        timestamp: Number(match.timestamp),
      };
    } catch (error: any) {
      console.error(`Error fetching match ${matchId}:`, error.message);
      throw error;
    }
  }

  /**
   * Check if a player has joined a specific match
   * @param matchId Match ID
   * @param playerAddress Player's wallet address
   */
  async isPlayerInMatch(matchId: number, playerAddress: string): Promise<boolean> {
    try {
      return await this.contract.isPlayerInMatch(matchId, playerAddress);
    } catch (error: any) {
      console.error(`Error checking player in match:`, error.message);
      return false;
    }
  }

  /**
   * Get player's claimable balance
   * @param playerAddress Player's wallet address
   */
  async getPlayerBalance(playerAddress: string): Promise<string> {
    try {
      const balance = await this.contract.getPlayerBalance(playerAddress);
      return ethers.formatEther(balance);
    } catch (error: any) {
      console.error(`Error fetching player balance:`, error.message);
      return '0';
    }
  }

  /**
   * Get the game server wallet address
   */
  getGameServerAddress(): string {
    return this.wallet.address;
  }

  /**
   * Get the contract address
   */
  getContractAddress(): string {
    return this.contractAddress;
  }
}
