import { getPaymasterTokenAddress, getSepoliaRpcUrl } from '@/config/wdk';
import type { BalanceRow } from '@/features/wdk/wdk-types';
import { BaseAsset } from '@/features/wdk/wdk-hooks';

const BALANCE_OF_SELECTOR = '0x70a08231';

export function createSepoliaUsdtAsset(): BaseAsset {
  return new BaseAsset({
    id: 'usdt-sepolia',
    network: 'ethereum',
    symbol: 'USDT',
    name: 'USDT (Sepolia)',
    decimals: 6,
    address: getPaymasterTokenAddress(),
    isNative: false,
  });
}

export function getAssetDecimals(asset: BaseAsset): number {
  if (typeof asset.getDecimals === 'function') {
    return asset.getDecimals();
  }
  return asset.decimals ?? 6;
}

export async function fetchSepoliaUsdtBalanceAtomic(walletAddress: string): Promise<string> {
  const tokenAddress = getPaymasterTokenAddress();
  const paddedOwner = walletAddress.slice(2).toLowerCase().padStart(64, '0');
  const data = `${BALANCE_OF_SELECTOR}${paddedOwner}`;

  const response = await fetch(getSepoliaRpcUrl(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'eth_call',
      params: [{ to: tokenAddress, data }, 'latest'],
    }),
  });

  const payload = (await response.json()) as {
    result?: string;
    error?: { message?: string };
  };

  if (payload.error?.message) {
    throw new Error(payload.error.message);
  }
  if (!payload.result) {
    throw new Error('Sepolia RPC returned no balance.');
  }

  return BigInt(payload.result).toString();
}

export async function resolveSepoliaUsdtAvailable(params: {
  walletAddress: string;
  asset: BaseAsset;
  getBalance: (tokens: BaseAsset[]) => Promise<BalanceRow[]>;
}): Promise<bigint> {
  const assetId = params.asset.getId();
  let wdkError: string | undefined;

  try {
    const balances = await params.getBalance([params.asset]);
    const row =
      balances.find((item) => item.assetId === assetId) ??
      (balances.length === 1 ? balances[0] : undefined);

    if (row?.success && row.balance != null) {
      return BigInt(row.balance);
    }

    wdkError = row?.error ?? (balances.length === 0 ? 'empty balance response' : undefined);
  } catch (error) {
    wdkError = error instanceof Error ? error.message : String(error);
  }

  try {
    return BigInt(await fetchSepoliaUsdtBalanceAtomic(params.walletAddress));
  } catch (rpcError) {
    const rpcMessage = rpcError instanceof Error ? rpcError.message : String(rpcError);
    if (wdkError) {
      throw new Error(
        `Unable to read Sepolia USDT balance. Wallet: ${wdkError}. RPC: ${rpcMessage}`,
      );
    }
    throw new Error(`Unable to read Sepolia USDT balance. RPC: ${rpcMessage}`);
  }
}

export function usdtToAtomic(amount: string, decimals = 6): string {
  const normalized = amount.trim();
  if (!/^\d+(\.\d+)?$/.test(normalized)) {
    throw new Error('Invalid USDT amount');
  }
  const [whole = '0', fraction = ''] = normalized.split('.');
  const paddedFraction = fraction.padEnd(decimals, '0').slice(0, decimals);
  const combined = `${whole}${paddedFraction}`.replace(/^0+/, '');
  return combined.length > 0 ? combined : '0';
}

export function formatUsdtFromAtomic(atomic: bigint, decimals = 6): string {
  const divisor = 10n ** BigInt(decimals);
  const whole = atomic / divisor;
  const fraction = atomic % divisor;
  const fracStr = fraction.toString().padStart(decimals, '0').replace(/0+$/, '');
  return fracStr.length > 0 ? `${whole}.${fracStr}` : whole.toString();
}

export function requiredUsdtAtomic(amountAtomic: bigint, feeAtomic: bigint): bigint {
  return amountAtomic + feeAtomic;
}

export function parseFeeAtomic(fee: string | undefined): bigint {
  if (fee == null || fee.trim() === '') {
    throw new Error('Could not quote network fee.');
  }
  try {
    return BigInt(fee);
  } catch {
    throw new Error('Could not quote network fee.');
  }
}

export function assertFeeWithinCap(feeAtomic: bigint, maxFeeAtomic: bigint): void {
  // WDK rejects a transfer whose quote is equal to or above transferMaxFee.
  if (feeAtomic >= maxFeeAtomic) {
    throw new Error(
      `Network fee quote (${formatUsdtFromAtomic(feeAtomic)} USDT) meets or exceeds the ` +
        `Sepolia demo limit (${formatUsdtFromAtomic(maxFeeAtomic)} USDT). Retry in a moment.`,
    );
  }
}

export function assertSufficientUsdt(available: bigint, required: bigint): void {
  if (available < required) {
    const needed = formatUsdtFromAtomic(required);
    throw new Error(
      `Insufficient Sepolia USDT. Need ${needed} USDT on Sepolia testnet (includes network fee).`,
    );
  }
}

export function mapSendError(error: string | undefined): string {
  if (!error) {
    return 'Payment failed. No transaction hash returned.';
  }
  const lower = error.toLowerCase();
  if (lower.includes('exceeded maximum fee')) {
    return 'Network fee too high right now. Retry in a moment.';
  }
  if (lower.includes('not enough funds') || lower.includes('insufficient')) {
    return 'Insufficient Sepolia USDT for this payment.';
  }
  return error;
}

export function formatMatchWindow(startAt: string, endAt: string): string {
  const start = new Date(startAt);
  const end = new Date(endAt);
  const date = start.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  const startTime = start.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  const endTime = end.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  return `${date} · ${startTime} – ${endTime}`;
}

export function shortAddress(address: string | undefined | null): string {
  if (!address) {
    return '—';
  }
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}
