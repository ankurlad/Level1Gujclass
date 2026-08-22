// The parent passcode, as stored.
//
// The gate is a speed bump, not security (prd.md says as much), but a parent
// picks a 4-digit PIN they probably use elsewhere, and v0 kept it in cleartext
// under `guj_parent_pin` — visible in devtools, in any storage dump, and to
// every other script on the origin. What lands on disk now is a salted SHA-256
// digest plus the salt that produced it; the PIN itself is never written.
//
// Salting is per install, not per site-wide constant, so two devices with the
// same PIN do not share a digest and a precomputed table of the 10,000
// possible PINs has to be rebuilt for each one. Against a local attacker with
// the storage in hand that buys very little — 10,000 SHA-256s is instant — and
// it is not meant to. It removes the cleartext, which is the actual defect.

const LEGACY_PIN_KEY = 'guj_parent_pin';
const ALGORITHM = 'SHA-256';
const SALT_BYTES = 16;

// crypto.subtle only exists in a secure context: https, or localhost for the
// dev server. Both of the ways this app is meant to run qualify; serving the
// built app over plain http on a LAN address does not, and there the callers
// have to surface a failure rather than silently fall back to something weaker.
const digest = (bytes) => {
  const webCrypto = globalThis.crypto;
  if (!webCrypto?.subtle) {
    throw new Error('crypto.subtle is unavailable — hashing the parent passcode needs a secure context (https or localhost).');
  }
  return webCrypto.subtle.digest(ALGORITHM, bytes);
};

const toHex = (bytes) => Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');

export const randomSalt = () => {
  const bytes = new Uint8Array(SALT_BYTES);
  globalThis.crypto.getRandomValues(bytes);
  return toHex(bytes);
};

export async function hashPin(pin, salt) {
  const bytes = new TextEncoder().encode(`${salt}:${pin}`);
  return toHex(new Uint8Array(await digest(bytes)));
}

// What gets stored: the algorithm is recorded so a future change of it can be
// told apart from a stale digest instead of just failing to verify.
export async function createPinRecord(pin) {
  const salt = randomSalt();
  return { algorithm: ALGORITHM, salt, hash: await hashPin(pin, salt) };
}

export async function verifyPin(pin, record) {
  if (!record?.salt || !record?.hash) return false;
  return (await hashPin(pin, record.salt)) === record.hash;
}

// The synchronous half of the v0 -> v1 PIN migration: lifts the cleartext PIN
// out of storage and deletes it in the same turn it is found, so nothing can
// read or re-persist the plaintext while the digest is being computed. Returns
// null when there is nothing to migrate, which is every run after the first.
export function takeLegacyPlaintextPin() {
  try {
    const store = globalThis.localStorage;
    const plaintext = store?.getItem(LEGACY_PIN_KEY) ?? null;
    if (plaintext !== null) store.removeItem(LEGACY_PIN_KEY);
    return plaintext;
  } catch (e) {
    console.error('Could not read the legacy parent passcode', e);
    return null;
  }
}
