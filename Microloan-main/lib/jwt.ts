import { SignJWT, jwtVerify } from 'jose';

export const SESSION_COOKIE_NAME = 'microloan_session';

function getSecret() {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error('SESSION_SECRET is not set.');
  return new TextEncoder().encode(secret);
}

export type SessionPayload = {
  adminId: number;
  name: string;
  email: string;
  role: string;
};

export async function signSessionToken(payload: SessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(getSecret());
}

export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}
