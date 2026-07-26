import { gcm } from '@noble/ciphers/aes.js';
import { sha256 } from '@noble/hashes/sha2.js';
import * as Crypto from 'expo-crypto';

const GCM_NONCE_BYTES = 12;
const KEY_PREFIX_PAYMENT = 'renopay:qr:payment:v1:';
const KEY_PREFIX_PROOF = 'renopay:qr:proof:v1:';

export type QrCryptoPurpose = 'payment' | 'proof';

export function normalizeReceiverAddress(address: string): string {
  return address.toLowerCase();
}

function utf8ToBytes(text: string): Uint8Array {
  return new TextEncoder().encode(text);
}

function bytesToUtf8(bytes: Uint8Array): string {
  return new TextDecoder().decode(bytes);
}

/** URL-safe base64 without padding — keeps QR strings compact. */
export function toBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  const base64 =
    typeof globalThis.btoa === 'function'
      ? globalThis.btoa(binary)
      : Buffer.from(bytes).toString('base64');
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

export function fromBase64Url(encoded: string): Uint8Array {
  const base64 = encoded.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
  const binary =
    typeof globalThis.atob === 'function'
      ? globalThis.atob(padded)
      : Buffer.from(padded, 'base64').toString('binary');
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

export function deriveSessionKey(
  sessionId: string,
  receiverAddress: string,
  purpose: QrCryptoPurpose,
): Uint8Array {
  const prefix = purpose === 'payment' ? KEY_PREFIX_PAYMENT : KEY_PREFIX_PROOF;
  const material = `${prefix}${sessionId}:${normalizeReceiverAddress(receiverAddress)}`;
  return sha256(utf8ToBytes(material));
}

function stableAadBytes(aad: Record<string, unknown>): Uint8Array {
  return utf8ToBytes(JSON.stringify(aad));
}

async function randomNonce(): Promise<Uint8Array> {
  return Crypto.getRandomBytesAsync(GCM_NONCE_BYTES);
}

export async function encryptJson(params: {
  sessionId: string;
  receiverAddress: string;
  purpose: QrCryptoPurpose;
  plaintext: Record<string, unknown>;
  aad: Record<string, unknown>;
}): Promise<{ nonce: string; ciphertext: string }> {
  const key = deriveSessionKey(params.sessionId, params.receiverAddress, params.purpose);
  const nonce = await randomNonce();
  const plaintextBytes = utf8ToBytes(JSON.stringify(params.plaintext));
  const aes = gcm(key, nonce, stableAadBytes(params.aad));
  const sealed = aes.encrypt(plaintextBytes);

  return {
    nonce: toBase64Url(nonce),
    ciphertext: toBase64Url(sealed),
  };
}

export function decryptJson<T extends Record<string, unknown>>(params: {
  sessionId: string;
  receiverAddress: string;
  purpose: QrCryptoPurpose;
  nonce: string;
  ciphertext: string;
  aad: Record<string, unknown>;
}): T | null {
  try {
    const key = deriveSessionKey(params.sessionId, params.receiverAddress, params.purpose);
    const nonce = fromBase64Url(params.nonce);
    const ciphertext = fromBase64Url(params.ciphertext);
    const aes = gcm(key, nonce, stableAadBytes(params.aad));
    const plain = aes.decrypt(ciphertext);
    const parsed = JSON.parse(bytesToUtf8(plain)) as unknown;
    if (typeof parsed !== 'object' || parsed === null) {
      return null;
    }
    return parsed as T;
  } catch {
    return null;
  }
}
