import { getSession } from '@/lib/auth';
import { sendMail } from '@/lib/smtp';
import { getShareConfig, telegramBase } from '@/lib/shareConfig';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 30;

const MAX_BYTES = 4 * 1024 * 1024; // host request limit is ~4.5 MB

/** Which direct-send services are set up (true/false only — never the secrets). */
export async function GET() {
  const session = await getSession();
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const c = await getShareConfig();
  return Response.json({ telegram: !!(c.telegramToken && c.telegramChatId), gmail: !!(c.smtpUser && c.smtpPass) });
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
      const chatId = cfg.telegramChatId;
      if (!token || !chatId) {
        return Response.json({ code: 'not_configured', error: 'Telegram is not set up yet (Admin > Share Settings).' }, { status: 503 });
      }
      const fd = new FormData();
      fd.set('chat_id', chatId);
      fd.set('caption', title);
      fd.set('document', new File([await file.arrayBuffer()], filename, { type: file.type || 'application/octet-stream' }));
      const base = telegramBase();
      const res = await fetch(`${base}/bot${token}/sendDocument`, { method: 'POST', body: fd });
      const json: any = await res.json().catch(() => ({}));
      if (!res.ok || json.ok === false) {
        return Response.json({ error: `Telegram refused it: ${json.description || res.status}` }, { status: 502 });
      }
      return Response.json({ ok: true });
    }

    if (kind === 'gmail') {
      const cfg = await getShareConfig();
      const user = cfg.smtpUser;
      const pass = cfg.smtpPass;
      if (!user || !pass) {
        return Response.json({ code: 'not_configured', error: 'Email is not set up yet (Admin > Share Settings).' }, { status: 503 });
      }
      const to = String(form.get('to') || '').trim();
      if (!/^[^\s@,;<>"]+@[^\s@,;<>"]+\.[^\s@,;<>"]+$/.test(to)) {
        return Response.json({ error: 'Please enter a valid email address.' }, { status: 400 });
      }
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
      return Response.json({ ok: true });
    }

    return Response.json({ error: 'Unknown destination.' }, { status: 400 });
  } catch (e: any) {
    return Response.json({ error: String(e?.message || 'Could not send the file.') }, { status: 500 });
  }
}
