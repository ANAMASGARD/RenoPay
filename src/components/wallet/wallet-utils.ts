import type { WdkAppState } from '@/features/wdk/wdk-types';

const EVM_ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/;

export function useWalletStatusLabel(
  status: WdkAppState['status'],
  unavailableMessage?: string | null,
): string {
  switch (status) {
    case 'READY':
      return 'Wallet connected';
    case 'LOCKED':
      return 'Wallet locked';
    case 'NO_WALLET':
      return 'No wallet on this device';
    case 'INITIALIZING':
    case 'REINITIALIZING':
      return 'Connecting wallet...';
    default:
      return unavailableMessage ?? 'Wallet unavailable';
  }
}

export function shortWalletAddress(address: string | null | undefined): string {
  if (!address) {
    return '';
  }
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function normalizeEvmAddress(value: string): string {
  return value.trim().replace(/\s+/g, '');
}

export function isValidEvmAddress(value: string): boolean {
  return EVM_ADDRESS_RE.test(normalizeEvmAddress(value));
}
