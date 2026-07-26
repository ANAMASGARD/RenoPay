import { getPaymasterTokenAddress, getSepoliaRpcUrl } from '@/config/wdk';
import { usdtToAtomic } from '@/features/tickets/payment-helpers';

const TRANSFER_TOPIC = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';

const SEPOLIA_USDT_ADDRESS = getPaymasterTokenAddress();
const SEPOLIA_RPC = getSepoliaRpcUrl();

export type ChainUsdtPayment = {
  txHash: string;
  senderAddress: string;
  receiverAddress: string;
  amountAtomic: string;
};

type RpcLog = {
  address: string;
  topics: string[];
  data: string;
  transactionHash: string;
  blockNumber: string;
};

async function rpcCall<T>(method: string, params: unknown[]): Promise<T> {
  const response = await fetch(SEPOLIA_RPC, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: Date.now(),
      method,
      params,
    }),
  });
  const json = (await response.json()) as { result?: T; error?: { message: string } };
  if (json.error) {
    throw new Error(json.error.message);
  }
  if (json.result === undefined) {
    throw new Error(`RPC ${method} returned no result`);
  }
  return json.result;
}

function padAddress(address: string): string {
  return `0x${address.slice(2).toLowerCase().padStart(64, '0')}`;
}

function hexToBigInt(hex: string): bigint {
  return BigInt(hex);
}

function hexToNumber(hex: string): number {
  return Number.parseInt(hex, 16);
}

export async function fetchCurrentBlockNumber(): Promise<number> {
  const hex = await rpcCall<string>('eth_blockNumber', []);
  return hexToNumber(hex);
}

export async function findIncomingUsdtPayment(params: {
  receiverAddress: string;
  amountUsdt: string;
  fromBlock: number;
}): Promise<ChainUsdtPayment | null> {
  const expectedAmount = usdtToAtomic(params.amountUsdt, 6);
  const toTopic = padAddress(params.receiverAddress);
  const fromBlockHex = `0x${params.fromBlock.toString(16)}`;

  const logs = await rpcCall<RpcLog[]>('eth_getLogs', [
    {
      fromBlock: fromBlockHex,
      toBlock: 'latest',
      address: SEPOLIA_USDT_ADDRESS,
      topics: [TRANSFER_TOPIC, null, toTopic],
    },
  ]);

  for (const log of logs) {
    if (log.address.toLowerCase() !== SEPOLIA_USDT_ADDRESS.toLowerCase()) {
      continue;
    }
    const amountAtomic = hexToBigInt(log.data).toString();
    if (amountAtomic !== expectedAmount) {
      continue;
    }
    const fromTopic = log.topics[1];
    if (!fromTopic) {
      continue;
    }
    const senderAddress = `0x${fromTopic.slice(-40)}`;
    return {
      txHash: log.transactionHash,
      senderAddress,
      receiverAddress: params.receiverAddress,
      amountAtomic,
    };
  }

  return null;
}
