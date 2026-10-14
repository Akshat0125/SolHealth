import nacl from "tweetnacl";
import ed2curvePkg from "ed2curve";

// Ensure compatibility across ESM (Next.js/Node) and CJS environments
const ed2curve = (ed2curvePkg as any)?.default || ed2curvePkg;

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
    throw new Error("Ciphertext too short: must contain at least 12-byte IV and 16-byte auth tag");
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
 * Wrap a symmetric AES key for a recipient's Ed25519 public key using
 * ephemeral Curve25519 nacl.box encryption.
 *
 * Output layout: ephemeralPub(32) + nonce(24) + box(48) = 104 bytes (<= 128 bytes limit).
 *
 * @param recipientEd25519Pub - 32-byte Ed25519 public key
 * @param rawKey - 32-byte symmetric AES key to wrap
 * @returns Wrapped key bytes (<= 128 bytes)
 */
export function wrapKeyFor(
  recipientEd25519Pub: Uint8Array | { toBytes: () => Uint8Array },
  rawKey: Uint8Array
): Uint8Array {
  const pubBytes =
    recipientEd25519Pub &&
    typeof (recipientEd25519Pub as any).toBytes === "function"
      ? (recipientEd25519Pub as any).toBytes()
      : (recipientEd25519Pub as Uint8Array);

  const recipientCurve25519Pub = ed2curve.convertPublicKey(pubBytes);
  if (!recipientCurve25519Pub) {
    throw new Error("Failed to convert recipient Ed25519 public key to Curve25519");
  }

  const ephemeral = nacl.box.keyPair();
  const nonce = nacl.randomBytes(nacl.box.nonceLength); // 24 bytes

  const boxed = nacl.box(rawKey, nonce, recipientCurve25519Pub, ephemeral.secretKey);

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
 * Unwrap a key wrapped with wrapKeyFor using recipient's Ed25519 secret key.
 *
 * @param wrapped - ephemeralPub(32) + nonce(24) + box
 * @param recipientEd25519Secret - 64-byte or 32-byte Ed25519 secret key
 * @returns 32-byte raw symmetric AES key
 */
export function unwrapKey(
  wrapped: Uint8Array,
  recipientEd25519Secret: Uint8Array | { secretKey: Uint8Array }
): Uint8Array {
  if (wrapped.length < 56) {
    throw new Error("Wrapped key buffer too short: expected at least 56 bytes");
  }

  const secBytes =
    recipientEd25519Secret &&
    "secretKey" in (recipientEd25519Secret as any)
      ? (recipientEd25519Secret as any).secretKey
      : (recipientEd25519Secret as Uint8Array);

  const recipientCurve25519Sec = ed2curve.convertSecretKey(secBytes);
  if (!recipientCurve25519Sec) {
    throw new Error("Failed to convert recipient Ed25519 secret key to Curve25519");
  }

  const ephemeralPub = wrapped.slice(0, 32);
  const nonce = wrapped.slice(32, 56);
  const boxed = wrapped.slice(56);

  const unboxed = nacl.box.open(boxed, nonce, ephemeralPub, recipientCurve25519Sec);
  if (!unboxed) {
    throw new Error("Failed to unwrap key: authentication failed or wrong key");
  }

  return unboxed;
}
