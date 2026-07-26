import { StyleSheet, Text, View } from 'react-native';
import { QrCodeView } from '@/components/tickets/qr-code-view';

import { TicketPreviewCard } from '@/components/tickets/ticket-preview-card';
import { RenoPayBrand } from '@/constants/renopay-brand';
import type { TicketRecord } from '@/features/tickets/ticket-types';

type ReceiverSessionCardProps = {
  ticket: TicketRecord;
  qrPayload: string;
  sessionId: string;
};

export function ReceiverSessionCard({
  ticket,
  qrPayload,
  sessionId,
}: ReceiverSessionCardProps) {
  return (
    <View style={styles.wrap}>
      <View style={styles.shadow} />
      <View style={styles.card}>
        <Text style={styles.heading}>SCAN TO PAY</Text>
        <Text style={styles.status}>Watching Sepolia for USDT payment…</Text>
        <View style={styles.qrFrame}>
          <QrCodeView value={qrPayload} size={320} />
        </View>
        <TicketPreviewCard ticket={ticket} compact />
        <Text style={styles.session}>Session {sessionId.slice(0, 12)}...</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'relative', marginBottom: 16 },
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
    alignItems: 'center',
    gap: 10,
  },
  heading: {
    color: RenoPayBrand.primary,
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 1.2,
  },
  status: {
    color: RenoPayBrand.muted,
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },
  qrFrame: {
    borderWidth: 3,
    borderColor: RenoPayBrand.border,
    borderRadius: 12,
    padding: 12,
    backgroundColor: RenoPayBrand.cream,
  },
  session: {
    color: RenoPayBrand.muted,
    fontSize: 11,
    fontFamily: 'monospace',
  },
});
