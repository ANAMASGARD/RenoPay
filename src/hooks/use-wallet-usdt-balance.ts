import { useCallback, useEffect, useRef, useState } from 'react';

import {
  balanceFillRatio,
  formatWalletBalanceDisplay,
} from '@/components/wallet/wallet-balance-utils';
import { fetchSepoliaUsdtBalanceAtomic } from '@/features/tickets/payment-helpers';

const POLL_MS = 20_000;

export type WalletUsdtBalanceStatus = 'idle' | 'loading' | 'ready' | 'error';

export function useWalletUsdtBalance(walletAddress: string | null, enabled: boolean) {
  const [balanceAtomic, setBalanceAtomic] = useState<bigint>(0n);
  const [status, setStatus] = useState<WalletUsdtBalanceStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const requestId = useRef(0);

  const load = useCallback(
    async (showLoading: boolean) => {
      if (!enabled || !walletAddress) {
        setBalanceAtomic(0n);
        setStatus('idle');
        setError(null);
        return;
      }

      const id = ++requestId.current;
      if (showLoading) {
        setStatus('loading');
      }

      try {
        const atomic = await fetchSepoliaUsdtBalanceAtomic(walletAddress);
        if (id !== requestId.current) {
          return;
        }
        setBalanceAtomic(BigInt(atomic));
        setStatus('ready');
        setError(null);
      } catch (loadError) {
        if (id !== requestId.current) {
          return;
        }
        setError(loadError instanceof Error ? loadError.message : 'Unable to load balance');
        setStatus('error');
      }
    },
    [enabled, walletAddress],
  );

  const refresh = useCallback(() => {
    void load(true);
  }, [load]);

  useEffect(() => {
    void load(true);
  }, [load]);

  useEffect(() => {
    if (!enabled || !walletAddress) {
      return undefined;
    }

    const timer = setInterval(() => {
      void load(false);
    }, POLL_MS);

    return () => clearInterval(timer);
  }, [enabled, load, walletAddress]);

  return {
    balanceAtomic,
    displayUsdt: formatWalletBalanceDisplay(balanceAtomic),
    fillRatio: balanceFillRatio(balanceAtomic),
    status,
    error,
    refresh,
  };
}
