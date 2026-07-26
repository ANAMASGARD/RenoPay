export type TreasuryRule = {
  operatingPercent: number;
  communityPercent: number;
  goldPercent: number;
  minimumLiquidityUsdt: string;
  allocationThresholdUsdt: string;
  maxAllocationUsdt: string;
  maxSlippagePercent: number;
  enabled: boolean;
  updatedAt: string;
};

export type TreasuryAllocationStatus = 'pending' | 'quoted' | 'submitted' | 'completed' | 'blocked' | 'failed';

export type TreasuryAllocation = {
  allocationId: string;
  status: TreasuryAllocationStatus;
  sourceAmountUsdt: string;
  contributingReceiptIds: string[];
  expectedGoldAtomic?: string;
  minimumGoldAtomic?: string;
  feeAtomic?: string;
  txHash?: string;
  reason?: string;
  createdAt: string;
  updatedAt: string;
};

export const DEFAULT_TREASURY_RULE: TreasuryRule = {
  operatingPercent: 70,
  communityPercent: 20,
  goldPercent: 10,
  minimumLiquidityUsdt: '20',
  allocationThresholdUsdt: '50',
  maxAllocationUsdt: '250',
  maxSlippagePercent: 1,
  enabled: true,
  updatedAt: new Date(0).toISOString(),
};
