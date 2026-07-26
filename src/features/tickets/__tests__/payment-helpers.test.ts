import { describe, expect, it } from 'vitest';

import {
  assertFundedForWdkDemo,
  formatWdkErrorMessage,
  mapWdkTransactionError,
  usdtToAtomic,
} from '@/features/tickets/payment-helpers';

describe('payment-helpers', () => {
  it('converts USDT decimal strings to atomic units', () => {
    expect(usdtToAtomic('10')).toBe('10000000');
    expect(usdtToAtomic('10.00')).toBe('10000000');
    expect(usdtToAtomic('0.01')).toBe('10000');
  });

  it('rejects invalid USDT amounts', () => {
    expect(() => usdtToAtomic('ten')).toThrow('Invalid USDT amount');
    expect(() => usdtToAtomic('-1')).toThrow('Invalid USDT amount');
  });

  it('requires minimum USDT before WDK contract calls', () => {
    expect(() => assertFundedForWdkDemo(0n)).toThrow('Wallet needs Sepolia test USDT');
    expect(() => assertFundedForWdkDemo(999_999n)).toThrow('Wallet needs Sepolia test USDT');
    expect(() => assertFundedForWdkDemo(1_000_000n)).not.toThrow();
  });

  it('maps paymaster failures to faucet guidance', () => {
    const message = mapWdkTransactionError('pm_getPaymasterData failed');
    expect(message).toContain('dashboard.candide.dev/faucet');
    expect(message).toContain('Sepolia ETH');
  });

  it('parses JSON WDK errors', () => {
    const message = formatWdkErrorMessage(
      '{"code":"UNKNOWN","message":"pm_getPaymasterData failed","error":"pm_getPaymasterData failed"}',
    );
    expect(message).toContain('dashboard.candide.dev/faucet');
  });
});
