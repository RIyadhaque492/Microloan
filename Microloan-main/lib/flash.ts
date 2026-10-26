import { cookies } from 'next/headers';

/** Queues a pop-up message ("Saved", "Deleted"...) that the next page shows as a toast. Call before redirect(). */
export function setFlash(message: string, type: 'success' | 'error' | 'info' = 'success') {
  try {
    cookies().set('flash', encodeURIComponent(JSON.stringify({ m: message, t: type, id: Date.now() })), {
      path: '/',
      maxAge: 30,
      sameSite: 'lax',
    });
  } catch {
    // not in a request context — nothing to show
  }
}
