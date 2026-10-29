import { SESSION_COOKIE_NAME } from '@/lib/jwt';

export const dynamic = 'force-dynamic';

/** Signs out: expires the session cookie with exactly the attributes it was created with, so every browser drops it. */
export async function POST() {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: {
      'content-type': 'application/json',
      'cache-control': 'no-store',
      'set-cookie': `${SESSION_COOKIE_NAME}=; Path=/; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; SameSite=Lax${secure}`,
    },
  });
}
