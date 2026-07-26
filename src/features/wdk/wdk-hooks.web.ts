import { useCallback } from 'react';

import type {
  RenoPayWdkAppState,
  TransactionParams,
  TransactionResult,
  UseAccountParams,
  UseAccountReturn,
  WalletManagerReturn,
} from './wdk-types';

export { BaseAsset } from './wdk-types';

const WEB_MESSAGE =
  'WDK wallet and P2P require the Reno Pay dev client on Android or iOS. Web preview is UI-only.';

export type { RenoPayWdkAppState, WdkAppState } from './wdk-types';

export function useWdkApp(): { state: RenoPayWdkAppState } {
  return {
    state: { status: 'UNAVAILABLE', message: WEB_MESSAGE },
  };
}

export function useWalletManager(): WalletManagerReturn {
  const unavailable = useCallback(async () => {
    throw new Error(WEB_MESSAGE);
  }, []);

  const lock = useCallback(() => {
    // no-op on web preview
  }, []);

  return {
    createWallet: unavailable,
    unlock: unavailable,
    restoreWallet: unavailable,
    getMnemonic: unavailable,
    lock,
  };
}

export function useAccount(_params: UseAccountParams): UseAccountReturn {
  const send = useCallback(async (_params: TransactionParams): Promise<TransactionResult> => {
    throw new Error(WEB_MESSAGE);
  }, []);

  return {
    address: undefined,
    send,
  };
}

export type { UseAccountParams, UseAccountReturn };
