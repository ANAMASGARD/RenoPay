import { describe, expect, it } from 'vitest';

import { DEFAULT_TREASURY_RULE } from '@/features/treasury/treasury-types';
import {
  ETHEREUM_MAINNET_USDT,
  ETHEREUM_MAINNET_XAUT,
  quoteTreasuryGoldAllocation,
  validateTreasurySwapAmount,
} from '@/features/treasury/treasury-swap';

describe('treasury gold allocation', () => {
  it('uses the canonical mainnet USD₮ and XAU₮ route', async () => {
    const quoteSwap = async (options: { tokenIn: string; tokenOut: string; tokenInAmount: bigint }) => {
      expect(options).toEqual({ tokenIn: ETHEREUM_MAINNET_USDT, tokenOut: ETHEREUM_MAINNET_XAUT, tokenInAmount: 50_000_000n });
      return { fee: 1n, tokenInAmount: options.tokenInAmount, tokenOutAmount: 10n };
    };

    await expect(quoteTreasuryGoldAllocation({ quoteSwap, swap: async () => ({ hash: '0x1', fee: 1n, tokenInAmount: 1n, tokenOutAmount: 1n }) }, '50', DEFAULT_TREASURY_RULE)).resolves.toMatchObject({ tokenOutAmount: 10n });
  });

  it('does not allow a rule to exceed its batch cap', () => {
    expect(() => validateTreasurySwapAmount('250.000001', DEFAULT_TREASURY_RULE)).toThrow('maximum');
  });
});
