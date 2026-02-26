import CryptoJS from 'crypto-js';

const PBKDF2_ITERATIONS = 10000;
const VERIFY_TOKEN = 'VAULT_VERIFY';

export function generateSalt(): string {
  return CryptoJS.lib.WordArray.random(16).toString(CryptoJS.enc.Base64);
}

export function deriveKey(masterPassword: string, saltBase64: string): string {
  const salt = CryptoJS.enc.Base64.parse(saltBase64);
  const key = CryptoJS.PBKDF2(masterPassword, salt, {
    keySize: 256 / 32,
    iterations: PBKDF2_ITERATIONS,
    hasher: CryptoJS.algo.SHA256,
  });
  return key.toString(CryptoJS.enc.Hex);
}

export function encrypt(plaintext: string, keyHex: string): string {
  const iv = CryptoJS.lib.WordArray.random(16);
  const encrypted = CryptoJS.AES.encrypt(plaintext, CryptoJS.enc.Hex.parse(keyHex), {
    iv,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7,
  });
  // Combine IV + ciphertext → base64
  const combined = iv.concat(encrypted.ciphertext);
  return combined.toString(CryptoJS.enc.Base64);
}

export function decrypt(blob: string, keyHex: string): string {
  const combined = CryptoJS.enc.Base64.parse(blob);
  // First 4 words (16 bytes) = IV
  const iv = CryptoJS.lib.WordArray.create(combined.words.slice(0, 4), 16);
  const ciphertext = CryptoJS.lib.WordArray.create(
    combined.words.slice(4),
    combined.sigBytes - 16
  );

  const decrypted = CryptoJS.AES.decrypt(
    CryptoJS.lib.CipherParams.create({ ciphertext }),
    CryptoJS.enc.Hex.parse(keyHex),
    { iv, mode: CryptoJS.mode.CBC, padding: CryptoJS.pad.Pkcs7 }
  );
  return decrypted.toString(CryptoJS.enc.Utf8);
}

export function createVerification(keyHex: string): string {
  return encrypt(VERIFY_TOKEN, keyHex);
}

export function verifyMasterPassword(keyHex: string, blob: string): boolean {
  try {
    const result = decrypt(blob, keyHex);
    return result === VERIFY_TOKEN;
  } catch {
    return false;
  }
}
