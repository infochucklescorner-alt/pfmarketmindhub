// Server-only helpers for encrypting MT5 credentials at rest.
// The encryption key is supplied by the caller (read from env inside a
// server-function handler) — this module never touches process.env itself.

export async function encryptMt5Password(
  plaintext: string,
  secret: string,
): Promise<string> {
  const keyMaterial = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(secret),
  );
  const key = await crypto.subtle.importKey(
    "raw",
    keyMaterial,
    { name: "AES-GCM" },
    false,
    ["encrypt"],
  );
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    new TextEncoder().encode(plaintext),
  );
  const out = new Uint8Array(iv.length + ciphertext.byteLength);
  out.set(iv, 0);
  out.set(new Uint8Array(ciphertext), iv.length);
  let binary = "";
  for (const byte of out) binary += String.fromCharCode(byte);
  return btoa(binary);
}
