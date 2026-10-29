import { sql } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { ensureContactsTable, listContacts } from '@/lib/shareConfig';

export const dynamic = 'force-dynamic';

/** Saved share contacts (name + Telegram chat id and/or e-mail). Admin only. */
export async function GET() {
  const session = await getSession();
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  return Response.json({ contacts: await listContacts() });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  let b: any;
  try { b = await request.json(); } catch { return Response.json({ error: 'Bad request.' }, { status: 400 }); }
  try {
    await ensureContactsTable();
    if (b.action === 'add') {
      const name = String(b.name || '').trim().slice(0, 80);
      const chat = String(b.telegram_chat_id || '').trim();
      const email = String(b.email || '').trim();
      if (!name) return Response.json({ error: 'Enter a name.' }, { status: 400 });
      if (!chat && !email) return Response.json({ error: 'Enter a Telegram chat ID or an email.' }, { status: 400 });
      if (chat && !/^-?\d+$/.test(chat)) return Response.json({ error: 'Chat ID must be a number.' }, { status: 400 });
      if (email && !/^[^\s@,;<>"]+@[^\s@,;<>"]+\.[^\s@,;<>"]+$/.test(email)) return Response.json({ error: 'That email address is not valid.' }, { status: 400 });
      await sql`INSERT INTO share_contacts (name, telegram_chat_id, email) VALUES (${name}, ${chat}, ${email})`;
      return Response.json({ ok: true, contacts: await listContacts() });
    }
    if (b.action === 'delete') {
      await sql`DELETE FROM share_contacts WHERE id = ${Number(b.id) || 0}`;
      return Response.json({ ok: true, contacts: await listContacts() });
    }
    return Response.json({ error: 'Unknown action.' }, { status: 400 });
  } catch (e: any) {
    return Response.json({ error: String(e?.message || 'Failed.') }, { status: 500 });
  }
}
