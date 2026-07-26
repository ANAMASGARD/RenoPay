import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useIsFocused } from '@react-navigation/native';
import { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { PitchScreen } from '@/components/layout/pitch-screen';
import { PaymentConfirmCard } from '@/components/pay/payment-confirm-card';
import { QrScanner } from '@/components/pay/qr-scanner';
import { QrCodeView } from '@/components/tickets/qr-code-view';
import { RenoPayLoadingOverlay } from '@/components/ui/renopay-loading-overlay';
import { WalletConnectButton } from '@/components/wallet/wallet-connect-button';
import { RenoPayBrand } from '@/constants/renopay-brand';
import { useAccount, useWdkApp } from '@/features/wdk/wdk-hooks';
import { buyMatchTickets, type EvmAccountExtension } from '@/features/matches/registry';
import { mintReceivedTicketFromMatch } from '@/features/tickets/ticket-storage';
import { useTickets } from '@/features/tickets/tickets-context';
import { usePaySwipeLock } from '@/hooks/use-pay-swipe-lock';
import { usePaymentFlow } from '@/hooks/use-payment-flow';

type MatchCheckout = { saleAddress: string; matchId: string; eventName: string; homeTeam: string; awayTeam: string; venue: string; priceUsdt: string; capacity: number; remaining: number; startAt: string; clubAddress: string };
function asParam(value: string | string[] | undefined): string { return Array.isArray(value) ? value[0] ?? '' : value ?? ''; }

export default function PayScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<Record<string, string | string[]>>();
  const isFocused = useIsFocused();
  const { setLocked } = usePaySwipeLock();
  const { state } = useWdkApp();
  const account = useAccount({ network: 'ethereum', accountIndex: 0 }) as unknown as ReturnType<typeof useAccount> & { extension: <T extends object>() => T };
  const { address } = account;
  const tickets = useTickets();
  const walletReady = state.status === 'READY' && !!address;
  const [scanKey, setScanKey] = useState(0);
  const [checkoutBusy, setCheckoutBusy] = useState(false);

  const checkout = useMemo<MatchCheckout | null>(() => {
    const saleAddress = asParam(params.saleAddress);
    if (!saleAddress) return null;
    return {
      saleAddress,
      matchId: asParam(params.matchId),
      eventName: asParam(params.eventName),
      homeTeam: asParam(params.homeTeam),
      awayTeam: asParam(params.awayTeam),
      venue: asParam(params.venue),
      priceUsdt: asParam(params.priceUsdt),
      capacity: Number(asParam(params.capacity)),
      remaining: Number(asParam(params.remaining)),
      startAt: asParam(params.startAt),
      clubAddress: asParam(params.clubAddress),
    };
  }, [params]);

  const completeMatchPurchase = async () => {
    if (!checkout || !walletReady || !address) return;
    setCheckoutBusy(true);
    try {
      const result = await buyMatchTickets(account.extension<EvmAccountExtension>(), checkout.saleAddress, checkout.priceUsdt, 1);
      await mintReceivedTicketFromMatch({
        match: { matchId: checkout.matchId, saleAddress: checkout.saleAddress, clubAddress: checkout.clubAddress, eventName: checkout.eventName, homeTeam: checkout.homeTeam, awayTeam: checkout.awayTeam, venue: checkout.venue, location: { latitude: 0, longitude: 0 }, startAt: checkout.startAt, priceUsdt: checkout.priceUsdt, priceAtomic: '0', capacity: checkout.capacity },
        quantity: 1,
        senderAddress: address,
        txHash: result.hash,
      });
      await tickets.refresh();
      Alert.alert('Ticket purchased', 'Your verified entry QR is now in Tickets.', [
        { text: 'VIEW TICKET', onPress: () => router.replace('/tickets') },
        { text: 'STAY HERE', style: 'cancel' },
      ]);
    } catch (error) {
      Alert.alert('Purchase failed', error instanceof Error ? error.message : 'Unable to buy this ticket.');
    } finally {
      setCheckoutBusy(false);
    }
  };

  const confirmMatchPurchase = () => {
    Alert.alert('Confirm ticket purchase', `${checkout?.eventName}\n${checkout?.priceUsdt} test USDT\n\nBuy one entry pass now?`, [
      { text: 'NO', style: 'cancel' },
      { text: 'YES, BUY 1', onPress: () => void completeMatchPurchase() },
    ]);
  };

  const {
    step,
    setStep,
    payload,
    paying,
    payStageLabel,
    joining,
    handleScanResult,
    handlePay,
    cancelConfirm,
  } = usePaymentFlow(walletReady);

  useEffect(() => {
    setLocked(step !== 'idle');
  }, [setLocked, step]);

  useEffect(() => {
    if (!isFocused && step === 'scanning') {
      setStep('idle');
    }
  }, [isFocused, setStep, step]);

  if (step === 'scanning' && isFocused) {
    return (
      <View style={styles.scannerRoot}>
        <QrScanner
          key={scanKey}
          onScan={(data) => {
            void handleScanResult(data).then((ok) => {
              if (!ok) {
                setScanKey((value) => value + 1);
              }
            });
          }}
          onClose={() => setStep('idle')}
        />
        <RenoPayLoadingOverlay visible={joining} label="READING QR" />
      </View>
    );
  }

  return (
    <PitchScreen>
      <Text style={styles.heading}>PAY</Text>

      {!walletReady ? <WalletConnectButton /> : null}

      {step === 'confirm' && payload ? (
        <PaymentConfirmCard
          payload={payload}
          walletReady={walletReady}
          loading={paying}
          payStageLabel={payStageLabel}
          onPay={handlePay}
          onCancel={cancelConfirm}
        />
      ) : checkout ? (
        <MatchCheckoutCard checkout={checkout} walletReady={walletReady} loading={checkoutBusy} onBuy={confirmMatchPurchase} onCancel={() => router.replace('/(tabs)/map' as never)} />
      ) : (
        <Pressable
          accessibilityRole="button"
          disabled={!walletReady}
          onPress={() => setStep('scanning')}
          style={[styles.scannerCard, !walletReady ? styles.scannerDisabled : null]}>
          <View style={styles.scannerShadow} />
          <View style={styles.scannerBody}>
            <MaterialCommunityIcons name="qrcode-scan" size={72} color={RenoPayBrand.border} />
            <Text style={styles.scannerTitle}>SCAN QR CODE</Text>
            <Text style={styles.scannerCopy}>
              {walletReady
                ? 'Scan a gate payment QR, pay with Tether Wallet, ticket saves locally.'
                : 'Connect your wallet to scan and pay.'}
            </Text>
          </View>
        </Pressable>
      )}
    </PitchScreen>
  );
}

function MatchCheckoutCard({ checkout, walletReady, loading, onBuy, onCancel }: { checkout: MatchCheckout; walletReady: boolean; loading: boolean; onBuy: () => void; onCancel: () => void }) {
  const qr = JSON.stringify({ v: 1, kind: 'renopay-match-checkout', matchId: checkout.matchId, saleAddress: checkout.saleAddress, eventName: checkout.eventName, priceUsdt: checkout.priceUsdt });
  return (
    <View style={styles.checkoutWrap}>
      <View style={styles.checkoutShadow} />
      <View style={styles.checkoutCard}>
        <Text style={styles.checkoutEyebrow}>MAP CHECKOUT</Text>
        <Text style={styles.checkoutTitle}>{checkout.eventName}</Text>
        <Text style={styles.checkoutCopy}>{checkout.homeTeam} vs {checkout.awayTeam}</Text>
        <Text style={styles.checkoutCopy}>{checkout.venue}</Text>
        <Text style={styles.checkoutCopy}>KICKOFF: {new Date(checkout.startAt).toLocaleString()}</Text>
        <Text style={styles.checkoutPrice}>{checkout.priceUsdt} USDT · {checkout.remaining} SEATS LEFT</Text>
        <View style={styles.checkoutQr}><QrCodeView value={qr} size={150} /></View>
        <Text style={styles.checkoutHint}>Confirm once. WDK settles the ticket on Sepolia and saves the entry proof locally.</Text>
        <View style={styles.checkoutActions}>
          <Pressable accessibilityRole="button" disabled={!walletReady || loading} onPress={onBuy} style={[styles.checkoutBuy, (!walletReady || loading) && styles.disabled]}><Text style={styles.checkoutButtonText}>{loading ? 'PAYING…' : 'YES, BUY 1'}</Text></Pressable>
          <Pressable accessibilityRole="button" disabled={loading} onPress={onCancel} style={styles.checkoutCancel}><Text style={styles.checkoutCancelText}>NO</Text></Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  heading: {
    color: RenoPayBrand.foreground,
    fontSize: 42,
    fontWeight: '900',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    textAlign: 'center',
    marginBottom: 16,
  },
  scannerRoot: { flex: 1, backgroundColor: RenoPayBrand.background },
  scannerCard: {
    position: 'relative',
    marginTop: 12,
  },
  scannerDisabled: { opacity: 0.55 },
  scannerShadow: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: -5,
    top: 5,
    borderRadius: 16,
    backgroundColor: RenoPayBrand.border,
  },
  scannerBody: {
    borderWidth: 3,
    borderColor: RenoPayBrand.border,
    borderRadius: 16,
    backgroundColor: RenoPayBrand.cream,
    paddingVertical: 36,
    paddingHorizontal: 20,
    alignItems: 'center',
    gap: 12,
  },
  scannerTitle: {
    color: RenoPayBrand.border,
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 1,
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  scannerCopy: {
    color: RenoPayBrand.border,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    opacity: 0.85,
  },
  checkoutWrap: { position: 'relative', marginTop: 8 },
  checkoutShadow: { position: 'absolute', left: 0, right: 0, bottom: -5, top: 5, borderRadius: 16, backgroundColor: RenoPayBrand.border },
  checkoutCard: { borderWidth: 3, borderColor: RenoPayBrand.border, borderRadius: 16, backgroundColor: RenoPayBrand.backgroundElevated, padding: 16, alignItems: 'center', gap: 6 },
  checkoutEyebrow: { color: RenoPayBrand.primary, fontSize: 12, fontWeight: '900', letterSpacing: 1.2 },
  checkoutTitle: { color: RenoPayBrand.foreground, fontSize: 22, fontWeight: '900', textAlign: 'center' },
  checkoutCopy: { color: RenoPayBrand.muted, fontSize: 13, fontWeight: '700', textAlign: 'center' },
  checkoutPrice: { color: RenoPayBrand.primary, fontSize: 15, fontWeight: '900', marginTop: 4 },
  checkoutQr: { marginVertical: 10, padding: 10, borderRadius: 10, backgroundColor: RenoPayBrand.cream },
  checkoutHint: { color: RenoPayBrand.muted, fontSize: 12, lineHeight: 17, textAlign: 'center' },
  checkoutActions: { flexDirection: 'row', gap: 10, marginTop: 10 },
  checkoutBuy: { borderWidth: 3, borderColor: RenoPayBrand.border, borderRadius: 10, backgroundColor: RenoPayBrand.primary, paddingHorizontal: 14, paddingVertical: 11 },
  checkoutCancel: { borderWidth: 3, borderColor: RenoPayBrand.border, borderRadius: 10, backgroundColor: RenoPayBrand.cream, paddingHorizontal: 18, paddingVertical: 11 },
  checkoutButtonText: { color: RenoPayBrand.border, fontSize: 12, fontWeight: '900' },
  checkoutCancelText: { color: RenoPayBrand.border, fontSize: 12, fontWeight: '900' },
  disabled: { opacity: 0.5 },
});
