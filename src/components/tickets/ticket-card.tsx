import { MaterialCommunityIcons } from '@expo/vector-icons';
import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { QrCodeView } from '@/components/tickets/qr-code-view';
import { RenoPayBrand } from '@/constants/renopay-brand';
import { formatMatchWindow, shortAddress } from '@/features/tickets/payment-helpers';
import type { TicketRecord } from '@/features/tickets/ticket-types';

type TicketCardProps = {
  ticket: TicketRecord;
  onPress?: () => void;
  onQrPress?: () => void;
};

function statusBadge(ticket: TicketRecord): { label: string; color: string } {
  if (ticket.gateDisposition === 'expired') {
    return { label: 'EXPIRED', color: RenoPayBrand.muted };
  }
  switch (ticket.status) {
    case 'draft':
      return { label: 'DRAFT', color: RenoPayBrand.muted };
    case 'awaiting_payment':
      return { label: 'PENDING', color: RenoPayBrand.primary };
    case 'paid':
      return { label: 'PAID', color: RenoPayBrand.primary };
    case 'transferred':
      return { label: 'VALID', color: RenoPayBrand.accentGreen };
    case 'checked_in':
      return {
        label: ticket.gateDisposition === 'admitted' ? 'VERIFIED' : 'USED',
        color: RenoPayBrand.muted,
      };
    default: {
      const _exhaustive: never = ticket.status;
      return { label: _exhaustive, color: RenoPayBrand.muted };
    }
  }
}

export const TicketCard = memo(function TicketCard({ ticket, onPress, onQrPress }: TicketCardProps) {
  const badge = statusBadge(ticket);
  const qrDisabled = !onQrPress || ticket.gateDisposition !== undefined || ticket.status === 'checked_in';

  const body = (
    <View style={styles.wrap}>
      <View style={styles.shadow} />
      <View style={styles.card}>
        <View style={styles.info}>
          <Text style={styles.eventLabel}>
            Event: <Text style={styles.eventValue}>{ticket.eventName}</Text>
          </Text>
          <Text style={styles.metaLabel}>
            Teams:{' '}
            <Text style={styles.metaValue}>
              {ticket.homeTeam} vs {ticket.awayTeam}
            </Text>
          </Text>
          <Text style={styles.metaLabel}>
            When: <Text style={styles.metaValue}>{formatMatchWindow(ticket.startAt, ticket.endAt)}</Text>
          </Text>
          <Text style={styles.metaLabel}>
            Seat:{' '}
            <Text style={styles.metaValue}>
              {ticket.venue}, Gate {ticket.gate}, {ticket.seatLabel}
            </Text>
          </Text>
          <Text style={styles.metaLabel}>
            Price: <Text style={styles.metaValue}>{ticket.priceUsdt} USDT</Text>
          </Text>
          {ticket.txHash ? (
            <Text style={styles.metaLabel}>
              Tx: <Text style={styles.metaValue}>{shortAddress(ticket.txHash)}</Text>
            </Text>
          ) : null}
          <View style={[styles.validBadge, { backgroundColor: badge.color }]}>
            <MaterialCommunityIcons name="check-circle" size={18} color={RenoPayBrand.foreground} />
            <Text style={styles.badgeText}>{badge.label}</Text>
          </View>
        </View>

        <View style={styles.stubDivider}>
          <View style={styles.notchTop} />
          <View style={styles.dashedLine} />
          <View style={styles.notchBottom} />
        </View>

        <Pressable
          accessibilityRole={onQrPress && !qrDisabled ? 'button' : undefined}
          accessibilityLabel={onQrPress && !qrDisabled ? 'Expand ticket QR' : undefined}
          disabled={qrDisabled}
          onPress={qrDisabled ? undefined : onQrPress}
          style={styles.qrSlot}>
          {ticket.ticketQrPayload && !qrDisabled ? (
            <QrCodeView value={ticket.ticketQrPayload} size={88} errorCorrectionLevel="L" />
          ) : (
            <MaterialCommunityIcons name="qrcode" size={64} color={RenoPayBrand.border} />
          )}
        </Pressable>
      </View>
    </View>
  );

  if (!onPress) {
    return body;
  }

  return (
    <Pressable accessibilityRole="button" onPress={onPress}>
      {body}
    </Pressable>
  );
});

const styles = StyleSheet.create({
  wrap: {
    position: 'relative',
    marginBottom: 16,
  },
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
    flexDirection: 'row',
    backgroundColor: RenoPayBrand.cream,
    borderWidth: 3,
    borderColor: RenoPayBrand.border,
    borderRadius: 14,
    overflow: 'hidden',
    minHeight: 148,
  },
  info: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 14,
    gap: 4,
  },
  eventLabel: {
    color: RenoPayBrand.border,
    fontSize: 13,
    fontWeight: '500',
  },
  eventValue: {
    fontWeight: '900',
  },
  metaLabel: {
    color: RenoPayBrand.border,
    fontSize: 11,
    fontWeight: '500',
  },
  metaValue: {
    fontWeight: '800',
  },
  validBadge: {
    position: 'absolute',
    right: 8,
    bottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 2,
    borderColor: RenoPayBrand.border,
  },
  badgeText: {
    color: RenoPayBrand.foreground,
    fontSize: 10,
    fontWeight: '900',
  },
  stubDivider: {
    width: 18,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  dashedLine: {
    flex: 1,
    width: 2,
    borderLeftWidth: 2,
    borderStyle: 'dashed',
    borderColor: RenoPayBrand.border,
    opacity: 0.45,
  },
  notchTop: {
    position: 'absolute',
    top: -8,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: RenoPayBrand.background,
    borderWidth: 2,
    borderColor: RenoPayBrand.border,
  },
  notchBottom: {
    position: 'absolute',
    bottom: -8,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: RenoPayBrand.background,
    borderWidth: 2,
    borderColor: RenoPayBrand.border,
  },
  qrSlot: {
    width: 108,
    alignItems: 'center',
    justifyContent: 'center',
    paddingRight: 8,
  },
});
