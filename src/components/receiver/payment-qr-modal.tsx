import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { ReceiverSessionCard } from '@/components/receiver/receiver-session-card';
import { RenoPayInlineLoader } from '@/components/ui/renopay-inline-loader';
import { RenoPayLoadingOverlay } from '@/components/ui/renopay-loading-overlay';
import { NeoBrutalButton } from '@/components/ui/neo-brutal-button';
import { RenoPayBrand } from '@/constants/renopay-brand';
import { isQrExpired, parseQrPayload } from '@/features/tickets/qr-payload';
import type { TicketRecord } from '@/features/tickets/ticket-types';
import { useTickets } from '@/features/tickets/tickets-context';
import { useAccount, useWdkApp } from '@/features/wdk/wdk-hooks';

type PaymentQrModalProps = {
  visible: boolean;
  ticket: TicketRecord;
  onClose: () => void;
};

export function PaymentQrModal({ visible, ticket, onClose }: PaymentQrModalProps) {
  const { state } = useWdkApp();
  const { address } = useAccount({ network: 'ethereum', accountIndex: 0 });
  const tickets = useTickets();

  const [qrString, setQrString] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [activeTicket, setActiveTicket] = useState(ticket);
  const [starting, setStarting] = useState(false);
  const [qrReady, setQrReady] = useState(false);
  const [now, setNow] = useState(Date.now());
  const autoStartedRef = useRef(false);

  const walletReady = state.status === 'READY' && !!address;

  useEffect(() => {
    setActiveTicket(ticket);
  }, [ticket]);

  useEffect(() => {
    if (!visible) {
      autoStartedRef.current = false;
      setQrString(null);
      setSessionId(null);
      setQrReady(false);
      return;
    }
    setNow(Date.now());
  }, [visible]);

  useEffect(() => {
    if (!visible) {
      return;
    }
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [visible]);

  useEffect(() => {
    if (!qrString) {
      setQrReady(false);
      return;
    }
    setQrReady(false);
    const frame = requestAnimationFrame(() => {
      parseQrPayload(qrString);
      setQrReady(true);
    });
    return () => cancelAnimationFrame(frame);
  }, [qrString]);

  const startSession = useCallback(async () => {
    if (!walletReady || !address) {
      Alert.alert('Wallet required', 'Connect your wallet before receiving payments.');
      return;
    }
    if (activeTicket.remainingQuantity <= 0) {
      Alert.alert('Sold out', 'No tickets remaining for this offer.');
      return;
    }

    setStarting(true);
    setQrReady(false);
    try {
      const started = await tickets.beginPaymentSession(
        activeTicket,
        activeTicket.priceUsdt,
        address,
      );
      setActiveTicket(started.ticket);
      setQrString(started.qrString);
      setSessionId(started.ticket.sessionId ?? null);
    } catch (error) {
      Alert.alert(
        'Session failed',
        error instanceof Error ? error.message : 'Unable to start payment session.',
      );
    } finally {
      setStarting(false);
    }
  }, [activeTicket, address, tickets, walletReady]);

  useEffect(() => {
    if (!visible || !walletReady || autoStartedRef.current || starting) {
      return;
    }
    autoStartedRef.current = true;
    void startSession();
  }, [visible, walletReady, starting, startSession]);

  const parsedQr = qrString ? parseQrPayload(qrString) : null;
  const expired = parsedQr ? isQrExpired(parsedQr, now) : false;

  const remainingMs = parsedQr ? Math.max(0, parsedQr.expiresAt - now) : 0;
  const remainingMin = Math.floor(remainingMs / 60000);
  const remainingSec = Math.floor((remainingMs % 60000) / 1000);

  const showOverlay = starting || tickets.busyMessage === 'GENERATING QR';

  const handleClose = useCallback(() => {
    tickets.clearActiveSession();
    onClose();
  }, [onClose, tickets]);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={handleClose}>
      <View style={styles.root}>
        <View style={styles.header}>
          <Text style={styles.heading}>RECEIVE PAYMENT</Text>
          <Pressable accessibilityRole="button" onPress={handleClose} style={styles.closeBtn}>
            <Text style={styles.closeText}>CLOSE</Text>
          </Pressable>
        </View>

        {!walletReady ? (
          <View style={styles.startWrap}>
            <Text style={styles.event}>{activeTicket.eventName}</Text>
            <Text style={styles.price}>{activeTicket.priceUsdt} USDT</Text>
            <Text style={styles.expiredCopy}>Connect your wallet to generate a payment QR.</Text>
          </View>
        ) : !qrString || expired ? (
          <View style={styles.startWrap}>
            <Text style={styles.event}>{activeTicket.eventName}</Text>
            <Text style={styles.price}>{activeTicket.priceUsdt} USDT</Text>
            {expired ? (
              <Text style={styles.expiredCopy}>Previous QR expired. Generate a fresh one.</Text>
            ) : starting ? (
              <RenoPayInlineLoader label="GENERATING QR" height={120} />
            ) : (
              <Text style={styles.expiredCopy}>Tap below to generate a fresh payment QR.</Text>
            )}
            <NeoBrutalButton
              label={expired ? 'REGENERATE QR' : 'SHOW PAYMENT QR'}
              disabled={!walletReady || starting}
              onPress={startSession}
            />
          </View>
        ) : (
          <>
            <Text style={styles.keepOpenCopy}>
              Keep this screen open — watching Sepolia for incoming USDT payment.
            </Text>
            <Text style={styles.timer}>
              Expires in {remainingMin}:{remainingSec.toString().padStart(2, '0')}
            </Text>
            {qrReady ? (
              <ReceiverSessionCard
                ticket={activeTicket}
                qrPayload={qrString}
                sessionId={sessionId ?? ''}
              />
            ) : (
              <View style={styles.qrLoaderWrap}>
                <RenoPayInlineLoader label="GENERATING QR" height={280} />
              </View>
            )}
            <NeoBrutalButton
              label="REGENERATE QR"
              variant="secondary"
              disabled={starting}
              onPress={startSession}
            />
          </>
        )}
      </View>

      <RenoPayLoadingOverlay visible={showOverlay} label="GENERATING QR" />
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: RenoPayBrand.background,
    padding: 20,
    paddingTop: 48,
    gap: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  heading: {
    color: RenoPayBrand.foreground,
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 1,
  },
  closeBtn: {
    borderWidth: 2,
    borderColor: RenoPayBrand.border,
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: RenoPayBrand.backgroundElevated,
  },
  closeText: {
    color: RenoPayBrand.foreground,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  startWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
  },
  event: {
    color: RenoPayBrand.foreground,
    fontSize: 20,
    fontWeight: '900',
    textAlign: 'center',
  },
  price: {
    color: RenoPayBrand.primary,
    fontSize: 28,
    fontWeight: '900',
  },
  expiredCopy: {
    color: RenoPayBrand.muted,
    fontSize: 14,
    textAlign: 'center',
  },
  timer: {
    color: RenoPayBrand.muted,
    fontSize: 13,
    fontWeight: '800',
    textAlign: 'center',
  },
  keepOpenCopy: {
    color: RenoPayBrand.primary,
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 17,
    paddingHorizontal: 8,
  },
  qrLoaderWrap: {
    borderWidth: 3,
    borderColor: RenoPayBrand.border,
    borderRadius: 16,
    backgroundColor: RenoPayBrand.backgroundElevated,
    marginBottom: 8,
  },
});
