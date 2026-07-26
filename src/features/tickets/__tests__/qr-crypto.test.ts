import { describe, expect, it } from 'vitest';

import {
  decryptJson,
  deriveSessionKey,
  encryptJson,
  fromBase64Url,
  normalizeReceiverAddress,
  toBase64Url,
} from '@/features/tickets/qr-crypto';

describe('qr-crypto', () => {
  it('round-trips JSON through AES-GCM with session-derived key', async () => {
    const sessionId = 'session-crypto-1';
    const receiverAddress = '0xReceiver00000000000000000000000000000001';
    const aad = {
      v: 2,
      kind: 'renopay-ticket-session-encrypted',
      sessionId,
      receiverAddress: normalizeReceiverAddress(receiverAddress),
      expiresAt: 1_700_000_000_000,
    };
    const plaintext = {
      eventName: 'Fan Club Gate A',
      priceUsdt: '10.00',
      checkInCode: 'ABC123',
    };

    const encrypted = await encryptJson({
      sessionId,
      receiverAddress,
      purpose: 'payment',
      plaintext,
      aad,
    });

    const decrypted = decryptJson<typeof plaintext>({
      sessionId,
      receiverAddress,
      purpose: 'payment',
      nonce: encrypted.nonce,
      ciphertext: encrypted.ciphertext,
      aad,
    });

    expect(decrypted).toEqual(plaintext);
  });

  it('fails decryption when AAD is tampered', async () => {
    const sessionId = 'session-crypto-2';
    const receiverAddress = '0xReceiver00000000000000000000000000000001';
    const aad = { sessionId, receiverAddress: normalizeReceiverAddress(receiverAddress), v: 2 };
    const encrypted = await encryptJson({
      sessionId,
      receiverAddress,
      purpose: 'proof',
      plaintext: { ticketId: 'ticket-1' },
      aad,
    });

    const decrypted = decryptJson({
      sessionId,
      receiverAddress,
      purpose: 'proof',
      nonce: encrypted.nonce,
      ciphertext: encrypted.ciphertext,
      aad: { ...aad, ticketId: 'ticket-tampered' },
    });

    expect(decrypted).toBeNull();
  });

  it('derives distinct keys for payment vs proof purpose', () => {
    const sessionId = 'session-crypto-3';
    const receiverAddress = '0xReceiver00000000000000000000000000000001';
    const paymentKey = deriveSessionKey(sessionId, receiverAddress, 'payment');
    const proofKey = deriveSessionKey(sessionId, receiverAddress, 'proof');
    expect(toBase64Url(paymentKey)).not.toBe(toBase64Url(proofKey));
    expect(fromBase64Url(toBase64Url(paymentKey))).toEqual(paymentKey);
  });
});
