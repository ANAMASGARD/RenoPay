import AsyncStorage from '@react-native-async-storage/async-storage';

import { DEFAULT_TREASURY_RULE, type TreasuryAllocation, type TreasuryRule } from './treasury-types';

const RULE_KEY = '@renopay/treasury_rule_v1';
const ALLOCATIONS_KEY = '@renopay/treasury_allocations_v1';

export async function loadTreasuryRule(): Promise<TreasuryRule> {
  const raw = await AsyncStorage.getItem(RULE_KEY);
  if (!raw) return DEFAULT_TREASURY_RULE;
  try {
    const parsed = JSON.parse(raw) as Partial<TreasuryRule>;
    return { ...DEFAULT_TREASURY_RULE, ...parsed };
  } catch {
    return DEFAULT_TREASURY_RULE;
  }
}

export async function saveTreasuryRule(rule: TreasuryRule): Promise<void> {
  await AsyncStorage.setItem(RULE_KEY, JSON.stringify(rule));
}

export async function loadTreasuryAllocations(): Promise<TreasuryAllocation[]> {
  const raw = await AsyncStorage.getItem(ALLOCATIONS_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed as TreasuryAllocation[] : [];
  } catch {
    return [];
  }
}

export async function saveTreasuryAllocation(allocation: TreasuryAllocation): Promise<void> {
  const current = await loadTreasuryAllocations();
  const next = [allocation, ...current.filter((item) => item.allocationId !== allocation.allocationId)];
  await AsyncStorage.setItem(ALLOCATIONS_KEY, JSON.stringify(next));
}
