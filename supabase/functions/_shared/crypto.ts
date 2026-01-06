// AES-256-GCM encryption utilities for HubSpot tokens
// This module provides encrypt/decrypt functions for securing OAuth tokens at rest

const ALGORITHM = 'AES-GCM';
const IV_LENGTH = 12; // 96 bits for GCM (recommended by NIST)

/**
 * Get the encryption key from environment variable
 * Key must be a 32-byte (256-bit) value encoded as base64
 */
async function getEncryptionKey(): Promise<CryptoKey> {
  const keyBase64 = Deno.env.get('HUBSPOT_TOKEN_ENCRYPTION_KEY');
  if (!keyBase64) {
    throw new Error('HUBSPOT_TOKEN_ENCRYPTION_KEY not configured');
  }

  // Decode base64 to raw bytes
  const keyBytes = Uint8Array.from(atob(keyBase64), (c) => c.charCodeAt(0));
  
  if (keyBytes.length !== 32) {
    throw new Error(`Invalid encryption key length: expected 32 bytes, got ${keyBytes.length}`);
  }

  return await crypto.subtle.importKey(
    'raw',
    keyBytes,
    { name: ALGORITHM },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypt a plaintext token using AES-256-GCM
 * Returns a base64-encoded string containing IV + ciphertext
 */
export async function encryptToken(plaintext: string): Promise<string> {
  const key = await getEncryptionKey();
  
  // Generate random IV for each encryption
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  
  // Encode plaintext to bytes
  const encoded = new TextEncoder().encode(plaintext);
  
  // Encrypt
  const ciphertext = await crypto.subtle.encrypt(
    { name: ALGORITHM, iv },
    key,
    encoded
  );
  
  // Combine IV + ciphertext into single array
  const combined = new Uint8Array(iv.length + ciphertext.byteLength);
  combined.set(iv);
  combined.set(new Uint8Array(ciphertext), iv.length);
  
  // Encode as base64 for storage
  return btoa(String.fromCharCode(...combined));
}

/**
 * Decrypt an encrypted token
 * Input should be a base64-encoded string containing IV + ciphertext
 */
export async function decryptToken(encrypted: string): Promise<string> {
  const key = await getEncryptionKey();
  
  // Decode from base64
  const combined = Uint8Array.from(atob(encrypted), (c) => c.charCodeAt(0));
  
  // Extract IV and ciphertext
  const iv = combined.slice(0, IV_LENGTH);
  const ciphertext = combined.slice(IV_LENGTH);
  
  // Decrypt
  const decrypted = await crypto.subtle.decrypt(
    { name: ALGORITHM, iv },
    key,
    ciphertext
  );
  
  // Decode to string
  return new TextDecoder().decode(decrypted);
}

/**
 * Check if a token value appears to be encrypted (base64 with expected length)
 * This is used during the migration period to handle both encrypted and plaintext tokens
 */
export function isEncryptedToken(value: string): boolean {
  // Encrypted tokens are base64 encoded and will be longer than typical JWT tokens
  // A rough heuristic: encrypted tokens have IV (12 bytes) + ciphertext + auth tag (16 bytes)
  // So even a short token becomes much longer when encrypted
  try {
    const decoded = atob(value);
    // Check if it starts with what looks like random bytes (IV) rather than JWT header
    // JWT tokens start with "eyJ" (base64 for '{"')
    return decoded.length > IV_LENGTH && !value.startsWith('eyJ');
  } catch {
    return false;
  }
}
