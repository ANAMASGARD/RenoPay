export type RenoPayWdkAppState =
  | { status: 'UNAVAILABLE'; message: string }
  | { status: 'INITIALIZING' }
  | { status: 'REINITIALIZING' }
  | { status: 'NO_WALLET' }
  | { status: 'LOCKED'; walletId: string }
  | { status: 'READY'; walletId: string }
  | { status: 'ERROR'; error: Error };

export type WdkAppState = RenoPayWdkAppState;

export type UseAccountParams = {
  accountIndex: number;
  network: string;
};

export type TransactionParams = {
  to: string;
  asset: BaseAsset;
  amount: string;
};

/** Minimal asset type for transaction params in shared screen code. */
export class BaseAsset {
  id: string;
  network: string;
  symbol: string;
  name: string;
  decimals: number;
  isNative?: boolean;
  address?: string;

  constructor(props: Record<string, unknown>) {
    this.id = String(props.id ?? '');
    this.network = String(props.network ?? '');
    this.symbol = String(props.symbol ?? '');
    this.name = String(props.name ?? '');
    this.decimals = Number(props.decimals ?? 0);
    this.isNative = props.isNative as boolean | undefined;
    this.address = props.address as string | undefined;
  }

  getId(): string {
    return this.id;
  }

  getDecimals(): number {
    return this.decimals;
  }

  getContractAddress(): string | null {
    return this.address ?? null;
  }
}

export type TransactionResult = {
  success: boolean;
  hash?: string;
  fee?: string;
  error?: string;
};

export type BalanceRow = {
  success: boolean;
  assetId: string;
  balance: string | null;
  error?: string;
};

export type UseAccountReturn = {
  address: string | null | undefined;
  send: (params: TransactionParams) => Promise<TransactionResult>;
  getBalance?: (tokens: BaseAsset[]) => Promise<BalanceRow[]>;
  estimateFee?: (params: TransactionParams) => Promise<TransactionResult>;
};

export type WalletManagerReturn = {
  createWallet: (walletId: string) => Promise<void>;
  unlock: (walletId?: string) => Promise<void>;
  restoreWallet: (mnemonic: string, walletId: string) => Promise<string>;
  getMnemonic: (walletId: string) => Promise<string | null>;
  lock: () => void;
};
