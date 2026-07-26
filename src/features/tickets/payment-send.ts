import { getTransferMaxFeeAtomic } from '@/config/wdk';
import {
  assertFeeWithinCap,
  assertSufficientUsdt,
  createSepoliaUsdtAsset,
  getAssetDecimals,
  mapSendError,
  parseFeeAtomic,
  requiredUsdtAtomic,
  resolveSepoliaUsdtAvailable,
  usdtToAtomic,
} from '@/features/tickets/payment-helpers';
import type { BalanceRow, TransactionParams, TransactionResult } from '@/features/wdk/wdk-types';
import { BaseAsset } from '@/features/wdk/wdk-hooks';

const SEND_TIMEOUT_MS = 90_000;

export type PaymentSendStage =
  | 'checking_balance'
  | 'estimating_fee'
  | 'confirm_device'
  | 'submitting';

export type SendSepoliaUsdtParams = {
  walletAddress: string;
  send: (params: TransactionParams) => Promise<TransactionResult>;
  getBalance: (tokens: BaseAsset[]) => Promise<BalanceRow[]>;
  estimateFee: (params: TransactionParams) => Promise<TransactionResult>;
  to: string;
  amountUsdt: string;
  onStage?: (stage: PaymentSendStage) => void;
};

export type SendSepoliaUsdtResult = {
  hash: string;
  fee?: string;
};

export type SepoliaUsdtPaymentPreflight = {
  txParams: TransactionParams;
  fee: string;
};

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, message: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(message)), timeoutMs);
    promise
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch((error: unknown) => {
        clearTimeout(timer);
        reject(error instanceof Error ? error : new Error(String(error)));
      });
  });
}

export async function preflightSepoliaUsdtPayment(
  params: Omit<SendSepoliaUsdtParams, 'send'>,
): Promise<SepoliaUsdtPaymentPreflight> {
  const usdtAsset = createSepoliaUsdtAsset();
  const decimals = getAssetDecimals(usdtAsset);
  const amount = usdtToAtomic(params.amountUsdt, decimals);
  const amountAtomic = BigInt(amount);
  const maxFeeAtomic = getTransferMaxFeeAtomic();

  const txParams = {
    to: params.to,
    asset: usdtAsset,
    amount,
  };

  params.onStage?.('checking_balance');

  const usdtAvailable = await withTimeout(
    resolveSepoliaUsdtAvailable({
      walletAddress: params.walletAddress,
      asset: usdtAsset,
      getBalance: params.getBalance,
    }),
    30_000,
    'Balance check timed out. Check your internet connection.',
  );

  params.onStage?.('estimating_fee');

  const estimate = await withTimeout(
    params.estimateFee(txParams),
    30_000,
    'Paymaster unreachable. Check internet and retry.',
  );

  if (!estimate.success) {
    throw new Error(estimate.error ?? 'Paymaster unreachable. Check internet and retry.');
  }

  const feeAtomic = parseFeeAtomic(estimate.fee);
  assertFeeWithinCap(feeAtomic, maxFeeAtomic);

  const requiredAtomic = requiredUsdtAtomic(amountAtomic, feeAtomic);
  assertSufficientUsdt(usdtAvailable, requiredAtomic);

  return { txParams, fee: estimate.fee! };
}

export async function sendSepoliaUsdtPayment(
  params: SendSepoliaUsdtParams,
): Promise<SendSepoliaUsdtResult> {
  const preflight = await preflightSepoliaUsdtPayment(params);

  params.onStage?.('confirm_device');
  params.onStage?.('submitting');

  const result = await withTimeout(
    params.send(preflight.txParams),
    SEND_TIMEOUT_MS,
    'Payment timed out after 90 seconds. Confirm with device PIN/biometric if prompted, then retry.',
  );

  if (!result.success || !result.hash) {
    throw new Error(mapSendError(result.error));
  }

  return {
    hash: result.hash,
    fee: result.fee,
  };
}
