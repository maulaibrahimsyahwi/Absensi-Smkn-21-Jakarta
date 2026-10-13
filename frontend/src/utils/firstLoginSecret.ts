/**
 * In-memory stash untuk kata sandi default pada saat login pertama kali.
 * Digunakan sementara oleh OnboardingGate agar pengguna tidak perlu mengetik ulang
 * kata sandi bawaan (NIS/NIP) yang baru saja mereka input di form login.
 *
 * PERHATIAN:
 * HANYA disimpan di memori runtime JavaScript!
 * TIDAK PERNAH disimpan di localStorage, sessionStorage, Cookie, maupun IndexedDB
 * demi mematuhi prinsip perlindungan privasi UU PDP.
 */

let _inMemorySecret: string | null = null;

export const stashFirstLoginSecret = (secret: string | null): void => {
  _inMemorySecret = secret ? secret.trim() : null;
};

export const peekFirstLoginSecret = (): string | null => {
  return _inMemorySecret;
};

export const consumeFirstLoginSecret = (): string | null => {
  const secret = _inMemorySecret;
  _inMemorySecret = null;
  return secret;
};

export const clearFirstLoginSecret = (): void => {
  _inMemorySecret = null;
};

