import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useIsFocused } from '@react-navigation/native';

import { PitchScreen } from '@/components/layout/pitch-screen';
import { AttendeeRow } from '@/components/receiver/attendee-row';
import { QrScanner } from '@/components/pay/qr-scanner';
import { RenoPayInlineLoader } from '@/components/ui/renopay-inline-loader';
import { RenoPayBrand } from '@/constants/renopay-brand';
import { useTickets } from '@/features/tickets/tickets-context';
import { parseAndVerifyTicketProof } from '@/features/tickets/ticket-proof';
import { consumeTicketProof, getTicketById, isTicketProofConsumed, upsertTicket } from '@/features/tickets/ticket-storage';
import { useAccount } from '@/features/wdk/wdk-hooks';

export default function AttendeesScreen() {
  const { attendees, loading } = useTickets();
  const isFocused = useIsFocused();
  const { address } = useAccount({ network: 'ethereum', accountIndex: 0 });
  const [scanning, setScanning] = useState(false);
  const [scanKey, setScanKey] = useState(0);

  const verifyTicket = async (raw: string) => {
    setScanning(false);
    if (!address) {
      Alert.alert('Wallet required', 'Unlock the club wallet before verifying tickets.');
      return;
    }
    const result = await parseAndVerifyTicketProof(raw, address);
    if (!result.ok) {
      Alert.alert('Ticket rejected', result.reason);
      setScanKey((value) => value + 1);
      return;
    }
    if (await isTicketProofConsumed(result.proof.ticketId)) {
      Alert.alert('Ticket already used', 'This proof QR has already been checked in at this club.');
      return;
    }
    await consumeTicketProof(result.proof.ticketId);
    const localTicket = await getTicketById(result.proof.ticketId);
    if (localTicket) {
      await upsertTicket({ ...localTicket, status: 'checked_in', checkedInAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
    }
    Alert.alert('Ticket verified', `${result.proof.eventName}\n${result.proof.senderAddress}\n\nEntry proof consumed — it cannot be used again on this gate device.`);
  };

  if (scanning && isFocused) {
    return <View style={styles.scannerRoot}><QrScanner key={scanKey} onScan={(raw) => void verifyTicket(raw)} onClose={() => setScanning(false)} /></View>;
  }

  return (
    <PitchScreen>
      <Text style={styles.heading}>ATTENDEES</Text>
      <Text style={styles.copy}>Payments independently verified from Sepolia USD₮ transfer logs.</Text>
      <Text style={styles.verifyCopy}>Scan a fan entry QR to validate its encrypted proof and consume it once.</Text>
      <View style={styles.scanButtonWrap}>
        <View style={styles.scanButtonShadow} />
        <Pressable accessibilityRole="button" onPress={() => setScanning(true)} style={styles.scanButton}><Text style={styles.scanButtonText}>SCAN TICKET QR</Text></Pressable>
      </View>
      {loading ? <RenoPayInlineLoader label="LOADING ATTENDEES" height={160} /> : null}
      {!loading && attendees.length === 0 ? <Text style={styles.empty}>No verified attendees yet.</Text> : null}
      {attendees.map((attendee) => <AttendeeRow key={attendee.attendeeId} attendee={attendee} />)}
    </PitchScreen>
  );
}

const styles = StyleSheet.create({
  heading: { color: RenoPayBrand.foreground, fontSize: 32, fontWeight: '900', letterSpacing: 1.2, textAlign: 'center', marginBottom: 8 },
  copy: { color: RenoPayBrand.muted, textAlign: 'center', fontSize: 14, lineHeight: 20, marginBottom: 18 },
  empty: { color: RenoPayBrand.muted, textAlign: 'center', marginTop: 32, fontSize: 15 },
  verifyCopy: { color: RenoPayBrand.muted, textAlign: 'center', fontSize: 12, lineHeight: 18, marginBottom: 12 },
  scanButtonWrap: { position: 'relative', marginBottom: 18 },
  scanButtonShadow: { position: 'absolute', left: 0, right: 0, bottom: -4, top: 4, borderRadius: 10, backgroundColor: RenoPayBrand.border },
  scanButton: { borderWidth: 3, borderColor: RenoPayBrand.border, borderRadius: 10, backgroundColor: RenoPayBrand.primary, paddingVertical: 13, alignItems: 'center' },
  scanButtonText: { color: RenoPayBrand.border, fontSize: 14, fontWeight: '900', letterSpacing: 1 },
  scannerRoot: { flex: 1, backgroundColor: RenoPayBrand.background },
});
