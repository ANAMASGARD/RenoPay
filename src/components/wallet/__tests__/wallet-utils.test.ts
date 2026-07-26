import { describe, expect, it } from 'vitest';

import { isValidEvmAddress, normalizeEvmAddress } from '@/components/wallet/wallet-utils';

describe('wallet-utils address validation', () => {
  it('normalizes whitespace from pasted addresses', () => {
    expect(normalizeEvmAddress('0xA735B28484B8d30506aD8A162 12333d1d658ff62')).toBe(
      '0xA735B28484B8d30506aD8A16212333d1d658ff62',
    );
  });

  it('accepts valid EVM addresses', () => {
    expect(isValidEvmAddress('0xA735B28484B8d30506aD8A16212333d1d658ff62')).toBe(true);
  });

  it('rejects truncated addresses but accepts spaced input after normalization', () => {
    expect(isValidEvmAddress('0xA735B28484B8d30506aD8A162 12333d1d658ff62')).toBe(true);
    expect(isValidEvmAddress('0xA735...62')).toBe(false);
  });
});
