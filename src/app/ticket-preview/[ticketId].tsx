import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Alert, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { PitchScreen } from '@/components/layout/pitch-screen';
import { PaymentQrModal } from '@/components/receiver/payment-qr-modal';
import { QrCodeView } from '@/components/tickets/qr-code-view';
import { TicketPreviewCard } from '@/components/tickets/ticket-preview-card';
import { RenoPayInlineLoader } from '@/components/ui/renopay-inline-loader';
import { NeoBrutalButton } from '@/components/ui/neo-brutal-button';
import { RenoPayBrand } from '@/constants/renopay-brand';
import { getTicketById } from '@/features/tickets/ticket-storage';
import type { TicketRecord } from '@/features/tickets/ticket-types';
import { useTickets } from '@/features/tickets/tickets-context';
import { useAccount, useWdkApp } from '@/features/wdk/wdk-hooks';

export default function TicketPreviewScreen() {
  const router = useRouter();
  const { ticketId } = useLocalSearchParams<{ ticketId: string }>();
  const { state } = useWdkApp();
  const { address } = useAccount({ network: 'ethereum', accountIndex: 0 });
  const tickets = useTickets();

  const [ticket, setTicket] = useState<TicketRecord | null>(null);
  const [priceDraft, setPriceDraft] = useState('');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [qrModal, setQrModal] = useState<string | null>(null);

  const walletReady = state.status === 'READY' && !!address;

  useEffect(() => {
    if (!ticketId) {
      return;
    }
    getTicketById(ticketId)
      .then((loaded) => {
        if (!loaded) {
          Alert.alert('Ticket not found', 'This ticket offer no longer exists.', [
            { text: 'OK', onPress: () => router.back() },
          ]);
          return;
        }
        setTicket(loaded);
        setPriceDraft(loaded.priceUsdt);
      })
      .catch(() => undefined);
  }, [router, ticketId]);

  useEffect(() => {
    if (!ticketId) {
      return;
    }
    const updated = tickets.tickets.find((item) => item.ticketId === ticketId);
    if (updated) {
      setTicket(updated);
    }
  }, [tickets.tickets, ticketId]);

  const handleReceivePayment = useCallback(() => {
    if (!walletReady || !address || !ticket) {
      Alert.alert('Wallet required', 'Connect your wallet before receiving payments.');
      return;
    }
    if (ticket.remainingQuantity <= 0) {
      Alert.alert('Sold out', 'No tickets remaining for this offer.');
      return;
    }
    setShowPaymentModal(true);
  }, [address, ticket, walletReady]);

  if (!ticket) {
    return (
      <PitchScreen>
        <RenoPayInlineLoader label="LOADING TICKET" height={200} />
      </PitchScreen>
    );
  }

  return (
    <PitchScreen>
      <Text style={styles.heading}>TICKET PREVIEW</Text>
      <TicketPreviewCard
        ticket={ticket}
        qrValue={ticket.ticketQrPayload}
        onQrPress={ticket.ticketQrPayload ? () => setQrModal(ticket.ticketQrPayload!) : undefined}
      />

      <View style={styles.priceRow}>
        <Text style={styles.priceLabel}>PRICE (USDT)</Text>
        <TextInput
          style={styles.priceInput}
          value={priceDraft}
          onChangeText={setPriceDraft}
          keyboardType="decimal-pad"
        />
      </View>

      <NeoBrutalButton
        label="RECEIVE PAYMENT"
        disabled={!walletReady}
        onPress={handleReceivePayment}
      />

      {showPaymentModal ? (
        <PaymentQrModal
          visible
          ticket={{ ...ticket, priceUsdt: priceDraft.trim() || ticket.priceUsdt }}
          onClose={() => setShowPaymentModal(false)}
        />
      ) : null}

      <Modal visible={qrModal !== null} transparent animationType="fade" onRequestClose={() => setQrModal(null)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setQrModal(null)}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>TICKET QR</Text>
            {qrModal ? <QrCodeView value={qrModal} size={220} /> : null}
          </View>
        </Pressable>
      </Modal>
    </PitchScreen>
  );
}

const styles = StyleSheet.create({
  heading: {
    color: RenoPayBrand.foreground,
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: 1,
    textTransform: 'uppercase',
    textAlign: 'center',
    marginBottom: 12,
  },
  priceRow: { marginVertical: 12, gap: 6 },
  priceLabel: {
    color: RenoPayBrand.muted,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  priceInput: {
    borderWidth: 2,
    borderColor: RenoPayBrand.border,
    borderRadius: 10,
    backgroundColor: RenoPayBrand.backgroundElevated,
    color: RenoPayBrand.foreground,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 18,
    fontWeight: '900',
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
  },
  modalTitle: {
    color: RenoPayBrand.primary,
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 1,
  },
});
