import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text } from 'react-native';

import { PaymentQrModal } from '@/components/receiver/payment-qr-modal';
import { PitchScreen } from '@/components/layout/pitch-screen';
import { TicketOfferList } from '@/components/tickets/ticket-offer-list';
import { RenoPayInlineLoader } from '@/components/ui/renopay-inline-loader';
import { NeoBrutalSectionButton } from '@/components/ui/neo-brutal-section-button';
import { WalletConnectButton } from '@/components/wallet/wallet-connect-button';
import { RenoPayBrand } from '@/constants/renopay-brand';
import type { TicketRecord } from '@/features/tickets/ticket-types';
import { useTickets } from '@/features/tickets/tickets-context';
import { useWdkApp } from '@/features/wdk/wdk-hooks';

export default function GateScreen() {
  const router = useRouter();
  const { state } = useWdkApp();
  const { tickets, loading: ticketsLoading } = useTickets();
  const walletReady = state.status === 'READY';

  const [paymentTicket, setPaymentTicket] = useState<TicketRecord | null>(null);

  return (
    <PitchScreen>
      <Text style={styles.heading}>GATE</Text>

      {!walletReady ? <WalletConnectButton compact showImport={false} /> : null}

      <NeoBrutalSectionButton
        header="TICKETS"
        label="CREATE TICKET"
        disabled={!walletReady}
        onPress={() => router.push('/create-ticket')}
      />

      <Text style={styles.sectionTitle}>YOUR TICKETS</Text>
      {ticketsLoading ? (
        <RenoPayInlineLoader label="LOADING TICKETS" height={100} />
      ) : (
        <TicketOfferList
          tickets={tickets}
          onView={(ticketId) => router.push(`/ticket-preview/${ticketId}`)}
          onReceivePayment={(ticket) => setPaymentTicket(ticket)}
        />
      )}

      {paymentTicket ? (
        <PaymentQrModal
          visible
          ticket={paymentTicket}
          onClose={() => setPaymentTicket(null)}
        />
      ) : null}
    </PitchScreen>
  );
}

const styles = StyleSheet.create({
  heading: {
    color: RenoPayBrand.foreground,
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: 1,
    textTransform: 'uppercase',
    textAlign: 'center',
    marginBottom: 10,
  },
  sectionTitle: {
    color: RenoPayBrand.foreground,
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 1,
    marginTop: 8,
    marginBottom: 4,
  },
});
