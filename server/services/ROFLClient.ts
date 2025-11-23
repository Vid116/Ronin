/**
 * ROFL Client - Game Server Interface to ROFL Battle Service
 *
 * This client handles communication between the game server and the ROFL
 * battle computation service running in Oasis TEE.
 */

import { ethers } from 'ethers';

/**
 * Battle request to ROFL service
 */
export interface ROFLBattleRequest {
  matchId: string;
  round: number;
  board1: any;  // CombatBoard type
  board2: any;
  player1Address: string;
  player2Address: string;
  seed: number;
}

/**
 * Battle response from ROFL service
 */
export interface ROFLBattleResponse {
  winner: 'player1' | 'player2' | 'draw';
  damageToLoser: number;
  finalBoard1: any;
  finalBoard2: any;
  events: any[];
  resultHash: string;
  signature: string;
  matchId: string;
  round: number;
  seed: number;
  timestamp: number;
  executionTimeMs: number;
}

/**
 * ROFL Client Configuration
 */
export interface ROFLClientConfig {
  endpoint: string;
  timeout?: number;
  maxRetries?: number;
  expectedSigner?: string;  // TEE wallet address for signature verification
}

/**
 * ROFL Client for battle computation
 */
export class ROFLClient {
  private endpoint: string;
  private timeout: number;
  private maxRetries: number;
  private expectedSigner?: string;

  constructor(config: ROFLClientConfig) {
    this.endpoint = config.endpoint;
    this.timeout = config.timeout || 10000; // 10 seconds default
    this.maxRetries = config.maxRetries || 3;
    this.expectedSigner = config.expectedSigner;

    console.log('ROFL Client initialized:', {
      endpoint: this.endpoint,
      timeout: this.timeout,
      expectedSigner: this.expectedSigner
    });
  }

  /**
   * Compute battle using ROFL service
   */
  async computeBattle(request: ROFLBattleRequest): Promise<ROFLBattleResponse> {
    console.log(`[ROFL] Computing battle - Match ${request.matchId}, Round ${request.round}`);

    let lastError: Error | null = null;

    // Retry logic
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        const response = await this.makeRequest(request, attempt);

        // Verify signature
        if (!this.verifySignature(response)) {
          throw new Error('Invalid ROFL signature - battle result cannot be trusted');
        }

        console.log(`[ROFL] Battle computed successfully - Winner: ${response.winner}`);
        return response;

      } catch (error) {
        lastError = error as Error;
        console.error(`[ROFL] Attempt ${attempt}/${this.maxRetries} failed:`, error);

        if (attempt < this.maxRetries) {
          // Exponential backoff
          const delayMs = Math.pow(2, attempt) * 1000;
          console.log(`[ROFL] Retrying in ${delayMs}ms...`);
          await new Promise(resolve => setTimeout(resolve, delayMs));
        }
      }
    }

    // All retries failed
    throw new Error(
      `ROFL service unavailable after ${this.maxRetries} attempts: ${lastError?.message}`
    );
  }

  /**
   * Make HTTP request to ROFL service
   */
  private async makeRequest(
    request: ROFLBattleRequest,
    attempt: number
  ): Promise<ROFLBattleResponse> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(`${this.endpoint}/compute-battle`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`ROFL service error (${response.status}): ${errorText}`);
      }

      const data = await response.json();
      return data as ROFLBattleResponse;

    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`ROFL service timeout after ${this.timeout}ms`);
      }

      throw error;
    }
  }

  /**
   * Verify ROFL TEE signature
   */
  private verifySignature(response: ROFLBattleResponse): boolean {
    try {
      const { resultHash, matchId, round, signature } = response;

      // Recreate the message that was signed
      const message = ethers.solidityPacked(
        ['bytes32', 'string', 'uint256'],
        [resultHash, matchId, round]
      );

      const messageHash = ethers.keccak256(message);

      // Recover signer from signature
      const signer = ethers.verifyMessage(ethers.getBytes(messageHash), signature);

      console.log('[ROFL] Signature verification:', {
        signer,
        expectedSigner: this.expectedSigner,
        resultHash,
      });

      // If expected signer is configured, verify it matches
      if (this.expectedSigner) {
        const valid = signer.toLowerCase() === this.expectedSigner.toLowerCase();

        if (!valid) {
          console.error('[ROFL] Signature mismatch!', {
            recovered: signer,
            expected: this.expectedSigner
          });
        }

        return valid;
      }

      // If no expected signer, just verify signature is valid
      return signer.length === 42; // Valid Ethereum address

    } catch (error) {
      console.error('[ROFL] Signature verification failed:', error);
      return false;
    }
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.endpoint}/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000),
      });

      if (response.ok) {
        const data = await response.json();
        console.log('[ROFL] Health check passed:', data);
        return true;
      }

      return false;
    } catch (error) {
      console.error('[ROFL] Health check failed:', error);
      return false;
    }
  }

  /**
   * Get ROFL service info
   */
  getInfo(): ROFLClientConfig {
    return {
      endpoint: this.endpoint,
      timeout: this.timeout,
      maxRetries: this.maxRetries,
      expectedSigner: this.expectedSigner,
    };
  }
}

/**
 * Create ROFL client from environment variables
 */
export function createROFLClient(): ROFLClient | null {
  const endpoint = process.env.ROFL_ENDPOINT;

  if (!endpoint) {
    console.warn('[ROFL] ROFL_ENDPOINT not configured - ROFL battles disabled');
    return null;
  }

  return new ROFLClient({
    endpoint,
    timeout: parseInt(process.env.ROFL_TIMEOUT_MS || '10000'),
    maxRetries: parseInt(process.env.ROFL_MAX_RETRIES || '3'),
    expectedSigner: process.env.ROFL_SIGNER_ADDRESS,
  });
}
