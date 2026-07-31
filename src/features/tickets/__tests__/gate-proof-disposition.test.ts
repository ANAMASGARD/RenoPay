import AsyncStorage from '@react-native-async-storage/async-storage';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { sampleIssuedTicket } from '@/features/tickets/__tests__/test-fixtures';
import {
  buildTicketProofPlaintext,
  buildTicketProofQr,
  getProofPurchaseKey,
  parseAndVerifyTicketProof,
  type TicketProofPlaintext,
} from '@/features/tickets/ticket-proof';
import {
  applyGateDispositionToLocalTicket,
  clearTicketData,
  getGateProofDisposition,
  loadTickets,
  proofPurchaseKey,
  setGateProofDisposition,
} from '@/features/tickets/ticket-storage';

const storage = vi.hoisted(() => new Map<string, string>());

vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: vi.fn(async (key: string) => storage.get(key) ?? null),
    setItem: vi.fn(async (key: string, value: string) => {
      storage.set(key, value);
    }),
    multiRemove: vi.fn(async (keys: string[]) => {
      for (const key of keys) storage.delete(key);
    }),
  },
}));

async function sampleProof(overrides: Partial<TicketProofPlaintext> = {}): Promise<TicketProofPlaintext> {
  const ticket = sampleIssuedTicket({
    kind: 'received',
    status: 'transferred',
    sessionId: 'session-shared-offer',
    senderAddress: '0xSender0000000000000000000000000000000001',
    txHash: '0xabc123',
    receiptId: 'rcpt-a',
    endAt: '2030-07-12T20:00:00.000Z',
  });
  const proof = await buildTicketProofPlaintext(ticket);
  if (!proof) throw new Error('fixture proof missing');
  return { ...proof, ...overrides };
}

describe('gate proof dispositions', () => {
  beforeEach(async () => {
    storage.clear();
    vi.mocked(AsyncStorage.getItem).mockClear();
    vi.mocked(AsyncStorage.setItem).mockClear();
    await clearTicketData();
  });

  it('keys dispositions by receiptId so multiple buyers can share an offer ticketId', async () => {
    const buyerA = await sampleProof({ receiptId: 'rcpt-a', txHash: '0xaaa' });
    const buyerB = await sampleProof({ receiptId: 'rcpt-b', txHash: '0xbbb', ticketId: buyerA.ticketId });

    expect(proofPurchaseKey(buyerA)).toBe('rcpt-a');
    expect(proofPurchaseKey(buyerB)).toBe('rcpt-b');
    expect(getProofPurchaseKey(buyerA)).toBe('rcpt-a');

    await setGateProofDisposition(buyerA, 'admitted');
    expect(await getGateProofDisposition(buyerA)).toMatchObject({ status: 'admitted' });
    expect(await getGateProofDisposition(buyerB)).toBeNull();
  });

  it('rejects re-scan after VERIFY or EXPIRE on the same purchase key', async () => {
    const proof = await sampleProof({ receiptId: 'rcpt-verify-once' });

    await setGateProofDisposition(proof, 'admitted');
    expect(await getGateProofDisposition(proof)).toMatchObject({ status: 'admitted' });

    await clearTicketData();
    const expiredProof = await sampleProof({ receiptId: 'rcpt-expire-once' });
    await setGateProofDisposition(expiredProof, 'expired');
    expect(await getGateProofDisposition(expiredProof)).toMatchObject({ status: 'expired' });
  });

  it('rejects expired proofs before gate action', async () => {
    const ticket = sampleIssuedTicket({
      kind: 'received',
      status: 'transferred',
      sessionId: 'session-expired',
      senderAddress: '0xSender0000000000000000000000000000000001',
      txHash: '0xdeadbeef',
      receiptId: 'rcpt-expired',
      endAt: '2020-01-01T00:00:00.000Z',
    });
    const proofQr = await buildTicketProofQr(ticket);
    expect(proofQr).toBeTruthy();

    const verified = await parseAndVerifyTicketProof(
      proofQr!,
      ticket.receiverAddress,
    );
    expect(verified.ok).toBe(false);
    if (!verified.ok) {
      expect(verified.reason).toContain('expired');
    }
  });

  it('falls back to legacy consumed ticketIds as admitted', async () => {
    const proof = await sampleProof({ ticketId: 'ticket-legacy', receiptId: 'rcpt-legacy-new' });
    await AsyncStorage.setItem('@renopay/consumed_proofs_v1', JSON.stringify(['ticket-legacy']));

    expect(await getGateProofDisposition(proof)).toMatchObject({ status: 'admitted', ticketId: 'ticket-legacy' });
  });

  it('updates matching received ticket after VERIFY or EXPIRE', async () => {
    const proof = await sampleProof({ receiptId: 'rcpt-local-status', txHash: '0xlocalstatus' });
    const ticket = sampleIssuedTicket({
      kind: 'received',
      status: 'transferred',
      ticketId: proof.ticketId,
      sessionId: proof.sessionId,
      senderAddress: proof.senderAddress,
      txHash: proof.txHash,
      receiptId: proof.receiptId,
      quantity: 1,
      remainingQuantity: 0,
    });
    await AsyncStorage.setItem('@renopay/tickets_v2', JSON.stringify([ticket]));

    await applyGateDispositionToLocalTicket(proof, 'admitted');
    let tickets = await loadTickets();
    expect(tickets[0]?.gateDisposition).toBe('admitted');
    expect(tickets[0]?.status).toBe('checked_in');
    expect(tickets[0]?.checkedInAt).toBeTruthy();

    await applyGateDispositionToLocalTicket(proof, 'expired');
    tickets = await loadTickets();
    expect(tickets[0]?.gateDisposition).toBe('expired');
    expect(tickets[0]?.status).toBe('checked_in');
  });
});
