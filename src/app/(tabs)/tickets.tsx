import { useState } from 'react';
import { Alert, Modal, Pressable, Share, StyleSheet, Text, View } from 'react-native';

import { PitchScreen } from '@/components/layout/pitch-screen';
import { QrCodeView } from '@/components/tickets/qr-code-view';
import { TicketCard } from '@/components/tickets/ticket-card';
import { RenoPayInlineLoader } from '@/components/ui/renopay-inline-loader';
import { RenoPayBrand } from '@/constants/renopay-brand';
import { shortAddress } from '@/features/tickets/payment-helpers';
import type { TicketRecord } from '@/features/tickets/ticket-types';
import { useTickets } from '@/features/tickets/tickets-context';

function shareEntryPass(ticket: TicketRecord) {
  const lines = [
    `Reno Pay Entry Pass — ${ticket.eventName}`,
    `${ticket.homeTeam} vs ${ticket.awayTeam}`,
    `${ticket.venue} · Gate ${ticket.gate} · ${ticket.seatLabel}`,
    `Verified payment: ${ticket.txHash ? shortAddress(ticket.txHash) : 'local receipt'}`,
    'Open the Reno Pay pass QR with the ticket holder at the gate. One ticket admits one person.',
  ].filter(Boolean);

  Share.share({ message: lines.join('\n') }).catch(() => undefined);
}

export default function TicketsScreen() {
  const { tickets, loading } = useTickets();
  const [verificationQr, setVerificationQr] = useState<string | null>(null);
  const received = tickets.filter((ticket) => ticket.kind === 'received');

  return (
    <PitchScreen>
      <Text style={styles.heading}>TICKETS</Text>

      <Text style={styles.subheading}>MY ENTRY PASSES</Text>

      {loading ? (
        <RenoPayInlineLoader label="LOADING TICKETS" height={120} />
      ) : received.length === 0 ? (
        <Text style={styles.empty}>No received tickets yet.</Text>
      ) : (
        received.map((ticket) => (
          <TicketCard
            key={ticket.ticketId}
            ticket={ticket}
            onQrPress={ticket.ticketQrPayload ? () => setVerificationQr(ticket.ticketQrPayload!) : undefined}
            onPress={() => {
              const actions = [
                ticket.ticketQrPayload
                  ? {
                      text: 'Show verification QR',
                      onPress: () => setVerificationQr(ticket.ticketQrPayload!),
                    }
                  : null,
                ticket.kind === 'received'
                  ? { text: 'Share entry pass', onPress: () => shareEntryPass(ticket) }
                  : null,
                { text: 'Close', style: 'cancel' as const },
              ].filter(Boolean) as { text: string; onPress?: () => void; style?: 'cancel' }[];

              Alert.alert(
                ticket.eventName,
                [
                  `${ticket.homeTeam} vs ${ticket.awayTeam}`,
                  `Status: ${ticket.status}`,
                  ticket.txHash ? `Tx: ${shortAddress(ticket.txHash)}` : null,
                  ticket.receiptId ? `Receipt: ${ticket.receiptId}` : null,
                ]
                  .filter(Boolean)
                  .join('\n'),
                actions,
              );
            }}
          />
        ))
      )}

      <Modal
        visible={verificationQr !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setVerificationQr(null)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setVerificationQr(null)}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>VERIFICATION QR</Text>
            <Text style={styles.modalHint}>Show this at the gate for future scan-to-verify.</Text>
            {verificationQr ? <QrCodeView value={verificationQr} size={240} /> : null}
          </View>
        </Pressable>
      </Modal>
    </PitchScreen>
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
    marginBottom: 18,
  },
  subheading: { color: RenoPayBrand.primary, fontSize: 14, fontWeight: '900', letterSpacing: 1, marginBottom: 16, textAlign: 'center' },
  empty: {
    color: RenoPayBrand.muted,
    textAlign: 'center',
    fontSize: 15,
    marginTop: 20,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: {
    borderWidth: 3,
    borderColor: RenoPayBrand.border,
    borderRadius: 16,
    backgroundColor: RenoPayBrand.backgroundElevated,
    padding: 20,
    alignItems: 'center',
    gap: 12,
    maxWidth: 320,
  },
  modalTitle: {
    color: RenoPayBrand.primary,
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 1,
  },
  modalHint: {
    color: RenoPayBrand.muted,
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
  },
});
