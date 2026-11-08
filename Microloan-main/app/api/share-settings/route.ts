import { sql } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { ensureShareTable, getShareConfig, telegramBase } from '@/lib/shareConfig';

export const dynamic = 'force-dynamic';

/** Share Settings (Telegram bot + email). Admin only. Secrets are write-only: they are never returned. */
export async function GET() {
  const session = await getSession();
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const c = await getShareConfig();
  return Response.json({
    telegram: { hasToken: !!c.telegramToken, chatId: c.telegramChatId },
    email: { user: c.smtpUser, hasPass: !!c.smtpPass },
  });
}

async function tg(token: string, method: string, body?: any) {
  const res = await fetch(`${telegramBase()}/bot${token}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body || {}),
  });
  const json: any = await res.json().catch(() => ({}));
  if (!res.ok || json.ok === false) throw new Error(json.description || `Telegram error ${res.status}`);
  return json.result;
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  let b: any;
  try { b = await request.json(); } catch { return Response.json({ error: 'Bad request.' }, { status: 400 }); }

  try {
    if (b.action === 'save') {
      await ensureShareTable();
      const cur = await getShareConfig();
      const token = String(b.telegram_bot_token || '').trim() || cur.telegramToken;
      const chat = String(b.telegram_chat_id ?? '').trim();
      const user = String(b.smtp_user ?? '').trim();
      const pass = String(b.smtp_pass || '').replace(/\s+/g, '') || cur.smtpPass;
      if (token && !/^\d+:[A-Za-z0-9_-]{20,}$/.test(token)) return Response.json({ error: 'That does not look like a Telegram bot token (it looks like 123456789:ABC-def…).' }, { status: 400 });
      if (chat && !/^-?\d+$|^@[A-Za-z0-9_]{4,}$/.test(chat)) return Response.json({ error: 'Chat ID must be a number (like 123456789 or -100123456789) or @channelname.' }, { status: 400 });
      await sql`
        INSERT INTO share_settings (id, telegram_bot_token, telegram_chat_id, smtp_user, smtp_pass, updated_at)
        VALUES (1, ${token}, ${chat}, ${user}, ${pass}, now())
        ON CONFLICT (id) DO UPDATE SET telegram_bot_token = ${token}, telegram_chat_id = ${chat}, smtp_user = ${user}, smtp_pass = ${pass}, updated_at = now()`;
      return Response.json({ ok: true });
    }

    if (b.action === 'detect') {
      // finds the chat id from the messages people sent to the bot (press Start in the bot first)
      const token = String(b.token || '').trim() || (await getShareConfig()).telegramToken;
      if (!token) return Response.json({ error: 'Paste the bot token first.' }, { status: 400 });
      const updates: any[] = await tg(token, 'getUpdates', { limit: 100 });
      const seen = new Map<string, string>();
      for (const u of updates) {
        const m = u.message || u.channel_post || u.my_chat_member;
        const chat = m?.chat;
        if (chat?.id != null) seen.set(String(chat.id), [chat.title, chat.first_name, chat.last_name, chat.username && '@' + chat.username].filter(Boolean).join(' ') || String(chat.id));
      }
      if (seen.size === 0) return Response.json({ error: 'No messages found. Open your bot in Telegram, press Start, send it "hi", then try again.' }, { status: 404 });
      return Response.json({ chats: Array.from(seen, ([id, name]) => ({ id, name })) });
    }

    if (b.action === 'test') {
      const c = await getShareConfig();
      if (!c.telegramToken || !c.telegramChatId) return Response.json({ error: 'Save the bot token and chat ID first.' }, { status: 400 });
      await tg(c.telegramToken, 'sendMessage', { chat_id: c.telegramChatId, text: '✅ MicroLoan is connected. Reports and receipts will arrive here.' });
      return Response.json({ ok: true });
    }

    return Response.json({ error: 'Unknown action.' }, { status: 400 });
  } catch (e: any) {
    return Response.json({ error: String(e?.message || 'Failed.') }, { status: 500 });
  }
}
