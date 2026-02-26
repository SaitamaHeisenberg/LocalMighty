import CryptoJS from 'crypto-js';

const BASE32_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

function base32ToBytes(encoded: string): number[] {
  const cleaned = encoded.replace(/[\s=_-]/g, '').toUpperCase();
  const bits: number[] = [];

  for (const char of cleaned) {
    const val = BASE32_CHARS.indexOf(char);
    if (val === -1) continue;
    for (let i = 4; i >= 0; i--) {
      bits.push((val >> i) & 1);
    }
  }

  const bytes: number[] = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    let byte = 0;
    for (let j = 0; j < 8; j++) {
      byte = (byte << 1) | bits[i + j];
    }
    bytes.push(byte);
  }
  return bytes;
}

function intToBytes(num: number): number[] {
  const bytes = new Array(8).fill(0);
  for (let i = 7; i >= 0; i--) {
    bytes[i] = num & 0xff;
    num = Math.floor(num / 256);
  }
  return bytes;
}

function bytesToWordArray(bytes: number[]): CryptoJS.lib.WordArray {
  const words: number[] = [];
  for (let i = 0; i < bytes.length; i += 4) {
    words.push(
      ((bytes[i] || 0) << 24) |
      ((bytes[i + 1] || 0) << 16) |
      ((bytes[i + 2] || 0) << 8) |
      (bytes[i + 3] || 0)
    );
  }
  return CryptoJS.lib.WordArray.create(words, bytes.length);
}

function wordArrayToBytes(wa: CryptoJS.lib.WordArray): number[] {
  const bytes: number[] = [];
  for (let i = 0; i < wa.sigBytes; i++) {
    bytes.push((wa.words[i >>> 2] >>> (24 - (i % 4) * 8)) & 0xff);
  }
  return bytes;
}

export function generateTOTP(secret: string, period = 30, digits = 6): string {
  const secretBytes = base32ToBytes(secret);
  const counter = Math.floor(Date.now() / 1000 / period);
  const counterBytes = intToBytes(counter);

  const keyWA = bytesToWordArray(secretBytes);
  const msgWA = bytesToWordArray(counterBytes);

  const hmac = CryptoJS.HmacSHA1(msgWA, keyWA);
  const hmacBytes = wordArrayToBytes(hmac);

  // Dynamic truncation (RFC 4226)
  const offset = hmacBytes[hmacBytes.length - 1] & 0x0f;
  const code =
    (((hmacBytes[offset] & 0x7f) << 24) |
      ((hmacBytes[offset + 1] & 0xff) << 16) |
      ((hmacBytes[offset + 2] & 0xff) << 8) |
      (hmacBytes[offset + 3] & 0xff)) %
    Math.pow(10, digits);

  return code.toString().padStart(digits, '0');
}

export function getTimeRemaining(period = 30): number {
  return period - (Math.floor(Date.now() / 1000) % period);
}

export function isValidBase32(secret: string): boolean {
  const cleaned = secret.replace(/[\s=_-]/g, '').toUpperCase();
  return cleaned.length >= 16 && /^[A-Z2-7]+$/.test(cleaned);
}
