import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  assertFeeWithinCap,
  assertSufficientUsdt,
  createSepoliaUsdtAsset,
  parseFeeAtomic,
  requiredUsdtAtomic,
  resolveSepoliaUsdtAvailable,
} from '@/features/tickets/payment-helpers';
import {
  preflightSepoliaUsdtPayment,
  sendSepoliaUsdtPayment,
} from '@/features/tickets/payment-send';
import { getTransferMaxFeeAtomic } from '@/config/wdk';
import type { BalanceRow, TransactionResult } from '@/features/wdk/wdk-types';

const WALLET = '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb';
const RECEIVER = '0x8ba1f109551bD432803c606dC05D21f9e8aFa325';

function mockBalance(balance: string): BalanceRow {
  return { success: true, assetId: 'usdt-sepolia', balance };
}

function mockEstimate(fee: string): TransactionResult {
  return { success: true, fee };
}

function mockSend(hash: string): TransactionResult {
  return { success: true, hash, fee: '10000' };
}

function baseParams(overrides: Partial<Parameters<typeof sendSepoliaUsdtPayment>[0]> = {}) {
  return {
    walletAddress: WALLET,
    getBalance: vi.fn().mockResolvedValue([mockBalance('5000000')]),
    estimateFee: vi.fn().mockResolvedValue(mockEstimate('10000')),
    send: vi.fn().mockResolvedValue(mockSend('0xabc')),
    to: RECEIVER,
    amountUsdt: '1',
    ...overrides,
  };
}

describe('payment-helpers gasless math', () => {
  it('uses the documented testnet demo fee ceiling in WDK and payment preflight', () => {
    expect(getTransferMaxFeeAtomic()).toBe(20_000_000n);
  });

  it('sums amount and fee atomically', () => {
    expect(requiredUsdtAtomic(1_000_000n, 50_000n)).toBe(1_050_000n);
  });

  it('rejects fees equal to or above the transferMaxFee cap, matching WDK', () => {
    expect(() => assertFeeWithinCap(20_000_000n, 20_000_000n)).toThrow(
      'Network fee quote (20 USDT) meets or exceeds the Sepolia demo limit (20 USDT).',
    );
  });

  it('rejects insufficient USDT including fee', () => {
    expect(() => assertSufficientUsdt(1_000_000n, 1_050_000n)).toThrow(
      'Insufficient Sepolia USDT. Need 1.05 USDT on Sepolia testnet (includes network fee).',
    );
  });

  it('rejects missing fee quotes', () => {
    expect(() => parseFeeAtomic(undefined)).toThrow('Could not quote network fee.');
    expect(() => parseFeeAtomic('')).toThrow('Could not quote network fee.');
  });
});

describe('resolveSepoliaUsdtAvailable', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('falls back to Sepolia RPC when WDK balance lookup fails', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      json: async () => ({ result: '0x1e8480' }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const available = await resolveSepoliaUsdtAvailable({
      walletAddress: WALLET,
      asset: createSepoliaUsdtAsset(),
      getBalance: vi.fn().mockResolvedValue([]),
    });

    expect(available).toBe(2_000_000n);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

describe('sendSepoliaUsdtPayment', () => {
  it('returns the quote used in the confirmation step before sending', async () => {
    const send = vi.fn();

    const preflight = await preflightSepoliaUsdtPayment({
      ...baseParams({
        amountUsdt: '20',
        getBalance: vi.fn().mockResolvedValue([mockBalance('20250000')]),
        estimateFee: vi.fn().mockResolvedValue(mockEstimate('250000')),
      }),
      onStage: undefined,
    });

    expect(preflight.fee).toBe('250000');
    expect(preflight.txParams.amount).toBe('20000000');
    expect(send).not.toHaveBeenCalled();
  });

  it('queries USDT balance only (no ETH gate)', async () => {
    const usdtAsset = createSepoliaUsdtAsset();
    const getBalance = vi.fn().mockResolvedValue([mockBalance('5000000')]);
    const params = baseParams({ getBalance });

    await sendSepoliaUsdtPayment(params);

    expect(getBalance).toHaveBeenCalledTimes(1);
    expect(getBalance.mock.calls[0][0]).toHaveLength(1);
    expect(getBalance.mock.calls[0][0][0].getId()).toBe('usdt-sepolia');
    expect(usdtAsset.getId()).toBe('usdt-sepolia');
  });

  it('matches balance rows via getId()', async () => {
    const getBalance = vi.fn().mockResolvedValue([
      { success: true, assetId: 'usdt-sepolia', balance: '2000000' },
    ]);

    await sendSepoliaUsdtPayment(baseParams({ getBalance }));

    expect(getBalance).toHaveBeenCalledTimes(1);
  });

  it('fails when USDT balance is below amount plus fee', async () => {
    const send = vi.fn();

    await expect(
      sendSepoliaUsdtPayment(
        baseParams({
          getBalance: vi.fn().mockResolvedValue([mockBalance('1000000')]),
          send,
        }),
      ),
    ).rejects.toThrow('Insufficient Sepolia USDT');

    expect(send).not.toHaveBeenCalled();
  });

  it('fails when fee exceeds the demo transferMaxFee', async () => {
    const send = vi.fn();

    await expect(
      sendSepoliaUsdtPayment(
        baseParams({
          getBalance: vi.fn().mockResolvedValue([mockBalance('25000000')]),
          estimateFee: vi.fn().mockResolvedValue(mockEstimate('20000000')),
          send,
        }),
      ),
    ).rejects.toThrow(
      'Network fee quote (20 USDT) meets or exceeds the Sepolia demo limit (20 USDT).',
    );

    expect(send).not.toHaveBeenCalled();
  });

  it('propagates estimateFee failures as paymaster unreachable', async () => {
    const send = vi.fn();

    await expect(
      sendSepoliaUsdtPayment(
        baseParams({
          estimateFee: vi.fn().mockResolvedValue({
            success: false,
            error: 'bundler offline',
          } satisfies TransactionResult),
          send,
        }),
      ),
    ).rejects.toThrow('bundler offline');

    expect(send).not.toHaveBeenCalled();
  });

  it('sends when USDT covers amount plus fee', async () => {
    const send = vi.fn().mockResolvedValue(mockSend('0xdeadbeef'));

    const result = await sendSepoliaUsdtPayment(
      baseParams({
        getBalance: vi.fn().mockResolvedValue([mockBalance('2000000')]),
        send,
      }),
    );

    expect(send).toHaveBeenCalledTimes(1);
    expect(result.hash).toBe('0xdeadbeef');
  });

  it('sends a 20 USDT ticket when balance covers ticket plus quoted fee', async () => {
    const send = vi.fn().mockResolvedValue(mockSend('0x20ticket'));

    const result = await sendSepoliaUsdtPayment(
      baseParams({
        amountUsdt: '20',
        getBalance: vi.fn().mockResolvedValue([mockBalance('20250000')]),
        estimateFee: vi.fn().mockResolvedValue(mockEstimate('250000')),
        send,
      }),
    );

    expect(send).toHaveBeenCalledOnce();
    expect(result).toMatchObject({ hash: '0x20ticket', fee: '10000' });
  });

  it('maps WDK send errors to demo-friendly copy', async () => {
    await expect(
      sendSepoliaUsdtPayment(
        baseParams({
          send: vi.fn().mockResolvedValue({
            success: false,
            error: 'Exceeded maximum fee',
          } satisfies TransactionResult),
        }),
      ),
    ).rejects.toThrow('Network fee too high right now. Retry in a moment.');
  });
});
