import nacl from "tweetnacl";

/**
 * Deterministic message for deriving SolHealth encryption keypair from wallet signature.
 * NEVER CHANGE THIS STRING: changing it changes every user's derived encryption key.
 */
export const ENCRYPTION_MESSAGE =
  "SolHealth encryption key (v1)\n\nSign this message to create your private encryption key for SolHealth.\nThis does not send a transaction and costs no SOL.\nOnly sign it on the official SolHealth website.";

/**
 * Access the WebCrypto API in a browser-safe, cross-platform manner
 * without importing Node.js 'crypto'.
 */
function getWebCrypto(): Crypto {
  if (typeof globalThis !== "undefined" && globalThis.crypto) {
    return globalThis.crypto;
  }
  if (typeof window !== "undefined" && window.crypto) {
    return window.crypto;
  }
  throw new Error("WebCrypto is not supported in this runtime environment");
}

/**
 * Compute SHA-256 digest of input bytes using WebCrypto.
 *
 * @param bytes - Input byte array
 * @returns 32-byte hash
 */
export async function sha256(bytes: Uint8Array): Promise<Uint8Array> {
  const cryptoObj = getWebCrypto();
  const hashBuffer = await cryptoObj.subtle.digest(
    "SHA-256",
    bytes as unknown as BufferSource
  );
  return new Uint8Array(hashBuffer);
}

/**
 * Derive an X25519 encryption keypair from a wallet signature of ENCRYPTION_MESSAGE.
 * seed = SHA-256("SolHealth/encryption-key/v1" bytes || signature)
 *
 * @param signature - 64-byte Ed25519 signature of ENCRYPTION_MESSAGE
 * @returns nacl.BoxKeyPair with 32-byte publicKey and 32-byte secretKey
 */
export async function deriveEncryptionKeypair(
  signature: Uint8Array
): Promise<nacl.BoxKeyPair> {
  const prefix = new TextEncoder().encode("SolHealth/encryption-key/v1");
  const payload = new Uint8Array(prefix.length + signature.length);
  payload.set(prefix, 0);
  payload.set(signature, prefix.length);

  const seed = await sha256(payload);
  return nacl.box.keyPair.fromSecretKey(seed);
}

/**
 * Derive an X25519 encryption keypair directly from an Ed25519 secret key
 * (used by test scripts and demo mode keypairs).
 *
 * @param secretKey - 64-byte Ed25519 keypair secret key
 * @returns nacl.BoxKeyPair
 */
export async function deriveKeypairFromSecret(
  secretKey: Uint8Array
): Promise<nacl.BoxKeyPair> {
  const messageBytes = new TextEncoder().encode(ENCRYPTION_MESSAGE);
  const sig = nacl.sign.detached(messageBytes, secretKey);
  return deriveEncryptionKeypair(sig);
}

/**
 * Encrypt arbitrary data using AES-256-GCM with a fresh random 256-bit key
 * and a fresh random 12-byte IV prepended to the ciphertext.
 *
 * @param data - Raw file bytes to encrypt
 * @returns { cipher: Uint8Array, rawKey: Uint8Array } - Prepend: IV(12) + ciphertext + tag(16)
 */
export async function encryptFile(
  data: Uint8Array
): Promise<{ cipher: Uint8Array; rawKey: Uint8Array }> {
  const cryptoObj = getWebCrypto();
  const rawKey = cryptoObj.getRandomValues(new Uint8Array(32));
  const iv = cryptoObj.getRandomValues(new Uint8Array(12));

  const cryptoKey = await cryptoObj.subtle.importKey(
    "raw",
    rawKey as unknown as BufferSource,
    { name: "AES-GCM" },
    false,
    ["encrypt"]
  );

  const encryptedBuffer = await cryptoObj.subtle.encrypt(
    { name: "AES-GCM", iv: iv as unknown as BufferSource },
    cryptoKey,
    data as unknown as BufferSource
  );

  const encryptedBytes = new Uint8Array(encryptedBuffer);
  const cipher = new Uint8Array(iv.length + encryptedBytes.length);
  cipher.set(iv, 0);
  cipher.set(encryptedBytes, iv.length);

  return { cipher, rawKey };
}

/**
 * Decrypt file data encrypted with AES-256-GCM.
 *
 * @param cipher - IV(12) + ciphertext + tag(16)
 * @param rawKey - 32-byte AES key
 * @returns Decrypted plain bytes
 */
export async function decryptFile(
  cipher: Uint8Array,
  rawKey: Uint8Array
): Promise<Uint8Array> {
  if (cipher.length < 12 + 16) {
    throw new Error(
      "Ciphertext too short: must contain at least 12-byte IV and 16-byte auth tag"
    );
  }

  const cryptoObj = getWebCrypto();
  const iv = cipher.slice(0, 12);
  const encryptedBytes = cipher.slice(12);

  const cryptoKey = await cryptoObj.subtle.importKey(
    "raw",
    rawKey as unknown as BufferSource,
    { name: "AES-GCM" },
    false,
    ["decrypt"]
  );

  const decryptedBuffer = await cryptoObj.subtle.decrypt(
    { name: "AES-GCM", iv: iv as unknown as BufferSource },
    cryptoKey,
    encryptedBytes as unknown as BufferSource
  );

  return new Uint8Array(decryptedBuffer);
}

/**
 * Wrap a symmetric AES key for a recipient's 32-byte X25519 public key using
 * ephemeral Curve25519 nacl.box encryption.
 *
 * Output layout: ephemeralPub(32) + nonce(24) + box(48) = 104 bytes (<= 128 bytes limit).
 *
 * @param recipientPublic32 - 32-byte X25519 public key
 * @param rawKey - 32-byte symmetric AES key to wrap
 * @returns Wrapped key bytes (104 bytes, <= 128 bytes limit)
 */
export function wrapKeyForX25519(
  recipientPublic32: Uint8Array,
  rawKey: Uint8Array
): Uint8Array {
  if (recipientPublic32.length !== 32) {
    throw new Error(
      `Recipient X25519 public key must be exactly 32 bytes, got ${recipientPublic32.length}`
    );
  }

  const ephemeral = nacl.box.keyPair();
  const nonce = nacl.randomBytes(nacl.box.nonceLength); // 24 bytes

  const boxed = nacl.box(rawKey, nonce, recipientPublic32, ephemeral.secretKey);

  const totalLength = 32 + 24 + boxed.length;
  if (totalLength > 128) {
    throw new Error(`Wrapped key exceeds 128-byte limit (was ${totalLength} bytes)`);
  }

  const wrapped = new Uint8Array(totalLength);
  wrapped.set(ephemeral.publicKey, 0);
  wrapped.set(nonce, 32);
  wrapped.set(boxed, 56);

  return wrapped;
}

/**
 * Unwrap a key wrapped with wrapKeyForX25519 using recipient's 32-byte X25519 secret key.
 *
 * @param wrapped - ephemeralPub(32) + nonce(24) + box
 * @param secret32 - 32-byte X25519 secret key
 * @returns 32-byte raw symmetric AES key
 */
export function unwrapKeyX25519(
  wrapped: Uint8Array,
  secret32: Uint8Array
): Uint8Array {
  if (wrapped.length < 56) {
    throw new Error("Wrapped key buffer too short: expected at least 56 bytes");
  }
  if (secret32.length !== 32) {
    throw new Error(
      `Recipient X25519 secret key must be exactly 32 bytes, got ${secret32.length}`
    );
  }

  const ephemeralPub = wrapped.slice(0, 32);
  const nonce = wrapped.slice(32, 56);
  const boxed = wrapped.slice(56);

  const unboxed = nacl.box.open(boxed, nonce, ephemeralPub, secret32);
  if (!unboxed) {
    throw new Error("Failed to unwrap key: authentication failed or wrong key");
  }

  return unboxed;
}

// Aliases for compatibility
export const wrapKeyFor = wrapKeyForX25519;
export const unwrapKey = unwrapKeyX25519;
