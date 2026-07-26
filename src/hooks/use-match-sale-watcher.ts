import { useEffect, useRef } from 'react';

import { fetchMatchSalePurchases } from '@/features/matches/registry';
import { addAttendee, loadAttendees } from '@/features/tickets/ticket-storage';
import type { AttendeeRecord, TicketRecord } from '@/features/tickets/ticket-types';

type Params = {
  tickets: TicketRecord[];
  attendees: AttendeeRecord[];
  onChange: (tickets: TicketRecord[], attendees: AttendeeRecord[]) => void;
};

/** Watches MatchSale logs directly so a club sees purchases without a backend. */
export function useMatchSaleWatcher({ tickets, attendees, onChange }: Params): void {
  const ticketsRef = useRef(tickets);
  const attendeesRef = useRef(attendees);
  const busyRef = useRef(false);
  const onChangeRef = useRef(onChange);

  useEffect(() => { ticketsRef.current = tickets; }, [tickets]);
  useEffect(() => { attendeesRef.current = attendees; }, [attendees]);
  useEffect(() => { onChangeRef.current = onChange; }, [onChange]);

  useEffect(() => {
    let cancelled = false;
    const poll = async () => {
      if (cancelled || busyRef.current) return;
      busyRef.current = true;
      try {
        const issued = ticketsRef.current.filter((ticket) => ticket.kind === 'issued' && ticket.matchSaleAddress);
        const currentAttendees = attendeesRef.current;
        const updates: AttendeeRecord[] = [];
        const changedTickets = [...ticketsRef.current];

        for (const ticket of issued) {
          const purchases = await fetchMatchSalePurchases(ticket.matchSaleAddress!);
          const latest = purchases[purchases.length - 1];
          if (latest) {
            const index = changedTickets.findIndex((item) => item.ticketId === ticket.ticketId);
            if (index >= 0) {
              changedTickets[index] = {
                ...changedTickets[index],
                remainingQuantity: Math.max(0, ticket.quantity - latest.sold),
                status: latest.sold >= ticket.quantity ? 'transferred' : ticket.status,
                updatedAt: new Date().toISOString(),
              };
            }
          }
          for (const purchase of purchases) {
            if (currentAttendees.some((item) => item.txHash === purchase.txHash) || updates.some((item) => item.txHash === purchase.txHash)) continue;
            updates.push({
              attendeeId: `match-${purchase.txHash}`,
              ticketId: ticket.ticketId,
              sessionId: ticket.matchId ?? ticket.matchSaleAddress!,
              senderAddress: purchase.buyer,
              amountUsdt: purchase.amountUsdt,
              txHash: purchase.txHash,
              receiptId: `sale-${purchase.txHash.slice(2, 10)}`,
              paidAt: new Date().toISOString(),
              quantity: purchase.quantity,
              matchSaleAddress: ticket.matchSaleAddress,
            });
          }
        }

        if (updates.length > 0) {
          for (const attendee of updates) await addAttendee(attendee);
        }
        if (updates.length > 0 || changedTickets.some((item, index) => item !== ticketsRef.current[index])) {
          const storedAttendees = updates.length > 0 ? await loadAttendees() : attendeesRef.current;
          onChangeRef.current(changedTickets, storedAttendees);
        }
      } catch (error) {
        console.warn('[match-sale-watcher] poll failed:', error);
      } finally {
        busyRef.current = false;
      }
    };
    void poll();
    const timer = setInterval(() => { void poll(); }, 6000);
    return () => { cancelled = true; clearInterval(timer); };
  }, []);
}
