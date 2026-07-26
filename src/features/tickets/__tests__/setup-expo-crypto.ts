import { createHash, randomBytes } from 'node:crypto';
import { vi } from 'vitest';

vi.mock('expo-crypto', () => ({
  CryptoDigestAlgorithm: { SHA256: 'SHA256' },
  digestStringAsync: async (_algorithm: string, input: string) =>
    createHash('sha256').update(input).digest('hex'),
  getRandomBytesAsync: async (size: number) => new Uint8Array(randomBytes(size)),
}));
