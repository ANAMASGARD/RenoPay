import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { memo, useCallback, useMemo } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { RenoPayBrand } from '@/constants/renopay-brand';
import type { TicketRecord } from '@/features/tickets/ticket-types';

type TicketOfferListProps = {
  tickets: TicketRecord[];
  onView: (ticketId: string) => void;
  onReceivePayment: (ticket: TicketRecord) => void;
};

function statusLabel(status: TicketRecord['status']): string {
  switch (status) {
    case 'draft':
      return 'DRAFT';
    case 'awaiting_payment':
      return 'AWAITING PAYMENT';
    case 'paid':
      return 'PAID';
    case 'transferred':
      return 'TRANSFERRED';
    case 'checked_in':
      return 'CHECKED IN';
    default: {
      const _exhaustive: never = status;
      return _exhaustive;
    }
  }
}

type TicketOfferRowProps = {
  ticket: TicketRecord;
  onView: (ticketId: string) => void;
  onReceivePayment: (ticket: TicketRecord) => void;
};

const TicketOfferRow = memo(function TicketOfferRow({
  ticket,
  onView,
  onReceivePayment,
}: TicketOfferRowProps) {
  return (
    <View style={styles.row}>
      <View style={styles.rowShadow} />
      <View style={styles.rowBody}>
        <View style={styles.topRow}>
          {ticket.imageUri ? (
            <Image
              source={{ uri: ticket.imageUri }}
              style={styles.thumb}
              contentFit="cover"
              cachePolicy="memory-disk"
              recyclingKey={ticket.ticketId}
            />
          ) : (
            <View style={styles.thumbPlaceholder}>
              <MaterialCommunityIcons name="ticket" size={24} color={RenoPayBrand.muted} />
            </View>
          )}
          <View style={styles.info}>
            <Text style={styles.title}>{ticket.eventName}</Text>
            <Text style={styles.sub}>
              {ticket.homeTeam} vs {ticket.awayTeam}
            </Text>
            <View style={styles.metaRow}>
              <Text style={styles.price}>{ticket.priceUsdt} USDT</Text>
              <Text style={styles.status}>{statusLabel(ticket.status)}</Text>
            </View>
          </View>
        </View>
        <View style={styles.actions}>
          <Pressable
            accessibilityRole="button"
            onPress={() => onView(ticket.ticketId)}
            style={styles.actionBtn}>
            <Text style={styles.actionText}>VIEW</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={() => onReceivePayment(ticket)}
            style={[styles.actionBtn, styles.actionPrimary]}>
            <Text style={[styles.actionText, styles.actionTextPrimary]}>RECEIVE PAYMENT</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
});

export const TicketOfferList = memo(function TicketOfferList({
  tickets,
  onView,
  onReceivePayment,
}: TicketOfferListProps) {
  const issued = useMemo(
    () => tickets.filter((ticket) => ticket.kind === 'issued'),
    [tickets],
  );

  const renderItem = useCallback(
    ({ item }: { item: TicketRecord }) => (
      <TicketOfferRow ticket={item} onView={onView} onReceivePayment={onReceivePayment} />
    ),
    [onReceivePayment, onView],
  );

  if (issued.length === 0) {
    return (
      <Text style={styles.empty}>No tickets yet. Create one to start receiving payments.</Text>
    );
  }

  return (
    <FlatList
      data={issued}
      keyExtractor={(item) => item.ticketId}
      renderItem={renderItem}
      scrollEnabled={false}
      removeClippedSubviews
      initialNumToRender={6}
      windowSize={5}
      contentContainerStyle={styles.wrap}
    />
  );
});

const styles = StyleSheet.create({
  wrap: { gap: 12 },
  empty: {
    color: RenoPayBrand.muted,
    textAlign: 'center',
    fontSize: 14,
    marginVertical: 12,
  },
  row: { position: 'relative' },
  rowShadow: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: -4,
    top: 4,
    borderRadius: 12,
    backgroundColor: RenoPayBrand.border,
  },
  rowBody: {
    borderWidth: 3,
    borderColor: RenoPayBrand.border,
    borderRadius: 12,
    backgroundColor: RenoPayBrand.backgroundElevated,
    padding: 14,
    gap: 10,
  },
  topRow: { flexDirection: 'row', gap: 12 },
  thumb: {
    width: 56,
    height: 56,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: RenoPayBrand.border,
  },
  thumbPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: RenoPayBrand.border,
    backgroundColor: RenoPayBrand.pitchLine,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: { flex: 1, gap: 4 },
  title: {
    color: RenoPayBrand.foreground,
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 0.6,
  },
  sub: { color: RenoPayBrand.muted, fontSize: 13 },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  price: { color: RenoPayBrand.primary, fontSize: 14, fontWeight: '900' },
  status: { color: RenoPayBrand.muted, fontSize: 11, fontWeight: '800' },
  actions: { flexDirection: 'row', gap: 8 },
  actionBtn: {
    flex: 1,
    borderWidth: 2,
    borderColor: RenoPayBrand.border,
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
    backgroundColor: RenoPayBrand.background,
  },
  actionPrimary: {
    backgroundColor: RenoPayBrand.primary,
  },
  actionText: {
    color: RenoPayBrand.foreground,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.6,
  },
  actionTextPrimary: {
    color: RenoPayBrand.border,
  },
});
