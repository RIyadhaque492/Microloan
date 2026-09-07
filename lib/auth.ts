import { cookies } from 'next/headers';
import { signSessionToken, verifySessionToken, SESSION_COOKIE_NAME, SessionPayload } from './jwt';

export type { SessionPayload };

export async function createSession(payload: SessionPayload) {
  const token = await signSessionToken(payload);
  cookies().set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function destroySession() {
  cookies().delete(SESSION_COOKIE_NAME);
}

export async function getSession(): Promise<SessionPayload | null> {
  const token = cookies().get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}
