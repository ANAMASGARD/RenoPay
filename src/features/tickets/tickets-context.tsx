import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import { fetchCurrentBlockNumber } from '@/features/tickets/chain-payment-watcher';
import {
  startPaymentSession,
  validateAndJoinSession,
} from '@/features/tickets/payment-session';
import type { QrPayload } from '@/features/tickets/qr-payload';
import {
  loadAttendees,
  loadTickets,
} from '@/features/tickets/ticket-storage';
import type { ActiveSession, AttendeeRecord, TicketRecord } from '@/features/tickets/ticket-types';
import { useReceiverChainWatcher } from '@/hooks/use-receiver-chain-watcher';
import { useMatchSaleWatcher } from '@/hooks/use-match-sale-watcher';

type TicketsContextValue = {
  tickets: TicketRecord[];
  attendees: AttendeeRecord[];
  loading: boolean;
  busyMessage: string | null;
  refresh: () => Promise<void>;
  activeSession: ActiveSession | null;
  beginPaymentSession: (
    ticket: TicketRecord,
    priceUsdt: string,
    receiverAddress: string,
  ) => Promise<{ ticket: TicketRecord; qrString: string }>;
  joinPaymentSessionAsSender: (
    raw: string,
    senderAddress: string,
  ) => Promise<{ ok: true; payload: QrPayload } | { ok: false; reason: string }>;
  clearActiveSession: () => void;
};

const TicketsContext = createContext<TicketsContextValue | null>(null);

export function TicketsProvider({ children }: { children: ReactNode }) {
  const [tickets, setTickets] = useState<TicketRecord[]>([]);
  const [attendees, setAttendees] = useState<AttendeeRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyMessage, setBusyMessage] = useState<string | null>(null);
  const [activeSession, setActiveSession] = useState<ActiveSession | null>(null);

  const processedPaymentsRef = useRef(new Set<string>());
  const activeSessionRef = useRef<ActiveSession | null>(null);

  useEffect(() => {
    activeSessionRef.current = activeSession;
  }, [activeSession]);

  const refresh = useCallback(async () => {
    const [nextTickets, nextAttendees] = await Promise.all([loadTickets(), loadAttendees()]);
    setTickets(nextTickets);
    setAttendees(nextAttendees);
    setLoading(false);
  }, []);

  const handleChainFulfilled = useCallback(
    (nextTickets: TicketRecord[], nextAttendees: AttendeeRecord[]) => {
      setTickets(nextTickets);
      setAttendees(nextAttendees);
    },
    [],
  );

  useReceiverChainWatcher({
    activeSession,
    tickets,
    attendees,
    processedPayments: processedPaymentsRef.current,
    onFulfilled: handleChainFulfilled,
  });

  useMatchSaleWatcher({
    tickets,
    attendees,
    onChange: handleChainFulfilled,
  });

  useEffect(() => {
    refresh().catch(() => setLoading(false));
  }, [refresh]);

  const applyActiveSession = useCallback((session: ActiveSession | null) => {
    activeSessionRef.current = session;
    setActiveSession(session);
  }, []);

  const clearActiveSession = useCallback(() => {
    applyActiveSession(null);
  }, [applyActiveSession]);

  const beginPaymentSession = useCallback(
    async (ticket: TicketRecord, priceUsdt: string, receiverAddress: string) => {
      setBusyMessage('GENERATING QR');
      try {
        const started = await startPaymentSession({ ticket, priceUsdt, receiverAddress });
        setTickets((current) => {
          const index = current.findIndex((item) => item.ticketId === started.ticket.ticketId);
          if (index < 0) {
            return [started.ticket, ...current];
          }
          const next = [...current];
          next[index] = started.ticket;
          return next;
        });
        const watchFromBlock = await fetchCurrentBlockNumber();
        applyActiveSession({
          sessionId: started.payload.sessionId,
          role: 'receiver',
          watchFromBlock,
        });
        return { ticket: started.ticket, qrString: started.qrString };
      } finally {
        setBusyMessage(null);
      }
    },
    [applyActiveSession],
  );

  const joinPaymentSessionAsSender = useCallback(
    async (raw: string, senderAddress: string) => {
      setBusyMessage('READING QR');
      try {
        const result = await validateAndJoinSession(raw);
        if (!result.ok) {
          return result;
        }
        applyActiveSession({
          sessionId: result.payload.sessionId,
          role: 'sender',
          receiverAddress: result.payload.receiverAddress,
        });
        return result;
      } finally {
        setBusyMessage(null);
      }
    },
    [applyActiveSession],
  );

  const value = useMemo<TicketsContextValue>(
    () => ({
      tickets,
      attendees,
      loading,
      busyMessage,
      refresh,
      activeSession,
      beginPaymentSession,
      joinPaymentSessionAsSender,
      clearActiveSession,
    }),
    [
      activeSession,
      attendees,
      beginPaymentSession,
      busyMessage,
      clearActiveSession,
      joinPaymentSessionAsSender,
      loading,
      refresh,
      tickets,
    ],
  );

  return <TicketsContext.Provider value={value}>{children}</TicketsContext.Provider>;
}

export function useTickets(): TicketsContextValue {
  const context = useContext(TicketsContext);
  if (!context) {
    throw new Error('useTickets must be used within TicketsProvider');
  }
  return context;
}
