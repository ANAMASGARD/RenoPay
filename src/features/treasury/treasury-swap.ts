import { usdtToAtomic } from '@/features/tickets/payment-helpers';
import type { TreasuryRule } from './treasury-types';

export const ETHEREUM_MAINNET_USDT = '0xdAC17F958D2ee523a2206206994597C13D831ec7';
export const ETHEREUM_MAINNET_XAUT = '0x68749665ff8d2d112fa859aa293f07a622782f38';

export type TreasurySwapProtocol = {
  quoteSwap: (options: { tokenIn: string; tokenOut: string; tokenInAmount: bigint }, config?: { paymasterToken?: string; swapMaxFee?: bigint }) => Promise<{ fee: bigint; tokenInAmount: bigint; tokenOutAmount: bigint }>;
  swap: (options: { tokenIn: string; tokenOut: string; tokenInAmount: bigint }, config?: { paymasterToken?: string; swapMaxFee?: bigint }) => Promise<{ hash: string; fee: bigint; tokenInAmount: bigint; tokenOutAmount: bigint }>;
};

export function validateTreasurySwapAmount(amountUsdt: string, rule: TreasuryRule): bigint {
  const amount = BigInt(usdtToAtomic(amountUsdt));
  const maximum = BigInt(usdtToAtomic(rule.maxAllocationUsdt));
  if (amount <= 0n || amount > maximum) throw new Error('Allocation exceeds the Club Treasury maximum.');
  return amount;
}

export async function quoteTreasuryGoldAllocation(protocol: TreasurySwapProtocol, amountUsdt: string, rule: TreasuryRule) {
  const tokenInAmount = validateTreasurySwapAmount(amountUsdt, rule);
  return protocol.quoteSwap({ tokenIn: ETHEREUM_MAINNET_USDT, tokenOut: ETHEREUM_MAINNET_XAUT, tokenInAmount });
}

export async function executeTreasuryGoldAllocation(protocol: TreasurySwapProtocol, amountUsdt: string, rule: TreasuryRule) {
  const tokenInAmount = validateTreasurySwapAmount(amountUsdt, rule);
  return protocol.swap({ tokenIn: ETHEREUM_MAINNET_USDT, tokenOut: ETHEREUM_MAINNET_XAUT, tokenInAmount }, { paymasterToken: 'USDT' });
}
