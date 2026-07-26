import {
  decodeEventLog,
  decodeFunctionResult,
  encodeFunctionData,
  isAddress,
  keccak256,
  toHex,
} from 'viem';

import { getPaymasterTokenAddress, getSepoliaRpcUrl, getTransactionMaxFeeAtomic } from '@/config/wdk';
import { usdtToAtomic } from '@/features/tickets/payment-helpers';
import type { EventLocation } from '@/features/tickets/ticket-types';

export const MATCH_REGISTRY_ABI = [
  {
    type: 'function', name: 'createMatch', stateMutability: 'nonpayable',
    inputs: [{ name: 'input', type: 'tuple', components: [
      { name: 'eventName', type: 'string' }, { name: 'homeTeam', type: 'string' },
      { name: 'awayTeam', type: 'string' }, { name: 'venue', type: 'string' },
      { name: 'latitudeE6', type: 'int32' }, { name: 'longitudeE6', type: 'int32' },
      { name: 'startAt', type: 'uint64' }, { name: 'priceAtomic', type: 'uint128' },
      { name: 'capacity', type: 'uint32' },
    ] }], outputs: [{ name: 'matchId', type: 'bytes32' }, { name: 'sale', type: 'address' }],
  },
  { type: 'function', name: 'remaining', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint32' }] },
  { type: 'function', name: 'buy', stateMutability: 'nonpayable', inputs: [{ name: 'quantity', type: 'uint32' }], outputs: [] },
  { type: 'event', name: 'TicketsPurchased', inputs: [
    { name: 'buyer', type: 'address', indexed: true }, { name: 'quantity', type: 'uint32', indexed: false },
    { name: 'sold', type: 'uint32', indexed: false }, { name: 'amountAtomic', type: 'uint256', indexed: false },
  ] },
  { type: 'event', name: 'MatchPosted', inputs: [
    { name: 'matchId', type: 'bytes32', indexed: true }, { name: 'sale', type: 'address', indexed: true },
    { name: 'club', type: 'address', indexed: true }, { name: 'eventName', type: 'string', indexed: false },
    { name: 'homeTeam', type: 'string', indexed: false }, { name: 'awayTeam', type: 'string', indexed: false },
    { name: 'venue', type: 'string', indexed: false }, { name: 'latitudeE6', type: 'int32', indexed: false },
    { name: 'longitudeE6', type: 'int32', indexed: false }, { name: 'startAt', type: 'uint64', indexed: false },
    { name: 'priceAtomic', type: 'uint128', indexed: false }, { name: 'capacity', type: 'uint32', indexed: false },
  ] },
] as const;

const ERC20_ABI = [{ type: 'function', name: 'approve', stateMutability: 'nonpayable', inputs: [{ name: 'spender', type: 'address' }, { name: 'amount', type: 'uint256' }], outputs: [{ type: 'bool' }] }] as const;
const registryAddress = process.env.EXPO_PUBLIC_MATCH_REGISTRY_ADDRESS;
const deploymentBlock = Number.parseInt(process.env.EXPO_PUBLIC_MATCH_REGISTRY_DEPLOYMENT_BLOCK ?? '0', 10);

export type PublishedMatch = {
  matchId: string;
  saleAddress: string;
  clubAddress: string;
  eventName: string;
  homeTeam: string;
  awayTeam: string;
  venue: string;
  location: EventLocation;
  startAt: string;
  priceUsdt: string;
  priceAtomic: string;
  capacity: number;
  remaining?: number;
};

export type MatchPurchase = {
  txHash: string;
  buyer: string;
  quantity: number;
  sold: number;
  amountUsdt: string;
  blockNumber: number;
};

export type EvmAccountExtension = {
  quoteSendTransaction: (tx: unknown, config?: unknown) => Promise<{ fee: string }>;
  sendTransaction: (tx: unknown, config?: unknown) => Promise<{ hash: string; fee: string }>;
  getUserOperationReceipt?: (hash: string) => Promise<unknown>;
};

export function isMatchRegistryConfigured(): boolean {
  return Boolean(registryAddress && isAddress(registryAddress) && !/^0x0{40}$/i.test(registryAddress));
}

export function getMatchRegistryAddress(): string {
  if (!isMatchRegistryConfigured()) throw new Error('Match registry is not configured. Add EXPO_PUBLIC_MATCH_REGISTRY_ADDRESS and reload.');
  return registryAddress!;
}

export function coordinateToE6(value: number, kind: 'latitude' | 'longitude'): number {
  const limit = kind === 'latitude' ? 90 : 180;
  if (!Number.isFinite(value) || Math.abs(value) > limit) throw new Error(`Invalid ${kind}.`);
  return Math.round(value * 1_000_000);
}

function atomicToUsdt(value: bigint): string {
  const whole = value / 1_000_000n;
  const fraction = (value % 1_000_000n).toString().padStart(6, '0').replace(/0+$/, '');
  return fraction ? `${whole}.${fraction}` : whole.toString();
}

async function rpc<T>(method: string, params: unknown[]): Promise<T> {
  const endpoints = [...new Set([getSepoliaRpcUrl(), 'https://rpc.sepolia.org', 'https://sepolia.drpc.org'])];
  let lastError: unknown;
  for (const endpoint of endpoints) {
    try {
      const response = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ jsonrpc: '2.0', id: Date.now(), method, params }) });
      const body = await response.json() as { result?: T; error?: { message?: string } };
      if (body.error || body.result === undefined) throw new Error(body.error?.message ?? `RPC ${method} failed`);
      return body.result;
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError instanceof Error ? lastError : new Error(`RPC ${method} failed`);
}

export async function fetchPublishedMatches(): Promise<PublishedMatch[]> {
  if (!isMatchRegistryConfigured()) return [];
  const topic = keccak256(toHex('MatchPosted(bytes32,address,address,string,string,string,string,int32,int32,uint64,uint128,uint32)'));
  const latest = Number.parseInt(await rpc<string>('eth_blockNumber', []), 16);
  const configuredFrom = Number.isFinite(deploymentBlock) ? deploymentBlock : 0;
  // If a stale deployment block is ahead of the provider's current head, still
  // search a recent window instead of silently returning zero markers.
  const from = configuredFrom <= latest ? configuredFrom : Math.max(0, latest - 250_000);
  const ranges: [number, number][] = [];
  for (let cursor = from; cursor <= latest; cursor += 2_000) {
    ranges.push([cursor, Math.min(cursor + 1_999, latest)]);
  }
  const logs: { topics: string[]; data: string }[] = [];
  // Public Sepolia RPCs are much faster with a small bounded amount of parallelism
  // than with hundreds of serial 2k-block requests.
  for (let index = 0; index < ranges.length; index += 6) {
    const batch = await Promise.all(ranges.slice(index, index + 6).map(([start, end]) =>
      rpc<typeof logs>('eth_getLogs', [{ address: getMatchRegistryAddress(), fromBlock: `0x${start.toString(16)}`, toBlock: `0x${end.toString(16)}`, topics: [topic] }]),
    ));
    logs.push(...batch.flat());
  }
  return logs.flatMap((log) => {
    try {
      const decoded = decodeEventLog({ abi: MATCH_REGISTRY_ABI, data: log.data as `0x${string}`, topics: log.topics as [`0x${string}`, ...`0x${string}`[]] });
      if (decoded.eventName !== 'MatchPosted') return [];
      const args = decoded.args as Record<string, unknown>;
      return [{
        matchId: String(args.matchId), saleAddress: String(args.sale), clubAddress: String(args.club),
        eventName: String(args.eventName), homeTeam: String(args.homeTeam), awayTeam: String(args.awayTeam), venue: String(args.venue),
        location: { latitude: Number(args.latitudeE6) / 1_000_000, longitude: Number(args.longitudeE6) / 1_000_000 },
        startAt: new Date(Number(args.startAt) * 1000).toISOString(), priceAtomic: String(args.priceAtomic), priceUsdt: atomicToUsdt(BigInt(args.priceAtomic as bigint)), capacity: Number(args.capacity),
      }];
    } catch { return []; }
  });
}

export async function fetchRemainingCapacity(saleAddress: string): Promise<number> {
  const data = encodeFunctionData({ abi: MATCH_REGISTRY_ABI, functionName: 'remaining' });
  const result = await rpc<`0x${string}`>('eth_call', [{ to: saleAddress, data }, 'latest']);
  return Number(decodeFunctionResult({ abi: MATCH_REGISTRY_ABI, functionName: 'remaining', data: result }));
}

export async function fetchMatchSalePurchases(saleAddress: string): Promise<MatchPurchase[]> {
  if (!isAddress(saleAddress)) return [];
  const topic = keccak256(toHex('TicketsPurchased(address,uint32,uint32,uint256)'));
  const latest = Number.parseInt(await rpc<string>('eth_blockNumber', []), 16);
  const from = Number.isFinite(deploymentBlock) ? deploymentBlock : 0;
  const logs: { topics: string[]; data: string; transactionHash: string; blockNumber: string }[] = [];
  for (let cursor = from; cursor <= latest; cursor += 2_000) {
    logs.push(...await rpc<typeof logs>('eth_getLogs', [{ address: saleAddress, fromBlock: `0x${cursor.toString(16)}`, toBlock: `0x${Math.min(cursor + 1_999, latest).toString(16)}`, topics: [topic] }]));
  }
  return logs.flatMap((log) => {
    try {
      const decoded = decodeEventLog({ abi: MATCH_REGISTRY_ABI, data: log.data as `0x${string}`, topics: log.topics as [`0x${string}`, ...`0x${string}`[]] });
      if (decoded.eventName !== 'TicketsPurchased') return [];
      const args = decoded.args as Record<string, unknown>;
      return [{ txHash: log.transactionHash, buyer: String(args.buyer), quantity: Number(args.quantity), sold: Number(args.sold), amountUsdt: atomicToUsdt(BigInt(args.amountAtomic as bigint)), blockNumber: Number.parseInt(log.blockNumber, 16) }];
    } catch { return []; }
  });
}

export function buildCreateMatchCall(draft: { eventName: string; homeTeam: string; awayTeam: string; venue: string; startAt: string; priceUsdt: string; quantity: number; location: EventLocation }) {
  return encodeFunctionData({ abi: MATCH_REGISTRY_ABI, functionName: 'createMatch', args: [{ eventName: draft.eventName.trim(), homeTeam: draft.homeTeam.trim(), awayTeam: draft.awayTeam.trim(), venue: draft.venue.trim(), latitudeE6: coordinateToE6(draft.location.latitude, 'latitude'), longitudeE6: coordinateToE6(draft.location.longitude, 'longitude'), startAt: BigInt(Math.floor(new Date(draft.startAt).getTime() / 1000)), priceAtomic: BigInt(usdtToAtomic(draft.priceUsdt, 6)), capacity: draft.quantity }] });
}

export async function publishMatch(extension: EvmAccountExtension, draft: Parameters<typeof buildCreateMatchCall>[0]): Promise<{ hash: string; fee: string }> {
  const tx = { to: getMatchRegistryAddress(), value: 0n, data: buildCreateMatchCall(draft) };
  await extension.quoteSendTransaction(tx, { transactionMaxFee: getTransactionMaxFeeAtomic() });
  return extension.sendTransaction(tx, { transactionMaxFee: getTransactionMaxFeeAtomic() });
}

function decodeMatchLogs(logs: { topics: string[]; data: string }[]): PublishedMatch | null {
  const match = logs.flatMap((log) => {
    try {
      const decoded = decodeEventLog({ abi: MATCH_REGISTRY_ABI, data: log.data as `0x${string}`, topics: log.topics as [`0x${string}`, ...`0x${string}`[]] });
      if (decoded.eventName !== 'MatchPosted') return [];
      const args = decoded.args as Record<string, unknown>;
      return [{ matchId: String(args.matchId), saleAddress: String(args.sale), clubAddress: String(args.club), eventName: String(args.eventName), homeTeam: String(args.homeTeam), awayTeam: String(args.awayTeam), venue: String(args.venue), location: { latitude: Number(args.latitudeE6) / 1_000_000, longitude: Number(args.longitudeE6) / 1_000_000 }, startAt: new Date(Number(args.startAt) * 1000).toISOString(), priceAtomic: String(args.priceAtomic), priceUsdt: atomicToUsdt(BigInt(args.priceAtomic as bigint)), capacity: Number(args.capacity) }];
    } catch { return []; }
  });
  return match[0] ?? null;
}

function logsFromReceipt(value: unknown): { topics: string[]; data: string }[] {
  if (!value || typeof value !== 'object') return [];
  const record = value as { logs?: unknown; receipt?: unknown };
  if (Array.isArray(record.logs)) return record.logs as { topics: string[]; data: string }[];
  if (record.receipt) return logsFromReceipt(record.receipt);
  return [];
}

/** WDK may return a UserOperation hash before its inner EVM receipt is indexed. */
export async function getPublishedMatchFromTransaction(hash: string, extension?: EvmAccountExtension): Promise<PublishedMatch | null> {
  // Do not block ticket creation on public-RPC indexing. The submitted hash is
  // already a durable on-chain reference; Map discovery will pick up MatchPosted
  // as soon as the next log query sees the included operation.
  try {
    const receipt = await rpc<{ logs?: { topics: string[]; data: string }[] } | null>('eth_getTransactionReceipt', [hash]);
    const directMatch = decodeMatchLogs(receipt?.logs ?? []);
    if (directMatch) return directMatch;
  } catch {
    // WDK may return a UserOperation hash, which is not an eth transaction hash.
  }
  if (extension?.getUserOperationReceipt) {
    try {
      const userOperationReceipt = await extension.getUserOperationReceipt(hash);
      const userOpMatch = decodeMatchLogs(logsFromReceipt(userOperationReceipt));
      if (userOpMatch) return userOpMatch;
    } catch {
      // The bundler can briefly return “not found” while the operation propagates.
    }
  }
  return null;
}

export async function buyMatchTickets(extension: EvmAccountExtension, saleAddress: string, priceUsdt: string, quantity: number): Promise<{ hash: string; fee: string }> {
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 4) throw new Error('Choose between 1 and 4 tickets.');
  const amount = BigInt(usdtToAtomic(priceUsdt, 6)) * BigInt(quantity);
  const tx = [
    { to: getPaymasterTokenAddress(), value: 0n, data: encodeFunctionData({ abi: ERC20_ABI, functionName: 'approve', args: [saleAddress as `0x${string}`, amount] }) },
    { to: saleAddress, value: 0n, data: encodeFunctionData({ abi: MATCH_REGISTRY_ABI, functionName: 'buy', args: [quantity] }) },
  ];
  await extension.quoteSendTransaction(tx, { transactionMaxFee: getTransactionMaxFeeAtomic() });
  return extension.sendTransaction(tx, { transactionMaxFee: getTransactionMaxFeeAtomic() });
}
