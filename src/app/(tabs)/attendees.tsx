import { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useIsFocused } from '@react-navigation/native';

import { PitchScreen } from '@/components/layout/pitch-screen';
import { AttendeeRow } from '@/components/receiver/attendee-row';
import { QrScanner } from '@/components/pay/qr-scanner';
import { RenoPayInlineLoader } from '@/components/ui/renopay-inline-loader';
import { RenoPayBrand } from '@/constants/renopay-brand';
import { useTickets } from '@/features/tickets/tickets-context';
import { parseAndVerifyTicketProof, type TicketProofPlaintext } from '@/features/tickets/ticket-proof';
import {
  getGateProofDisposition,
  loadRecentGateProofDispositions,
  setGateProofDisposition,
  type GateProofDisposition,
} from '@/features/tickets/ticket-storage';
import { useAccount } from '@/features/wdk/wdk-hooks';

type RecentDisposition = { purchaseKey: string } & GateProofDisposition;

export default function AttendeesScreen() {
  const { attendees, loading, refresh } = useTickets();
  const isFocused = useIsFocused();
  const { address } = useAccount({ network: 'ethereum', accountIndex: 0 });
  const [scanning, setScanning] = useState(false);
  const [scanKey, setScanKey] = useState(0);
  const [recentDispositions, setRecentDispositions] = useState<RecentDisposition[]>([]);

  const refreshDispositions = useCallback(async () => {
    setRecentDispositions(await loadRecentGateProofDispositions());
  }, []);

  useEffect(() => {
    if (isFocused) void refreshDispositions();
  }, [isFocused, refreshDispositions]);

  const finishGateAction = (title: string, message: string) => {
    Alert.alert(title, message);
    void refreshDispositions();
    void refresh();
    setScanKey((value) => value + 1);
  };

  const handleVerify = async (proof: TicketProofPlaintext) => {
    await setGateProofDisposition(proof, 'admitted');
    finishGateAction(
      'Ticket verified',
      `${proof.eventName}\n${proof.senderAddress}\n\nFan admitted. This proof cannot be scanned again on this gate device.`,
    );
  };

  const handleExpire = async (proof: TicketProofPlaintext) => {
    await setGateProofDisposition(proof, 'expired');
    finishGateAction(
      'Ticket expired',
      `${proof.eventName}\n${proof.senderAddress}\n\nEntry voided on this gate device. This proof cannot be scanned again here.`,
    );
  };

  const verifyTicket = async (raw: string) => {
    if (!address) {
      Alert.alert('Wallet required', 'Unlock the club wallet before verifying tickets.');
      setScanKey((value) => value + 1);
      return;
    }

    const result = await parseAndVerifyTicketProof(raw, address);
    if (!result.ok) {
      Alert.alert('Ticket rejected', result.reason);
      setScanKey((value) => value + 1);
      return;
    }

    const disposition = await getGateProofDisposition(result.proof);
    if (disposition?.status === 'admitted') {
      Alert.alert('Already verified', 'This entry proof was already admitted at this gate device.');
      setScanKey((value) => value + 1);
      return;
    }
    if (disposition?.status === 'expired') {
      Alert.alert('Already expired', 'This entry proof was already voided at this gate device.');
      setScanKey((value) => value + 1);
      return;
    }

    setScanning(false);
    Alert.alert(
      result.proof.eventName,
      [
        `${result.proof.homeTeam} vs ${result.proof.awayTeam}`,
        result.proof.venue,
        `Gate ${result.proof.gate} · ${result.proof.seatLabel}`,
        '',
        'Choose gate action:',
      ].join('\n'),
      [
        { text: 'Cancel', style: 'cancel', onPress: () => setScanKey((value) => value + 1) },
        { text: 'EXPIRE', style: 'destructive', onPress: () => void handleExpire(result.proof) },
        { text: 'VERIFY', onPress: () => void handleVerify(result.proof) },
      ],
    );
  };

  if (scanning && isFocused) {
    return (
      <View style={styles.scannerRoot}>
        <QrScanner
          key={scanKey}
          hint="Align the fan large verification QR from Tickets inside the frame"
          idleHint="Move closer, hold steady, and try TORCH ON if nothing happens."
          onScan={(raw) => void verifyTicket(raw)}
          onClose={() => setScanning(false)}
        />
      </View>
    );
  }

  return (
    <PitchScreen>
      <Text style={styles.heading}>VERIFY</Text>

      <Text style={styles.sectionTitle}>GATE SCAN</Text>
      <Text style={styles.verifyCopy}>
        Scan the fan large verification QR from Tickets. Club wallet must match the ticket issuer shown on that QR.
      </Text>
      <View style={styles.scanButtonWrap}>
        <View style={styles.scanButtonShadow} />
        <Pressable accessibilityRole="button" onPress={() => setScanning(true)} style={styles.scanButton}>
          <Text style={styles.scanButtonText}>SCAN TICKET QR</Text>
        </Pressable>
      </View>

      {recentDispositions.length > 0 ? (
        <View style={styles.dispositionSection}>
          <Text style={styles.dispositionTitle}>RECENT GATE ACTIONS</Text>
          {recentDispositions.map((entry) => (
            <View key={entry.purchaseKey} style={styles.dispositionRow}>
              <Text style={styles.dispositionEvent}>{entry.eventName ?? 'Entry proof'}</Text>
              <Text style={styles.dispositionMeta}>
                {entry.status === 'admitted' ? 'VERIFIED' : 'EXPIRED'}
                {entry.at ? ` · ${new Date(entry.at).toLocaleString()}` : ''}
              </Text>
            </View>
          ))}
        </View>
      ) : null}

      <Text style={styles.sectionTitle}>ON-CHAIN PAYMENTS</Text>
      <Text style={styles.copy}>Payments independently verified from Sepolia USD₮ transfer logs.</Text>
      {loading ? <RenoPayInlineLoader label="LOADING ATTENDEES" height={160} /> : null}
      {!loading && attendees.length === 0 ? <Text style={styles.empty}>No verified attendees yet.</Text> : null}
      {attendees.map((attendee) => <AttendeeRow key={attendee.attendeeId} attendee={attendee} />)}
    </PitchScreen>
  );
}

const styles = StyleSheet.create({
  heading: { color: RenoPayBrand.foreground, fontSize: 32, fontWeight: '900', letterSpacing: 1.2, textAlign: 'center', marginBottom: 12 },
  sectionTitle: { color: RenoPayBrand.primary, fontSize: 13, fontWeight: '900', letterSpacing: 1, marginBottom: 6 },
  copy: { color: RenoPayBrand.muted, textAlign: 'center', fontSize: 14, lineHeight: 20, marginBottom: 18 },
  empty: { color: RenoPayBrand.muted, textAlign: 'center', marginTop: 32, fontSize: 15 },
  verifyCopy: { color: RenoPayBrand.muted, textAlign: 'center', fontSize: 12, lineHeight: 18, marginBottom: 12 },
  scanButtonWrap: { position: 'relative', marginBottom: 18 },
  scanButtonShadow: { position: 'absolute', left: 0, right: 0, bottom: -4, top: 4, borderRadius: 10, backgroundColor: RenoPayBrand.border },
  scanButton: { borderWidth: 3, borderColor: RenoPayBrand.border, borderRadius: 10, backgroundColor: RenoPayBrand.primary, paddingVertical: 13, alignItems: 'center' },
  scanButtonText: { color: RenoPayBrand.border, fontSize: 14, fontWeight: '900', letterSpacing: 1 },
  dispositionSection: { marginBottom: 20, gap: 8 },
  dispositionTitle: { color: RenoPayBrand.muted, fontSize: 11, fontWeight: '900', letterSpacing: 0.8 },
  dispositionRow: { borderWidth: 2, borderColor: RenoPayBrand.border, borderRadius: 10, backgroundColor: RenoPayBrand.backgroundElevated, padding: 10 },
  dispositionEvent: { color: RenoPayBrand.foreground, fontSize: 13, fontWeight: '900' },
  dispositionMeta: { color: RenoPayBrand.muted, fontSize: 11, fontWeight: '700', marginTop: 2 },
  scannerRoot: { flex: 1, backgroundColor: RenoPayBrand.background },
});
