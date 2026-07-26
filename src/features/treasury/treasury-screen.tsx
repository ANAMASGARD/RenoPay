import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, StyleSheet, Switch, Text, TextInput, View } from 'react-native';

import { PitchScreen } from '@/components/layout/pitch-screen';
import { NeoBrutalButton } from '@/components/ui/neo-brutal-button';
import { RenoPayBrand } from '@/constants/renopay-brand';
import { formatUsdtFromAtomic, usdtToAtomic } from '@/features/tickets/payment-helpers';
import { loadTreasuryAllocations, loadTreasuryRule, saveTreasuryAllocation, saveTreasuryRule } from '@/features/treasury/treasury-storage';
import { DEFAULT_TREASURY_RULE, type TreasuryAllocation, type TreasuryRule } from '@/features/treasury/treasury-types';
import { useTickets } from '@/features/tickets/tickets-context';

function numeric(value: string, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export default function TreasuryScreen() {
  const { attendees } = useTickets();
  const [rule, setRule] = useState<TreasuryRule>(DEFAULT_TREASURY_RULE);
  const [allocations, setAllocations] = useState<TreasuryAllocation[]>([]);
  const [ready, setReady] = useState(false);

  const receiptRevenue = useMemo(
    () => attendees.reduce((total, attendee) => total + BigInt(usdtToAtomic(attendee.amountUsdt)), 0n),
    [attendees],
  );
  const goldTarget = receiptRevenue * BigInt(rule.goldPercent) / 100n;
  const communityTarget = receiptRevenue * BigInt(rule.communityPercent) / 100n;

  const refresh = useCallback(async () => {
    const [nextRule, nextAllocations] = await Promise.all([loadTreasuryRule(), loadTreasuryAllocations()]);
    setRule(nextRule);
    setAllocations(nextAllocations);
    setReady(true);
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  const setPercent = (key: 'operatingPercent' | 'communityPercent' | 'goldPercent', value: string) => {
    setRule((current) => ({ ...current, [key]: Math.max(0, Math.min(100, Math.round(numeric(value)))) }));
  };

  const saveRule = async () => {
    const total = rule.operatingPercent + rule.communityPercent + rule.goldPercent;
    if (total !== 100) {
      Alert.alert('Allocation must equal 100%', `Your three buckets currently add up to ${total}%.`);
      return;
    }
    try {
      usdtToAtomic(rule.minimumLiquidityUsdt);
      usdtToAtomic(rule.allocationThresholdUsdt);
      usdtToAtomic(rule.maxAllocationUsdt);
      await saveTreasuryRule({ ...rule, updatedAt: new Date().toISOString() });
      Alert.alert('Treasury rule saved', 'New verified receipts will be allocated with this local rule.');
    } catch {
      Alert.alert('Check amounts', 'Liquidity, threshold, and maximum must be valid USD₮ amounts.');
    }
  };

  const proposeAllocation = async () => {
    if (!rule.enabled) {
      Alert.alert('Treasury paused', 'Enable the rule before proposing an allocation.');
      return;
    }
    const threshold = BigInt(usdtToAtomic(rule.allocationThresholdUsdt));
    const maximum = BigInt(usdtToAtomic(rule.maxAllocationUsdt));
    const alreadyAllocated = allocations
      .filter((item) => item.status === 'submitted' || item.status === 'completed')
      .reduce((total, item) => total + BigInt(usdtToAtomic(item.sourceAmountUsdt)), 0n);
    const available = goldTarget > alreadyAllocated ? goldTarget - alreadyAllocated : 0n;
    if (available < threshold) {
      Alert.alert('Not ready yet', `Gold target is ${formatUsdtFromAtomic(available)} USD₮. Reach ${rule.allocationThresholdUsdt} USD₮ before batching a quote.`);
      return;
    }
    const source = available > maximum ? maximum : available;
    const now = new Date().toISOString();
    const allocation: TreasuryAllocation = {
      allocationId: `allocation-${Date.now()}`,
      status: 'blocked',
      sourceAmountUsdt: formatUsdtFromAtomic(source),
      contributingReceiptIds: attendees.map((item) => item.receiptId),
      reason: 'XAU₮ swaps require a configured Ethereum mainnet WDK route. Sepolia ticket funds are never swapped.',
      createdAt: now,
      updatedAt: now,
    };
    await saveTreasuryAllocation(allocation);
    await refresh();
    Alert.alert('Allocation prepared', 'The batch is saved locally. Switch the club wallet to its verified mainnet WDK configuration to request the real USD₮ → XAU₮ quote and approve it.');
  };

  return (
    <PitchScreen>
      <Text style={styles.heading}>TREASURY</Text>
      <Text style={styles.copy}>Your keys. Your rule. Your club’s matchday reserve.</Text>
      <View style={styles.summary}>
        <Text style={styles.summaryLabel}>VERIFIED GATE REVENUE</Text><Text style={styles.summaryValue}>{formatUsdtFromAtomic(receiptRevenue)} USD₮</Text>
        <Text style={styles.summaryLabel}>COMMUNITY PRICE SHIELD</Text><Text style={styles.summaryValue}>{formatUsdtFromAtomic(communityTarget)} USD₮</Text>
        <Text style={styles.summaryLabel}>XAU₮ RESERVE TARGET</Text><Text style={styles.summaryValue}>{formatUsdtFromAtomic(goldTarget)} USD₮</Text>
      </View>
      <View style={styles.ruleHeader}><Text style={styles.section}>TREASURY RULE</Text><Switch value={rule.enabled} onValueChange={(enabled) => setRule((current) => ({ ...current, enabled }))} trackColor={{ false: RenoPayBrand.muted, true: RenoPayBrand.accentGreen }} /></View>
      <Text style={styles.hint}>Allocate only independently verified ticket receipts. A club must approve every swap.</Text>
      <View style={styles.inputs}>
        {([['operatingPercent', 'OPERATING USD₮'], ['communityPercent', 'PRICE SHIELD USD₮'], ['goldPercent', 'XAU₮ TARGET']] as const).map(([key, label]) => <View key={key} style={styles.inputRow}><Text style={styles.inputLabel}>{label}</Text><TextInput value={String(rule[key])} onChangeText={(value) => setPercent(key, value)} keyboardType="number-pad" style={styles.input} /><Text style={styles.unit}>%</Text></View>)}
      </View>
      <NeoBrutalButton label="SAVE TREASURY RULE" onPress={() => void saveRule()} />
      <NeoBrutalButton label="PREPARE XAU₮ BATCH" onPress={() => void proposeAllocation()} style={styles.prepare} disabled={!ready} />
      {allocations[0] ? <Text style={styles.history}>LATEST: {allocations[0].status.toUpperCase()} · {allocations[0].sourceAmountUsdt} USD₮{allocations[0].reason ? `\n${allocations[0].reason}` : ''}</Text> : null}
    </PitchScreen>
  );
}

const styles = StyleSheet.create({
  heading: { color: RenoPayBrand.foreground, fontSize: 32, fontWeight: '900', letterSpacing: 1.2, textAlign: 'center' },
  copy: { color: RenoPayBrand.muted, textAlign: 'center', marginTop: 6, marginBottom: 18, fontSize: 14 },
  summary: { borderWidth: 3, borderColor: RenoPayBrand.border, borderRadius: 14, backgroundColor: RenoPayBrand.backgroundElevated, padding: 14, gap: 4, marginBottom: 18 },
  summaryLabel: { color: RenoPayBrand.muted, fontSize: 11, fontWeight: '900', letterSpacing: .7 }, summaryValue: { color: RenoPayBrand.primary, fontSize: 18, fontWeight: '900', marginBottom: 6 },
  ruleHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, section: { color: RenoPayBrand.foreground, fontWeight: '900', fontSize: 17, letterSpacing: 1 },
  hint: { color: RenoPayBrand.muted, fontSize: 12, lineHeight: 17, marginVertical: 8 }, inputs: { gap: 8, marginBottom: 14 }, inputRow: { flexDirection: 'row', alignItems: 'center', gap: 8 }, inputLabel: { color: RenoPayBrand.foreground, fontWeight: '800', fontSize: 12, flex: 1 }, input: { width: 62, borderWidth: 2, borderColor: RenoPayBrand.border, borderRadius: 8, color: RenoPayBrand.foreground, backgroundColor: RenoPayBrand.backgroundElevated, textAlign: 'center', paddingVertical: 7, fontWeight: '900' }, unit: { color: RenoPayBrand.primary, fontWeight: '900', width: 16 },
  prepare: { marginTop: 12, backgroundColor: RenoPayBrand.cream }, history: { color: RenoPayBrand.muted, fontSize: 12, lineHeight: 17, marginTop: 14 },
});
