import nacl from "tweetnacl";
import {
  encryptFile,
  decryptFile,
  sha256,
  ENCRYPTION_MESSAGE,
  deriveEncryptionKeypair,
  wrapKeyForX25519,
  unwrapKeyX25519,
} from "../app/lib/crypto.ts";

async function runCryptoTest() {
  try {
    console.log("Starting SolHealth crypto test (v1 deterministic signature-derived X25519)...");

    // 1. Test SHA-256
    const sampleData = new TextEncoder().encode(
      "CONFIDENTIAL MEDICAL RECORD: Patient John Doe, BP 120/80, Status: Healthy"
    );
    const hash = await sha256(sampleData);
    if (hash.length !== 32) {
      throw new Error(`SHA-256 output length mismatch: expected 32, got ${hash.length}`);
    }
    console.log("✓ SHA-256 computation succeeded (32 bytes)");

    // 2. Test File Encryption (AES-256-GCM)
    const { cipher, rawKey } = await encryptFile(sampleData);
    if (rawKey.length !== 32) {
      throw new Error(`Raw key length mismatch: expected 32, got ${rawKey.length}`);
    }
    // IV (12) + ciphertext + tag (16)
    if (cipher.length !== 12 + sampleData.length + 16) {
      throw new Error(
        `Cipher length mismatch: expected ${12 + sampleData.length + 16}, got ${cipher.length}`
      );
    }
    console.log(`✓ File encryption succeeded (cipher length: ${cipher.length} bytes, IV prepended)`);

    // 3. Test File Decryption
    const decrypted = await decryptFile(cipher, rawKey);
    const decoded = new TextDecoder().decode(decrypted);
    if (decoded !== new TextDecoder().decode(sampleData)) {
      throw new Error("Decrypted content does not match original plain text");
    }
    console.log("✓ File decryption succeeded and matches original plain text");

    // 4. Test Deterministic Derivation of X25519 Keypair from signature of ENCRYPTION_MESSAGE
    const doctorEd25519 = nacl.sign.keyPair();
    const msgBytes = new TextEncoder().encode(ENCRYPTION_MESSAGE);
    const sig1 = nacl.sign.detached(msgBytes, doctorEd25519.secretKey);
    const sig2 = nacl.sign.detached(msgBytes, doctorEd25519.secretKey);

    const docEnc1 = await deriveEncryptionKeypair(sig1);
    const docEnc2 = await deriveEncryptionKeypair(sig2);

    for (let i = 0; i < 32; i++) {
      if (docEnc1.publicKey[i] !== docEnc2.publicKey[i]) {
        throw new Error("Derivation is non-deterministic: public keys do not match!");
      }
      if (docEnc1.secretKey[i] !== docEnc2.secretKey[i]) {
        throw new Error("Derivation is non-deterministic: secret keys do not match!");
      }
    }
    console.log("✓ Deterministic key derivation verified (same signature -> identical X25519 keypair)");

    // 5. Test Key Wrapping for recipient X25519 public key
    const wrapped = wrapKeyForX25519(docEnc1.publicKey, rawKey);
    if (wrapped.length !== 104) {
      throw new Error(`Wrapped key layout mismatch: expected 104 bytes, got ${wrapped.length}`);
    }
    if (wrapped.length > 128) {
      throw new Error(`Wrapped key exceeds 128 bytes: ${wrapped.length}`);
    }
    console.log(`✓ Key wrapping succeeded (${wrapped.length} bytes: 32 pub + 24 nonce + 48 box)`);

    // 6. Test Key Unwrapping with recipient X25519 secret key
    const unwrappedKey = unwrapKeyX25519(wrapped, docEnc1.secretKey);
    if (unwrappedKey.length !== 32) {
      throw new Error(`Unwrapped key length mismatch: expected 32, got ${unwrappedKey.length}`);
    }
    for (let i = 0; i < 32; i++) {
      if (unwrappedKey[i] !== rawKey[i]) {
        throw new Error(`Unwrapped key byte ${i} mismatch`);
      }
    }
    console.log("✓ Key unwrapping succeeded and matches original rawKey");

    // 7. Decrypt file using unwrapped key
    const decryptedWithUnwrappedKey = await decryptFile(cipher, unwrappedKey);
    if (new TextDecoder().decode(decryptedWithUnwrappedKey) !== new TextDecoder().decode(sampleData)) {
      throw new Error("Decryption with unwrapped key failed to match original data");
    }
    console.log("✓ Decryption with unwrapped key succeeded");

    // 8. Test isolation: Doctor cannot unwrap a key wrapped for another doctor
    const otherDoctorEd25519 = nacl.sign.keyPair();
    const otherSig = nacl.sign.detached(msgBytes, otherDoctorEd25519.secretKey);
    const otherDocEnc = await deriveEncryptionKeypair(otherSig);

    let otherUnwrapFailed = false;
    try {
      unwrapKeyX25519(wrapped, otherDocEnc.secretKey);
    } catch {
      otherUnwrapFailed = true;
    }
    if (!otherUnwrapFailed) {
      throw new Error("SECURITY FAILURE: A different doctor unwrap did NOT throw!");
    }
    console.log("✓ Key isolation verified: a different doctor cannot unwrap another doctor's key");

    // 9. Tamper verification: Flip one ciphertext byte and confirm decryption throws
    let decryptionFailedAsExpected = false;
    const tamperedCipher = new Uint8Array(cipher);
    tamperedCipher[15] ^= 0x01;
    try {
      await decryptFile(tamperedCipher, rawKey);
    } catch {
      decryptionFailedAsExpected = true;
    }
    if (!decryptionFailedAsExpected) {
      throw new Error("Tampered ciphertext did NOT throw an error during decryption!");
    }
    console.log("✓ Tampered ciphertext correctly rejected by AES-GCM tag verification");

    // 10. Tamper verification on wrapped key: Flip one byte in wrapped key and confirm unwrap throws
    let unwrapFailedAsExpected = false;
    const tamperedWrapped = new Uint8Array(wrapped);
    tamperedWrapped[60] ^= 0x01;
    try {
      unwrapKeyX25519(tamperedWrapped, docEnc1.secretKey);
    } catch {
      unwrapFailedAsExpected = true;
    }
    if (!unwrapFailedAsExpected) {
      throw new Error("Tampered wrapped key did NOT throw an error during unwrapping!");
    }
    console.log("✓ Tampered wrapped key correctly rejected by nacl.box.open");

    console.log("\nPASS: ALL CRYPTO CHECKS PASSED!");
  } catch (err) {
    console.error("\nFAIL:", err);
    process.exit(1);
  }
}

runCryptoTest();
