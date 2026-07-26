import { StyleSheet, Text, View } from 'react-native';

import { RenoPayDotsLoader } from '@/components/ui/renopay-dots-loader';
import { NeoBrutalButton } from '@/components/ui/neo-brutal-button';
import { formatMatchWindow, shortAddress } from '@/features/tickets/payment-helpers';
import type { QrPayload } from '@/features/tickets/qr-payload';
import { RenoPayBrand } from '@/constants/renopay-brand';

type PaymentConfirmCardProps = {
  payload: QrPayload;
  walletReady?: boolean;
  loading?: boolean;
  payStageLabel?: string | null;
  onPay: () => void;
  onCancel: () => void;
};

export function PaymentConfirmCard({
  payload,
  walletReady = true,
  loading,
  payStageLabel,
  onPay,
  onCancel,
}: PaymentConfirmCardProps) {
  const canPay = walletReady && !loading;
  const payeeLabel = payload.eventName;

  return (
    <View style={styles.wrap}>
      <View style={styles.shadow} />
      <View style={styles.card}>
        <Text style={styles.heading}>CONFIRM PAYMENT</Text>
        <Text style={styles.payee}>{payeeLabel}</Text>
        <Text style={styles.teams}>
          {payload.homeTeam} vs {payload.awayTeam}
        </Text>
        <Text style={styles.meta}>{formatMatchWindow(payload.startAt, payload.endAt)}</Text>
        <Text style={styles.meta}>
          {payload.venue} · Gate {payload.gate} · {payload.seatLabel}
        </Text>
        <Text style={styles.meta}>Pay to {shortAddress(payload.receiverAddress)}</Text>
        <View style={styles.priceBox}>
          <Text style={styles.price}>{payload.priceUsdt}</Text>
          <Text style={styles.currency}>USDT · TETHER WALLET</Text>
        </View>
        <Text style={styles.gateway}>
          Ticket unlocks locally after on-chain USDT payment.
        </Text>
        <NeoBrutalButton label="PAY & UNLOCK TICKET" disabled={!canPay} onPress={onPay} />
        {loading ? (
          <View style={styles.payLoader}>
            <RenoPayDotsLoader
              size="sm"
              label={payStageLabel ?? 'SENDING PAYMENT'}
            />
          </View>
        ) : null}
        <NeoBrutalButton label="CANCEL" variant="secondary" onPress={onCancel} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'relative', marginTop: 12 },
  shadow: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: -5,
    top: 5,
    borderRadius: 16,
    backgroundColor: RenoPayBrand.border,
  },
  card: {
    borderWidth: 3,
    borderColor: RenoPayBrand.border,
    borderRadius: 16,
    backgroundColor: RenoPayBrand.backgroundElevated,
    padding: 16,
    gap: 8,
  },
  heading: {
    color: RenoPayBrand.primary,
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 1,
    textAlign: 'center',
  },
  payee: {
    color: RenoPayBrand.foreground,
    fontSize: 18,
    fontWeight: '900',
    textAlign: 'center',
  },
  teams: {
    color: RenoPayBrand.foreground,
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
  },
  meta: {
    color: RenoPayBrand.muted,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
  priceBox: {
    borderWidth: 2,
    borderColor: RenoPayBrand.border,
    borderRadius: 12,
    backgroundColor: RenoPayBrand.cream,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 4,
  },
  price: {
    color: RenoPayBrand.border,
    fontSize: 32,
    fontWeight: '900',
  },
  currency: {
    color: RenoPayBrand.border,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.8,
    opacity: 0.8,
  },
  gateway: {
    color: RenoPayBrand.muted,
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 17,
  },
  payLoader: {
    alignItems: 'center',
    paddingVertical: 4,
  },
});
