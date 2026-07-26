import { StyleSheet, Text } from 'react-native';

import { PitchScreen } from '@/components/layout/pitch-screen';
import { AttendeeRow } from '@/components/receiver/attendee-row';
import { TicketCard } from '@/components/tickets/ticket-card';
import { RenoPayInlineLoader } from '@/components/ui/renopay-inline-loader';
import { RenoPayBrand } from '@/constants/renopay-brand';
import { useTickets } from '@/features/tickets/tickets-context';

export default function IssuedTicketsScreen() {
  const { tickets, attendees, loading } = useTickets();
  const issued = tickets.filter((ticket) => ticket.kind === 'issued');
  return (
    <PitchScreen>
      <Text style={styles.heading}>ISSUED</Text>
      <Text style={styles.copy}>Ticket offers created by your club.</Text>
      {loading ? <RenoPayInlineLoader label="LOADING ISSUED TICKETS" height={160} /> : null}
      {!loading && issued.length === 0 ? <Text style={styles.empty}>No ticket offers created yet.</Text> : null}
      {issued.map((ticket) => <TicketCard key={ticket.ticketId} ticket={ticket} />)}
      {attendees.length > 0 ? <Text style={styles.subheading}>PURCHASED ON-CHAIN</Text> : null}
      {attendees.map((attendee) => <AttendeeRow key={`issued-${attendee.attendeeId}`} attendee={attendee} />)}
    </PitchScreen>
  );
}

const styles = StyleSheet.create({
  heading: { color: RenoPayBrand.foreground, fontSize: 32, fontWeight: '900', letterSpacing: 1.2, textAlign: 'center', marginBottom: 8 },
  copy: { color: RenoPayBrand.muted, textAlign: 'center', fontSize: 14, marginBottom: 18 },
  empty: { color: RenoPayBrand.muted, textAlign: 'center', marginTop: 32, fontSize: 15 },
  subheading: { color: RenoPayBrand.primary, fontSize: 14, fontWeight: '900', letterSpacing: 1, marginTop: 12, marginBottom: 12 },
});
