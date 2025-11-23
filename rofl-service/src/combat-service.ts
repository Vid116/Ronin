/**
 * Combat Service - ROFL Battle Computation
 *
 * This service handles battle computation requests, runs the pure combat engine,
 * and signs results with TEE private key for verification.
 */

import { ethers } from 'ethers';
import type {
  CombatInput,
  CombatOutput,
  CombatBoard,
} from './engine/types';

// Import the pure combat engine
// Note: We'll need to export simulateCombat from engine.ts
import { simulateCombat } from './engine/engine';

/**
 * Battle request interface (from game server)
 */
export interface BattleRequest {
  matchId: string;
  round: number;
  board1: CombatBoard;
  board2: CombatBoard;
  player1Address: string;
  player2Address: string;
  seed: number;
}

/**
 * Battle response interface (to game server)
 */
export interface BattleResponse {
  // Core results
  winner: 'player1' | 'player2' | 'draw';
  damageToLoser: number;
  finalBoard1: CombatBoard;
  finalBoard2: CombatBoard;
  events: any[];

  // Verification data
  resultHash: string;
  signature: string;  // TEE-signed result

  // Metadata
  matchId: string;
  round: number;
  seed: number;
  timestamp: number;
  executionTimeMs: number;
}

/**
 * TEE signing key (In production ROFL, this comes from KMS)
 * For now, we use environment variable
 */
let signingWallet: ethers.Wallet | null = null;

function getSigningWallet(): ethers.Wallet {
  if (!signingWallet) {
    const privateKey = process.env.ROFL_SIGNING_KEY || process.env.GAME_SERVER_PRIVATE_KEY;

    if (!privateKey) {
      throw new Error('ROFL_SIGNING_KEY not configured');
    }

    signingWallet = new ethers.Wallet(privateKey);
    console.log('TEE Signing wallet initialized:', signingWallet.address);
  }

  return signingWallet;
}

/**
 * Compute result hash for verification
 */
function computeResultHash(output: CombatOutput, matchId: string, round: number): string {
  const data = {
    matchId,
    round,
    winner: output.winner,
    damageToLoser: output.damageToLoser,
    seed: output.seed,
    rngCallCount: output.rngCallCount,
    totalSteps: output.totalSteps,
  };

  const encoded = ethers.AbiCoder.defaultAbiCoder().encode(
    ['string', 'uint256', 'string', 'uint256', 'uint256', 'uint256', 'uint256'],
    [
      data.matchId,
      data.round,
      data.winner,
      data.damageToLoser,
      data.seed,
      data.rngCallCount,
      data.totalSteps
    ]
  );

  return ethers.keccak256(encoded);
}

/**
 * Sign battle result with TEE key
 */
async function signResult(resultHash: string, matchId: string, round: number): Promise<string> {
  const wallet = getSigningWallet();

  // Create message to sign
  const message = ethers.solidityPacked(
    ['bytes32', 'string', 'uint256'],
    [resultHash, matchId, round]
  );

  const messageHash = ethers.keccak256(message);

  // Sign with TEE key
  const signature = await wallet.signMessage(ethers.getBytes(messageHash));

  return signature;
}

/**
 * Main battle computation function
 */
export async function computeBattle(request: BattleRequest): Promise<BattleResponse> {
  const startTime = Date.now();
  const timestamp = Math.floor(startTime / 1000);

  console.log(`Computing battle - Match ${request.matchId}, Round ${request.round}`);

  try {
    // Validate request
    if (!request.matchId || request.round === undefined) {
      throw new Error('Invalid battle request: missing matchId or round');
    }

    if (!request.board1 || !request.board2) {
      throw new Error('Invalid battle request: missing board data');
    }

    if (!request.seed) {
      throw new Error('Invalid battle request: missing seed');
    }

    // Prepare combat input
    const combatInput: CombatInput = {
      board1: request.board1,
      board2: request.board2,
      round: request.round,
      seed: request.seed,
      player1Address: request.player1Address,
      player2Address: request.player2Address,
      matchId: request.matchId,
      timestamp,
    };

    // Run pure combat simulation
    console.log('Running pure combat engine...');
    const output: CombatOutput = simulateCombat(combatInput);

    // Compute result hash
    const resultHash = computeResultHash(output, request.matchId, request.round);

    // Sign result with TEE key
    console.log('Signing result with TEE key...');
    const signature = await signResult(resultHash, request.matchId, request.round);

    const executionTime = Date.now() - startTime;

    console.log(`Battle computation complete - Winner: ${output.winner}, Time: ${executionTime}ms`);

    // Return response
    const response: BattleResponse = {
      winner: output.winner,
      damageToLoser: output.damageToLoser,
      finalBoard1: output.finalBoard1,
      finalBoard2: output.finalBoard2,
      events: output.events,
      resultHash,
      signature,
      matchId: request.matchId,
      round: request.round,
      seed: request.seed,
      timestamp,
      executionTimeMs: executionTime,
    };

    return response;

  } catch (error) {
    console.error('Battle computation error:', error);
    throw error;
  }
}

/**
 * Verify a battle result signature (utility function for testing)
 */
export function verifyBattleSignature(
  resultHash: string,
  matchId: string,
  round: number,
  signature: string
): { valid: boolean; signer: string } {
  try {
    const message = ethers.solidityPacked(
      ['bytes32', 'string', 'uint256'],
      [resultHash, matchId, round]
    );

    const messageHash = ethers.keccak256(message);
    const signer = ethers.verifyMessage(ethers.getBytes(messageHash), signature);

    const expectedSigner = getSigningWallet().address;
    const valid = signer.toLowerCase() === expectedSigner.toLowerCase();

    return { valid, signer };
  } catch (error) {
    console.error('Signature verification error:', error);
    return { valid: false, signer: '' };
  }
}
