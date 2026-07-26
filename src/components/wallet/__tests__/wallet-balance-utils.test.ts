import { describe, expect, it } from 'vitest';

import {
  WALLET_BALANCE_RING_CAP_ATOMIC,
  balanceFillRatio,
  formatWalletBalanceDisplay,
} from '@/components/wallet/wallet-balance-utils';

describe('wallet-balance-utils', () => {
  it('returns zero fill for empty balance', () => {
    expect(balanceFillRatio(0n)).toBe(0);
  });

  it('returns half fill for 50 USDT against 100 cap', () => {
    expect(balanceFillRatio(50_000_000n)).toBe(0.5);
  });

  it('caps fill ratio at 1 for balances at or above demo cap', () => {
    expect(balanceFillRatio(WALLET_BALANCE_RING_CAP_ATOMIC)).toBe(1);
    expect(balanceFillRatio(200_000_000n)).toBe(1);
  });

  it('formats empty wallet as 0.00', () => {
    expect(formatWalletBalanceDisplay(0n)).toBe('0.00');
  });

  it('formats funded balance with two decimals', () => {
    expect(formatWalletBalanceDisplay(12_500_000n)).toBe('12.50');
  });
});
