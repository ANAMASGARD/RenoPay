import { useCallback, useState } from 'react';
import { Alert } from 'react-native';

import {
  preflightSepoliaUsdtPayment,
  sendSepoliaUsdtPayment,
  type PaymentSendStage,
} from '@/features/tickets/payment-send';
import { formatUsdtFromAtomic, parseFeeAtomic } from '@/features/tickets/payment-helpers';
import { parseTicketOfferQr, type QrPayload } from '@/features/tickets/qr-payload';
import { mintReceivedTicketFromQr } from '@/features/tickets/ticket-mint';
import { markSessionPaid } from '@/features/tickets/ticket-storage';
import { useTickets } from '@/features/tickets/tickets-context';
import { useAccount } from '@/features/wdk/wdk-hooks';
import { buyMatchTickets, type EvmAccountExtension } from '@/features/matches/registry';

export type PayStep = 'idle' | 'scanning' | 'confirm';

const PAY_STAGE_LABELS: Record<PaymentSendStage, string> = {
  checking_balance: 'CHECKING BALANCE',
  estimating_fee: 'ESTIMATING FEE',
  confirm_device: 'CONFIRM ON DEVICE',
  submitting: 'SUBMITTING TX',
};

export function usePaymentFlow(walletReady: boolean) {
  const account = useAccount({
    network: 'ethereum',
    accountIndex: 0,
  }) as unknown as ReturnType<typeof useAccount> & { extension: <T extends object>() => T };
  const { address, send, getBalance, estimateFee } = account;
  const tickets = useTickets();

  const [step, setStep] = useState<PayStep>('idle');
  const [payload, setPayload] = useState<QrPayload | null>(null);
  const [paying, setPaying] = useState(false);
  const [payStage, setPayStage] = useState<PaymentSendStage | null>(null);
  const [joining, setJoining] = useState(false);

  const handleScanResult = useCallback(
    async (raw: string): Promise<boolean> => {
      const trimmed = raw.trim();
      const offer = parseTicketOfferQr(trimmed);
      if (offer) {
        Alert.alert(
          'Not a payment QR',
          'This is a ticket display QR. Ask the gatekeeper to tap Receive Payment for a payment QR.',
        );
        return false;
      }

      if (!address) {
        Alert.alert('Wallet required', 'Connect your wallet before paying.');
        return false;
      }

      setJoining(true);
      try {
        const result = await tickets.joinPaymentSessionAsSender(trimmed, address);
        if (!result.ok) {
          Alert.alert('Invalid QR', result.reason);
          return false;
        }

        setPayload(result.payload);
        setStep('confirm');
        return true;
      } finally {
        setJoining(false);
      }
    },
    [address, tickets],
  );

  const handlePay = useCallback(async () => {
    if (!walletReady || !address || !payload) {
      Alert.alert('Wallet required', 'Connect your wallet before paying.');
      return;
    }

    try {
      if (!payload.matchSaleAddress && (!getBalance || !estimateFee)) {
        throw new Error('Wallet balance APIs unavailable. Reload the app and retry.');
      }

      setPaying(true);
      setPayStage('checking_balance');
      const preflight = payload.matchSaleAddress ? null : await preflightSepoliaUsdtPayment({
        walletAddress: address,
        getBalance: getBalance!,
        estimateFee: estimateFee!,
        to: payload.receiverAddress,
        amountUsdt: payload.priceUsdt,
        onStage: setPayStage,
      });
      const quotedFee = preflight ? formatUsdtFromAtomic(parseFeeAtomic(preflight.fee)) : 'quoted during checkout';

      Alert.alert(
        'Confirm payment',
        `Ticket: ${payload.priceUsdt} USDT\nNetwork fee: ${quotedFee} test USDT\n\nApprove with your device PIN or biometric if prompted.`,
        [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Pay now',
          onPress: () => {
            void (async () => {
              setPaying(true);
              setPayStage('checking_balance');
              try {
                if (!payload.matchSaleAddress && (!getBalance || !estimateFee)) {
                  throw new Error('Wallet balance APIs unavailable. Reload the app and retry.');
                }

                const result = payload.matchSaleAddress
                  ? await buyMatchTickets(account.extension<EvmAccountExtension>(), payload.matchSaleAddress, payload.priceUsdt, 1)
                  : await sendSepoliaUsdtPayment({
                  walletAddress: address,
                  send,
                  getBalance: getBalance!,
                  estimateFee: estimateFee!,
                  to: payload.receiverAddress,
                  amountUsdt: payload.priceUsdt,
                  onStage: setPayStage,
                });

                const minted = await mintReceivedTicketFromQr({
                  payload,
                  txHash: result.hash,
                  senderAddress: address,
                });

                if (!minted) {
                  throw new Error(
                    'Payment sent but ticket could not be saved. Contact the gatekeeper with your transaction hash.',
                  );
                }

                await markSessionPaid(payload.sessionId);
                await tickets.refresh();

                setStep('idle');
                setPayload(null);
                tickets.clearActiveSession();
                Alert.alert(
                  'Payment complete',
                  'Your ticket is saved in the Tickets tab.',
                );
              } catch (error) {
                Alert.alert(
                  'Payment failed',
                  error instanceof Error ? error.message : 'Unable to send payment.',
                );
              } finally {
                setPaying(false);
                setPayStage(null);
              }
            })();
          },
        },
        ],
      );
    } catch (error) {
      Alert.alert(
        'Payment unavailable',
        error instanceof Error ? error.message : 'Unable to quote this payment.',
      );
    } finally {
      setPaying(false);
      setPayStage(null);
    }
  }, [account, address, estimateFee, getBalance, payload, send, tickets, walletReady]);

  const resetFlow = useCallback(() => {
    setStep('idle');
    setPayload(null);
    setPayStage(null);
    tickets.clearActiveSession();
  }, [tickets]);

  const cancelConfirm = useCallback(() => {
    setPayload(null);
    setStep('idle');
    setPayStage(null);
    tickets.clearActiveSession();
  }, [tickets]);

  return {
    step,
    setStep,
    payload,
    paying,
    payStageLabel: payStage ? PAY_STAGE_LABELS[payStage] : null,
    joining,
    busyMessage: tickets.busyMessage,
    handleScanResult,
    handlePay,
    resetFlow,
    cancelConfirm,
  };
}
