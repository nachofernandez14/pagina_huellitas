import { createHmac } from 'node:crypto';

const SECRET = process.env.CLAVE_SECRETA!;
const EXPIRY_MS = 24 * 60 * 60 * 1000;

export function createVerificationToken(userId: string, email: string): string {
  const payload = `${userId}:${email.toLowerCase()}:${Date.now()}`;
  const hmac = createHmac('sha256', SECRET).update(payload).digest('hex');
  const encoded = Buffer.from(payload).toString('base64url');
  return `${encoded}.${hmac}`;
}

export function verifyVerificationToken(token: string): { userId: string; email: string } | null {
  const dot = token.lastIndexOf('.');
  if (dot === -1) return null;

  const encoded = token.slice(0, dot);
  const sig = token.slice(dot + 1);

  let payload: string;
  try {
    payload = Buffer.from(encoded, 'base64url').toString();
  } catch {
    return null;
  }

  const expected = createHmac('sha256', SECRET).update(payload).digest('hex');
  if (sig !== expected) return null;

  const parts = payload.split(':');
  if (parts.length !== 3) return null;

  const [userId, email, ts] = parts;
  const age = Date.now() - Number(ts);
  if (age > EXPIRY_MS || age < 0) return null;

  return { userId, email };
}
