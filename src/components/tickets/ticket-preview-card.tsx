import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { QrCodeView } from '@/components/tickets/qr-code-view';

import { RenoPayBrand } from '@/constants/renopay-brand';
import { formatMatchWindow } from '@/features/tickets/payment-helpers';
import type { TicketRecord } from '@/features/tickets/ticket-types';

type TicketPreviewCardProps = {
  ticket: TicketRecord;
  qrValue?: string;
  compact?: boolean;
  onQrPress?: () => void;
};

export function TicketPreviewCard({ ticket, qrValue, compact, onQrPress }: TicketPreviewCardProps) {
  return (
    <View style={styles.wrap}>
      <View style={styles.shadow} />
      <View style={[styles.card, compact ? styles.cardCompact : null]}>
        {ticket.imageUri ? (
          <Image
            source={{ uri: ticket.imageUri }}
            style={styles.cover}
            contentFit="cover"
            cachePolicy="memory-disk"
          />
        ) : null}
        <View style={styles.header}>
          <Text style={styles.event}>{ticket.eventName}</Text>
          <Text style={styles.teams}>
            {ticket.homeTeam} vs {ticket.awayTeam}
          </Text>
        </View>
        <Text style={styles.meta}>{formatMatchWindow(ticket.startAt, ticket.endAt)}</Text>
        <Text style={styles.meta}>
          {ticket.venue} · Gate {ticket.gate} · {ticket.seatLabel}
        </Text>
        <View style={styles.priceRow}>
          <Text style={styles.price}>{ticket.priceUsdt} USDT</Text>
        </View>
        {ticket.remainingQuantity > 0 ? (
          <Text style={styles.stock}>{ticket.remainingQuantity} tickets left</Text>
        ) : null}
        {qrValue ? (
          <Pressable
            accessibilityRole="button"
            disabled={!onQrPress}
            onPress={onQrPress}
            style={styles.qrWrap}>
            <QrCodeView value={qrValue} size={compact ? 120 : 160} />
            {onQrPress ? <Text style={styles.qrHint}>Tap to enlarge</Text> : null}
          </Pressable>
        ) : null}
        {ticket.checkInCode ? (
          <Text style={styles.checkIn}>Check-in: {ticket.checkInCode}</Text>
        ) : null}
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
    borderRadius: 14,
    backgroundColor: RenoPayBrand.border,
  },
  card: {
    borderWidth: 3,
    borderColor: RenoPayBrand.border,
    borderRadius: 14,
    backgroundColor: RenoPayBrand.cream,
    padding: 16,
    gap: 6,
    overflow: 'hidden',
  },
  cardCompact: { padding: 12 },
  cover: {
    width: '100%',
    height: 120,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: RenoPayBrand.border,
    marginBottom: 4,
  },
  header: { gap: 2 },
  event: {
    color: RenoPayBrand.border,
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  teams: {
    color: RenoPayBrand.border,
    fontSize: 14,
    fontWeight: '700',
  },
  meta: {
    color: RenoPayBrand.border,
    fontSize: 13,
    opacity: 0.85,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  price: {
    color: RenoPayBrand.border,
    fontSize: 20,
    fontWeight: '900',
  },
  stock: {
    color: RenoPayBrand.border,
    fontSize: 12,
    fontWeight: '700',
  },
  qrWrap: { alignItems: 'center', marginTop: 10, gap: 4 },
  qrHint: {
    color: RenoPayBrand.border,
    fontSize: 11,
    fontWeight: '700',
    opacity: 0.7,
  },
  checkIn: {
    color: RenoPayBrand.border,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
    marginTop: 4,
  },
});
