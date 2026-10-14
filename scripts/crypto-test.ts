import nacl from "tweetnacl";
import {
  encryptFile,
  decryptFile,
  sha256,
  wrapKeyFor,
  unwrapKey,
} from "../app/lib/crypto.ts";

async function runCryptoTest() {
  try {
    console.log("Starting crypto test...");

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

    // 4. Test Key Wrapping (Ed25519 -> Curve25519 -> nacl.box)
    const doctorKeypair = nacl.sign.keyPair(); // Ed25519 keypair
    const wrapped = wrapKeyFor(doctorKeypair.publicKey, rawKey);
    if (wrapped.length > 128) {
      throw new Error(`Wrapped key exceeds 128 bytes: ${wrapped.length}`);
    }
    console.log(`✓ Key wrapping succeeded (${wrapped.length} bytes <= 128 bytes)`);

    // 5. Test Key Unwrapping
    const unwrappedKey = unwrapKey(wrapped, doctorKeypair.secretKey);
    if (unwrappedKey.length !== 32) {
      throw new Error(`Unwrapped key length mismatch: expected 32, got ${unwrappedKey.length}`);
    }
    for (let i = 0; i < 32; i++) {
      if (unwrappedKey[i] !== rawKey[i]) {
        throw new Error(`Unwrapped key byte ${i} mismatch`);
      }
    }
    console.log("✓ Key unwrapping succeeded and matches original rawKey");

    // 6. Decrypt file using unwrapped key
    const decryptedWithUnwrappedKey = await decryptFile(cipher, unwrappedKey);
    if (new TextDecoder().decode(decryptedWithUnwrappedKey) !== new TextDecoder().decode(sampleData)) {
      throw new Error("Decryption with unwrapped key failed to match original data");
    }
    console.log("✓ Decryption with unwrapped key succeeded");

    // 7. Tamper verification: Flip one ciphertext byte and confirm decryption throws
    let decryptionFailedAsExpected = false;
    const tamperedCipher = new Uint8Array(cipher);
    // Flip a bit in the encrypted body (after 12-byte IV)
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

    // 8. Tamper verification on wrapped key: Flip one byte in wrapped key and confirm unwrap throws
    let unwrapFailedAsExpected = false;
    const tamperedWrapped = new Uint8Array(wrapped);
    tamperedWrapped[60] ^= 0x01;
    try {
      unwrapKey(tamperedWrapped, doctorKeypair.secretKey);
    } catch {
      unwrapFailedAsExpected = true;
    }

    if (!unwrapFailedAsExpected) {
      throw new Error("Tampered wrapped key did NOT throw an error during unwrapping!");
    }
    console.log("✓ Tampered wrapped key correctly rejected by nacl.box.open");

    console.log("\nPASS");
  } catch (err) {
    console.error("\nFAIL:", err);
    process.exit(1);
  }
}

runCryptoTest();
