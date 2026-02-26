export interface PasswordOptions {
  length: number;
  uppercase: boolean;
  lowercase: boolean;
  numbers: boolean;
  symbols: boolean;
}

const CHARS = {
  lowercase: 'abcdefghijklmnopqrstuvwxyz',
  uppercase: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  numbers: '0123456789',
  symbols: '!@#$%^&*()_+-=[]{}|;:,.<>?',
};

export const DEFAULT_OPTIONS: PasswordOptions = {
  length: 16,
  uppercase: true,
  lowercase: true,
  numbers: true,
  symbols: true,
};

export function generatePassword(options: PasswordOptions = DEFAULT_OPTIONS): string {
  let available = '';
  if (options.lowercase) available += CHARS.lowercase;
  if (options.uppercase) available += CHARS.uppercase;
  if (options.numbers) available += CHARS.numbers;
  if (options.symbols) available += CHARS.symbols;

  if (available.length === 0) available = CHARS.lowercase;

  const array = new Uint32Array(options.length);
  crypto.getRandomValues(array);

  let password = '';
  for (let i = 0; i < options.length; i++) {
    password += available[array[i] % available.length];
  }

  return password;
}
