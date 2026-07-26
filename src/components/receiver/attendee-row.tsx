import { StyleSheet, Text, View } from 'react-native';

import { shortAddress } from '@/features/tickets/payment-helpers';
import { RenoPayBrand } from '@/constants/renopay-brand';
import type { AttendeeRecord } from '@/features/tickets/ticket-types';

type AttendeeRowProps = {
  attendee: AttendeeRecord;
};

export function AttendeeRow({ attendee }: AttendeeRowProps) {
  const paidAt = new Date(attendee.paidAt).toLocaleString();

  return (
    <View style={styles.wrap}>
      <View style={styles.shadow} />
      <View style={styles.row}>
        <Text style={styles.title}>{shortAddress(attendee.senderAddress)}</Text>
        <Text style={styles.amount}>{attendee.amountUsdt} USDT</Text>
        <Text style={styles.meta}>Tx: {shortAddress(attendee.txHash)}</Text>
        <Text style={styles.meta}>Receipt: {attendee.receiptId}</Text>
        <Text style={styles.time}>{paidAt}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'relative', marginBottom: 10 },
  shadow: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: -3,
    top: 3,
    borderRadius: 10,
    backgroundColor: RenoPayBrand.border,
  },
  row: {
    borderWidth: 2,
    borderColor: RenoPayBrand.border,
    borderRadius: 10,
    backgroundColor: RenoPayBrand.backgroundElevated,
    padding: 12,
    gap: 2,
  },
  title: {
    color: RenoPayBrand.foreground,
    fontSize: 14,
    fontWeight: '900',
  },
  amount: {
    color: RenoPayBrand.primary,
    fontSize: 13,
    fontWeight: '800',
  },
  meta: {
    color: RenoPayBrand.muted,
    fontSize: 11,
    fontFamily: 'monospace',
  },
  time: {
    color: RenoPayBrand.muted,
    fontSize: 11,
    marginTop: 2,
  },
});
