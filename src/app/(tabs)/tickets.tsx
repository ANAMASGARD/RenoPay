import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, Modal, Pressable, Share, StyleSheet, Text, useWindowDimensions } from 'react-native';

import { PitchScreen } from '@/components/layout/pitch-screen';
import { QrCodeView } from '@/components/tickets/qr-code-view';
import { TicketCard } from '@/components/tickets/ticket-card';
import { RenoPayInlineLoader } from '@/components/ui/renopay-inline-loader';
import { RenoPayBrand } from '@/constants/renopay-brand';
import { resolveTicketLocation } from '@/features/matches/match-storage';
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
  const router = useRouter();
  const { width: windowWidth } = useWindowDimensions();
  const { tickets, loading } = useTickets();
  const [verificationTicket, setVerificationTicket] = useState<TicketRecord | null>(null);
  const received = tickets.filter((ticket) => ticket.kind === 'received');
  const verificationQrSize = useMemo(
    () => Math.min(Math.max(windowWidth - 56, 280), 340),
    [windowWidth],
  );

  const openTicketOnMap = (ticket: TicketRecord) => {
    const location = resolveTicketLocation(ticket);
    if (!location) {
      Alert.alert('Map unavailable', 'No map pin for this ticket yet. Try again after the match location syncs.');
      return;
    }
    router.push({
      pathname: '/(tabs)/map',
      params: {
        focusMatchId: ticket.matchId ?? ticket.ticketId,
        latitude: String(location.latitude),
        longitude: String(location.longitude),
        eventName: ticket.eventName,
      },
    } as never);
  };

  const openVerificationQr = (ticket: TicketRecord) => {
    if (!ticket.ticketQrPayload) {
      Alert.alert('No verification QR', 'This ticket has no gate proof QR. Re-buy or re-pay to mint one.');
      return;
    }
    setVerificationTicket(ticket);
  };

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
            onQrPress={ticket.ticketQrPayload ? () => openVerificationQr(ticket) : undefined}
            onPress={() => {
              const location = resolveTicketLocation(ticket);
              const actions = [
                location
                  ? { text: 'View on map', onPress: () => openTicketOnMap(ticket) }
                  : null,
                ticket.ticketQrPayload
                  ? {
                      text: 'Show verification QR',
                      onPress: () => openVerificationQr(ticket),
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
        visible={verificationTicket !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setVerificationTicket(null)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setVerificationTicket(null)}>
          <Pressable style={styles.modalCard} onPress={(event) => event.stopPropagation()}>
            <Text style={styles.modalTitle}>VERIFICATION QR</Text>
            <Text style={styles.modalHint}>
              Hold this large QR steady for the club Verify camera. Do not scan the Gate payment QR.
            </Text>
            {verificationTicket?.ticketQrPayload ? (
              <QrCodeView
                value={verificationTicket.ticketQrPayload}
                size={verificationQrSize}
                errorCorrectionLevel="L"
              />
            ) : null}
            <Text style={styles.modalIssuer}>
              Club wallet must be {shortAddress(verificationTicket?.receiverAddress)}
            </Text>
            <Pressable accessibilityRole="button" onPress={() => setVerificationTicket(null)} style={styles.modalClose}>
              <Text style={styles.modalCloseText}>CLOSE</Text>
            </Pressable>
          </Pressable>
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
    padding: 16,
  },
  modalCard: {
    borderWidth: 3,
    borderColor: RenoPayBrand.border,
    borderRadius: 16,
    backgroundColor: RenoPayBrand.backgroundElevated,
    padding: 16,
    alignItems: 'center',
    gap: 12,
    width: '100%',
    maxWidth: 400,
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
  modalIssuer: {
    color: RenoPayBrand.foreground,
    fontSize: 12,
    fontWeight: '800',
    textAlign: 'center',
  },
  modalClose: {
    marginTop: 4,
    borderWidth: 2,
    borderColor: RenoPayBrand.border,
    borderRadius: 8,
    backgroundColor: RenoPayBrand.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  modalCloseText: {
    color: RenoPayBrand.border,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
});
