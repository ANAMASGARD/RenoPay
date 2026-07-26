/** Visual cap for the balance ring (100 USDT). Amounts above still show real balance with a full ring. */
export const WALLET_BALANCE_RING_CAP_ATOMIC = 100_000_000n;

export function balanceFillRatio(
  balanceAtomic: bigint,
  capAtomic: bigint = WALLET_BALANCE_RING_CAP_ATOMIC,
): number {
  if (balanceAtomic <= 0n) {
    return 0;
  }
  if (balanceAtomic >= capAtomic) {
    return 1;
  }
  return Number((balanceAtomic * 10_000n) / capAtomic) / 10_000;
}

export function formatWalletBalanceDisplay(balanceAtomic: bigint, decimals = 6): string {
  const divisor = 10 ** decimals;
  const value = Number(balanceAtomic) / divisor;
  return value.toFixed(2);
}
