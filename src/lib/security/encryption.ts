export class EncryptionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'EncryptionError';
  }
}

export async function deriveKey(password: string, salt: string): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: encoder.encode(salt),
      iterations: 100000,
      hash: 'SHA-256'
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

export async function generateSalt(): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(salt)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function encrypt(data: string, key: string, salt: string): Promise<string> {
  try {
    const iv = crypto.getRandomValues(new Uint8Array(16));
    const derivedKey = await deriveKey(key, salt);
    const encoder = new TextEncoder();
    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      derivedKey,
      encoder.encode(data)
    );

    return JSON.stringify({
      iv: Array.from(iv),
      encrypted: Array.from(new Uint8Array(encrypted))
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    throw new EncryptionError(`Encryption failed: ${errorMessage}`);
  }
}

export async function decrypt(encryptedData: string, key: string, salt: string): Promise<string> {
  try {
    const { iv, encrypted } = JSON.parse(encryptedData);
    const derivedKey = await deriveKey(key, salt);
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: new Uint8Array(iv) },
      derivedKey,
      new Uint8Array(encrypted)
    );

    return new TextDecoder().decode(decrypted);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    throw new EncryptionError(`Decryption failed: ${errorMessage}`);
  }
}
