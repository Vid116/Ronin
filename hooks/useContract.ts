import { useWriteContract, useWaitForTransactionReceipt, useReadContract } from 'wagmi';
import { parseEther } from 'viem';
import toast from 'react-hot-toast';

// Placeholder contract ABI and address
// These will be replaced with actual deployed contract details
const GAME_CONTRACT_ADDRESS = '0x0000000000000000000000000000000000000000' as `0x${string}`;

const GAME_CONTRACT_ABI = [
  {
    name: 'joinQueue',
    type: 'function',
    stateMutability: 'payable',
    inputs: [{ name: 'entryFee', type: 'uint256' }],
    outputs: [],
  },
  {
    name: 'claimRewards',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'matchId', type: 'bytes32' }],
    outputs: [],
  },
  {
    name: 'getPlayerMatch',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'player', type: 'address' }],
    outputs: [{ name: 'matchId', type: 'bytes32' }],
  },
] as const;

export function useContract() {
  const { data: hash, writeContract, isPending: isWriting } = useWriteContract();

  const { isLoading: isConfirming, isSuccess: isConfirmed } =
    useWaitForTransactionReceipt({
      hash,
    });

  const joinQueue = async (entryFee: number) => {
    try {
      await writeContract({
        address: GAME_CONTRACT_ADDRESS,
        abi: GAME_CONTRACT_ABI,
        functionName: 'joinQueue',
        args: [BigInt(entryFee)],
        value: parseEther(entryFee.toString()),
      });
      toast.success('Joining queue...');
    } catch (error) {
      toast.error('Failed to join queue');
      console.error(error);
    }
  };

  const claimRewards = async (matchId: string) => {
    try {
      await writeContract({
        address: GAME_CONTRACT_ADDRESS,
        abi: GAME_CONTRACT_ABI,
        functionName: 'claimRewards',
        args: [matchId as `0x${string}`],
      });
      toast.success('Claiming rewards...');
    } catch (error) {
      toast.error('Failed to claim rewards');
      console.error(error);
    }
  };

  return {
    joinQueue,
    claimRewards,
    isWriting,
    isConfirming,
    isConfirmed,
    txHash: hash,
  };
}

export function usePlayerMatch(address?: `0x${string}`) {
  const { data: matchId, isLoading } = useReadContract({
    address: GAME_CONTRACT_ADDRESS,
    abi: GAME_CONTRACT_ABI,
    functionName: 'getPlayerMatch',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address,
    },
  });

  return {
    matchId,
    isLoading,
  };
}
