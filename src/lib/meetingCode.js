const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function makeMeetingCode(length = 7) {
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  let out = '';
  for (let i = 0; i < length; i++) {
    out += ALPHABET[bytes[i] % ALPHABET.length];
  }
  return out;
}

export function sanitizeMeetingCode(input) {
  return String(input || '')
    .toUpperCase()
    .replace(/[^A-Z0-9-]/g, '')
    .slice(0, 32);
}
