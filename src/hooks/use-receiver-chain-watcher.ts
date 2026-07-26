import { useEffect, useRef } from 'react';
import { Alert } from 'react-native';

import { findIncomingUsdtPayment } from '@/features/tickets/chain-payment-watcher';
import { canFulfillPayment, createPaymentEventId, fulfillPayment } from '@/features/tickets/payment-session';
import { addAttendee, markSessionPaid, upsertTicket } from '@/features/tickets/ticket-storage';
import type { ActiveSession, AttendeeRecord, TicketRecord } from '@/features/tickets/ticket-types';

type UseReceiverChainWatcherParams = {
  activeSession: ActiveSession | null;
  tickets: TicketRecord[];
  attendees: AttendeeRecord[];
  processedPayments: Set<string>;
  onFulfilled: (nextTickets: TicketRecord[], nextAttendees: AttendeeRecord[]) => void;
};

export function useReceiverChainWatcher({
  activeSession,
  tickets,
  attendees,
  processedPayments,
  onFulfilled,
}: UseReceiverChainWatcherParams): void {
  const ticketsRef = useRef(tickets);
  const attendeesRef = useRef(attendees);
  const onFulfilledRef = useRef(onFulfilled);
  const pollingRef = useRef(false);

  useEffect(() => {
    ticketsRef.current = tickets;
  }, [tickets]);

  useEffect(() => {
    attendeesRef.current = attendees;
  }, [attendees]);

  useEffect(() => {
    onFulfilledRef.current = onFulfilled;
  }, [onFulfilled]);

  const sessionId = activeSession?.role === 'receiver' ? activeSession.sessionId : null;
  const watchFromBlock = activeSession?.role === 'receiver' ? activeSession.watchFromBlock : undefined;

  useEffect(() => {
    if (!sessionId || watchFromBlock === undefined) {
      return;
    }

    let cancelled = false;
    let intervalId: ReturnType<typeof setInterval> | undefined;

    const poll = async () => {
      if (cancelled || pollingRef.current) {
        return;
      }
      pollingRef.current = true;
      try {
        const ticket = ticketsRef.current.find(
          (item) => item.sessionId === sessionId && item.kind === 'issued',
        );
        if (!ticket || ticket.status !== 'awaiting_payment') {
          return;
        }

        const payment = await findIncomingUsdtPayment({
          receiverAddress: ticket.receiverAddress,
          amountUsdt: ticket.priceUsdt,
          fromBlock: watchFromBlock,
        });
        if (!payment) {
          return;
        }

        if (
          processedPayments.has(payment.txHash) ||
          attendeesRef.current.some((item) => item.txHash === payment.txHash)
        ) {
          return;
        }

        const syntheticEvent = {
          sessionId,
          senderAddress: payment.senderAddress,
          amountUsdt: ticket.priceUsdt,
          txHash: payment.txHash,
          eventId: createPaymentEventId(),
        };

        if (!canFulfillPayment(ticket, syntheticEvent)) {
          return;
        }

        const result = fulfillPayment({
          ticket,
          payment: syntheticEvent,
          receiverAddress: ticket.receiverAddress,
        });

        const [nextTickets, nextAttendees] = await Promise.all([
          upsertTicket(result.updatedTicket),
          addAttendee(result.attendee),
          markSessionPaid(sessionId),
        ]);
        processedPayments.add(payment.txHash);
        onFulfilledRef.current(nextTickets, nextAttendees);

        Alert.alert(
          'Payment verified',
          `${ticket.priceUsdt} USDT received on Sepolia testnet.\nTx: ${payment.txHash.slice(0, 10)}…`,
        );
      } catch (error) {
        console.warn('[chain-watcher] poll failed:', error);
      } finally {
        pollingRef.current = false;
      }
    };

    void poll();
    intervalId = setInterval(() => {
      void poll();
    }, 4000);

    return () => {
      cancelled = true;
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [processedPayments, sessionId, watchFromBlock]);
}
