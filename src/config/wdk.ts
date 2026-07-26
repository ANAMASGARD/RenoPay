/** Local WDK network config — avoids importing Tether packages from shared config. */
export type RenoPayWdkConfigs = {
  networks: Record<
    string,
    {
      blockchain: string;
      config: Record<string, unknown>;
    }
  >;
  protocols?: Record<string, { blockchain: string; protocolName: string; config: Record<string, unknown> }>;
};

export type EthereumNetworkConfig = {
  chainId: number;
  provider: string;
  bundlerUrl: string;
  paymasterUrl: string;
  paymasterAddress: string;
  safeModulesVersion: string;
  transferMaxFee: number;
  paymasterToken: { address: string };
};

/**
 * Candide's Sepolia USD₮ is test-only. This deliberately generous ceiling lets
 * the demo submit a real ERC-4337 transfer even when testnet fee quotes spike.
 * It is still enforced by both WDK and Reno Pay's balance preflight.
 */
export const SEPOLIA_DEMO_TRANSFER_MAX_FEE_ATOMIC = 20_000_000;
/** Testnet-only ceiling for ERC-4337 contract calls (approval + MatchSale.buy). */
export const SEPOLIA_DEMO_TRANSACTION_MAX_FEE_ATOMIC = 20_000_000;

export const wdkConfigs: RenoPayWdkConfigs = {
  networks: {
    ethereum: {
      blockchain: 'ethereum',
      config: {
        chainId: 11155111,
        provider: 'https://ethereum-sepolia-rpc.publicnode.com',
        bundlerUrl: 'https://api.candide.dev/public/v3/11155111',
        paymasterUrl: 'https://api.candide.dev/public/v3/11155111',
        paymasterAddress: '0x8b1f6cb5d062aa2ce8d581942bbb960420d875ba',
        // Required by @tetherto/wdk-wallet-evm-erc-4337 — without this, getAddress throws
        // "Unsupported safe modules version: undefined".
        safeModulesVersion: '0.3.0',
        transferMaxFee: SEPOLIA_DEMO_TRANSFER_MAX_FEE_ATOMIC,
        transactionMaxFee: SEPOLIA_DEMO_TRANSACTION_MAX_FEE_ATOMIC,
        // Candide Sepolia mock USDT — same token as https://dashboard.candide.dev/faucet
        // (WDK docs). Do NOT use Aave Sepolia USDT here or faucet funds won't match paymaster.
        paymasterToken: {
          address: '0xd077a400968890eacc75cdc901f0356c943e4fdb',
        },
      },
    },
  },
  protocols: {
    velora: {
      blockchain: 'ethereum',
      protocolName: 'velora',
      config: {},
    },
  },
};

export function getEthereumNetworkConfig(): EthereumNetworkConfig {
  const raw = wdkConfigs.networks.ethereum.config;
  const paymasterToken = raw.paymasterToken as { address: string } | undefined;
  if (!paymasterToken?.address) {
    throw new Error('Reno Pay WDK config missing paymasterToken.address');
  }

  return {
    chainId: raw.chainId as number,
    provider: raw.provider as string,
    bundlerUrl: raw.bundlerUrl as string,
    paymasterUrl: raw.paymasterUrl as string,
    paymasterAddress: raw.paymasterAddress as string,
    safeModulesVersion: raw.safeModulesVersion as string,
    transferMaxFee: raw.transferMaxFee as number,
    paymasterToken,
  };
}

export function getPaymasterTokenAddress(): string {
  return getEthereumNetworkConfig().paymasterToken.address;
}

export function getTransferMaxFeeAtomic(): bigint {
  return BigInt(getEthereumNetworkConfig().transferMaxFee);
}

export function getTransactionMaxFeeAtomic(): bigint {
  return BigInt((wdkConfigs.networks.ethereum.config.transactionMaxFee as number) ?? 0);
}

export function getSepoliaRpcUrl(): string {
  return getEthereumNetworkConfig().provider;
}
