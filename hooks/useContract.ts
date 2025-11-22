import { useWriteContract, useWaitForTransactionReceipt, useReadContract } from 'wagmi';
import { parseEther } from 'viem';
import toast from 'react-hot-toast';

// Contract address from environment
// Use 1v1 contract if available (for 2-player matches), otherwise use main contract
const GAME_CONTRACT_ADDRESS = (process.env.NEXT_PUBLIC_RONIN_RUMBLE_1V1_ADDRESS || process.env.NEXT_PUBLIC_RONIN_RUMBLE_MAIN_ADDRESS || '0x0B46aF2F581c163ff7b1dD6d2aFedDa86066ABDA') as `0x${string}`;

// Minimal ABI for the functions we need
const GAME_CONTRACT_ABI = [
  {
    inputs: [{ internalType: 'uint256', name: '_matchId', type: 'uint256' }],
    name: 'joinMatch',
    outputs: [],
    stateMutability: 'payable',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'uint256', name: '_entryFee', type: 'uint256' }],
    name: 'createMatch',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [],
    name: 'claimRewards',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'address', name: '_player', type: 'address' }],
    name: 'getPlayerBalance',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

export function useContract() {
  const { data: hash, writeContract, isPending: isWriting } = useWriteContract();

  const { isLoading: isConfirming, isSuccess: isConfirmed } =
    useWaitForTransactionReceipt({
      hash,
    });

  const joinMatch = async (matchId: number, entryFee: number) => {
    try {
      await writeContract({
        address: GAME_CONTRACT_ADDRESS,
        abi: GAME_CONTRACT_ABI,
        functionName: 'joinMatch',
        args: [BigInt(matchId)],
        value: parseEther(entryFee.toString()),
      });
      toast.success('Joining match on blockchain...');
      return hash;
    } catch (error) {
      toast.error('Failed to join match');
      console.error(error);
      throw error;
    }
  };

  const createMatch = async (entryFee: number) => {
    try {
      await writeContract({
        address: GAME_CONTRACT_ADDRESS,
        abi: GAME_CONTRACT_ABI,
        functionName: 'createMatch',
        args: [parseEther(entryFee.toString())],
      });
      toast.success('Creating match on blockchain...');
      return hash;
    } catch (error) {
      toast.error('Failed to create match');
      console.error(error);
      throw error;
    }
  };

  const claimRewards = async () => {
    try {
      await writeContract({
        address: GAME_CONTRACT_ADDRESS,
        abi: GAME_CONTRACT_ABI,
        functionName: 'claimRewards',
        args: [],
      });
      toast.success('Claiming rewards...');
    } catch (error) {
      toast.error('Failed to claim rewards');
      console.error(error);
      throw error;
    }
  };

  return {
    joinMatch,
    createMatch,
    claimRewards,
    isWriting,
    isConfirming,
    isConfirmed,
    txHash: hash,
  };
}

export function usePlayerBalance(address?: `0x${string}`) {
  const { data: balance, isLoading } = useReadContract({
    address: GAME_CONTRACT_ADDRESS,
    abi: GAME_CONTRACT_ABI,
    functionName: 'getPlayerBalance',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address,
    },
  });

  return {
    balance: balance as bigint | undefined,
    isLoading,
  };
}
