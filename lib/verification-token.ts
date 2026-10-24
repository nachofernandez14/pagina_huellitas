import { createHmac, timingSafeEqual } from 'node:crypto';

const SECRET = process.env.CLAVE_SECRETA;
const EXPIRY_MS = 24 * 60 * 60 * 1000;

export function createVerificationToken(userId: string, email: string): string {
  if (!SECRET || SECRET.length < 32) {
    throw new Error('CLAVE_SECRETA must be configured with at least 32 characters');
  }
  const payload = `${userId}:${email.toLowerCase()}:${Date.now()}`;
  const hmac = createHmac('sha256', SECRET).update(payload).digest('hex');
  const encoded = Buffer.from(payload).toString('base64url');
  return `${encoded}.${hmac}`;
}

export function verifyVerificationToken(token: string): { userId: string; email: string } | null {
  if (!SECRET || SECRET.length < 32 || token.length > 2048) return null;
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

  const expected = createHmac('sha256', SECRET).update(payload).digest();
  const received = Buffer.from(sig, 'hex');
  if (received.length !== expected.length || !timingSafeEqual(received, expected)) return null;

  const parts = payload.split(':');
  if (parts.length !== 3) return null;

  const [userId, email, ts] = parts;
  if (!userId || !email || !/^\d+$/.test(ts)) return null;
  const age = Date.now() - Number(ts);
  if (age > EXPIRY_MS || age < 0) return null;

  return { userId, email };
}
