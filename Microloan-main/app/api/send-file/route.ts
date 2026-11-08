import { getSession } from '@/lib/auth';
import { sendMail } from '@/lib/smtp';
import { getShareConfig, listContacts, telegramBase } from '@/lib/shareConfig';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 30;

const MAX_BYTES = 4 * 1024 * 1024; // host request limit is ~4.5 MB

/** Which direct-send services are set up (true/false only — never the secrets). */
export async function GET() {
  const session = await getSession();
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const c = await getShareConfig();
  const contacts = await listContacts();
  return Response.json({
    telegram: !!c.telegramToken,
    defaultChat: !!c.telegramChatId,
    gmail: !!(c.smtpUser && c.smtpPass),
    contacts,
  });
}

/**
 * Sends a generated PDF/Excel/Word file straight from the server — no download needed.
 *   kind = telegram -> Telegram bot message with the file   (env: TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID)
 *   kind = gmail    -> e-mail with the file attached        (env: SMTP_USER, SMTP_PASS [, SMTP_HOST, SMTP_PORT, EMAIL_FROM])
 * Only logged-in admins. If the service is not set up yet the answer has code "not_configured".
 */
export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return Response.json({ error: 'Bad request.' }, { status: 400 });
  }
  const file = form.get('file') as File | null;
  const kind = String(form.get('kind') || '');
  const title = String(form.get('title') || 'MicroLoan file').slice(0, 200);
  if (!file || file.size === 0) return Response.json({ error: 'No file.' }, { status: 400 });
  if (file.size > MAX_BYTES) return Response.json({ error: 'The file is too large to send directly (max 4 MB). Use Download instead.' }, { status: 413 });
  const filename = (file.name || 'file').replace(/[^A-Za-z0-9._-]+/g, '-').slice(0, 120);

  try {
    if (kind === 'telegram') {
      const cfg = await getShareConfig();
      const token = cfg.telegramToken;
      let ids: string[] = [];
      try { ids = JSON.parse(String(form.get('chat_ids') || '[]')); } catch {}
      ids = Array.from(new Set(ids.map((x) => String(x).trim()).filter((x) => /^-?\d+$|^@[A-Za-z0-9_]{4,}$/.test(x)))).slice(0, 25);
      if (cfg.telegramChatId && (form.get('with_default') || ids.length === 0) && !ids.includes(cfg.telegramChatId)) ids.unshift(cfg.telegramChatId);
      if (!token || ids.length === 0) {
        return Response.json({ code: 'not_configured', error: 'Telegram is not set up yet (Admin > Share Settings).' }, { status: 503 });
      }
      const bytes = await file.arrayBuffer();
      const base = telegramBase();
      const failed: string[] = [];
      let sent = 0;
      for (const chatId of ids) {
        const fd = new FormData();
        fd.set('chat_id', chatId);
        fd.set('caption', title);
        fd.set('document', new File([bytes], filename, { type: file.type || 'application/octet-stream' }));
        const res = await fetch(`${base}/bot${token}/sendDocument`, { method: 'POST', body: fd });
        const json: any = await res.json().catch(() => ({}));
        if (!res.ok || json.ok === false) failed.push(`${chatId}: ${json.description || res.status}`);
        else sent++;
      }
      if (sent === 0) return Response.json({ error: `Telegram refused it: ${failed[0]}. (The person must open your bot and press Start first.)` }, { status: 502 });
      return Response.json({ ok: true, sent, failed });
    }

    if (kind === 'gmail') {
      const cfg = await getShareConfig();
      const user = cfg.smtpUser;
      const pass = cfg.smtpPass;
      if (!user || !pass) {
        return Response.json({ code: 'not_configured', error: 'Email is not set up yet (Admin > Share Settings).' }, { status: 503 });
      }
      const list = Array.from(new Set(String(form.get('to') || '').split(/[,;\s]+/).map((x) => x.trim()).filter(Boolean))).slice(0, 15);
      if (list.length === 0 || list.some((x) => !/^[^\s@,;<>"]+@[^\s@,;<>"]+\.[^\s@,;<>"]+$/.test(x))) {
        return Response.json({ error: 'Please choose or enter valid email addresses.' }, { status: 400 });
      }
      const to = list.join(',');
      await sendMail({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: Number(process.env.SMTP_PORT || 465),
        user,
        pass,
        from: process.env.EMAIL_FROM || user,
        to,
        subject: title,
        text: `${title}\n\nThe file is attached (${filename}).`,
        filename,
        mime: file.type || 'application/octet-stream',
        data: Buffer.from(await file.arrayBuffer()),
      });
      return Response.json({ ok: true, sent: list.length, failed: [] });
    }

    return Response.json({ error: 'Unknown destination.' }, { status: 400 });
  } catch (e: any) {
    return Response.json({ error: String(e?.message || 'Could not send the file.') }, { status: 500 });
  }
}
