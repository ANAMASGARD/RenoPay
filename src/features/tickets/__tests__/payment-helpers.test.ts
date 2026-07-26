import { describe, expect, it } from 'vitest';

import { usdtToAtomic } from '@/features/tickets/payment-helpers';

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
});
