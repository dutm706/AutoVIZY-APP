import crypto from 'node:crypto';

function key() {
  const raw = process.env.TOKEN_ENCRYPTION_KEY;
  if (!raw) throw new Error('Thiếu TOKEN_ENCRYPTION_KEY.');
  const decoded = Buffer.from(raw, 'base64');
  if (decoded.length !== 32) throw new Error('TOKEN_ENCRYPTION_KEY phải là base64 của 32 bytes.');
  return decoded;
}

export function encryptSecret(value: string) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key(), iv);
  const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString('base64');
}

export function decryptSecret(payload: string) {
  const packed = Buffer.from(payload, 'base64');
  const iv = packed.subarray(0, 12);
  const tag = packed.subarray(12, 28);
  const encrypted = packed.subarray(28);
  const decipher = crypto.createDecipheriv('aes-256-gcm', key(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');
}

export function randomState() {
  return crypto.randomBytes(32).toString('hex');
}
