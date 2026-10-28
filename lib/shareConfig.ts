import { sql } from './db';

/** Settings for sending files straight to Telegram / email. Saved in the database (Share Settings page);
 *  environment variables are still honoured as a fallback. Secrets are never sent back to the browser. */
export type ShareConfig = { telegramToken: string; telegramChatId: string; smtpUser: string; smtpPass: string };

export async function ensureShareTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS share_settings (
      id INTEGER PRIMARY KEY DEFAULT 1,
      telegram_bot_token TEXT,
      telegram_chat_id TEXT,
      smtp_user TEXT,
      smtp_pass TEXT,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      CONSTRAINT share_single_row CHECK (id = 1)
    )`;
}

export async function getShareConfig(): Promise<ShareConfig> {
  let row: any = null;
  try {
    await ensureShareTable();
    [row] = await sql`SELECT * FROM share_settings WHERE id = 1`;
  } catch {
    row = null;
  }
  return {
    telegramToken: row?.telegram_bot_token || process.env.TELEGRAM_BOT_TOKEN || '',
    telegramChatId: row?.telegram_chat_id || process.env.TELEGRAM_CHAT_ID || '',
    smtpUser: row?.smtp_user || process.env.SMTP_USER || '',
    smtpPass: row?.smtp_pass || process.env.SMTP_PASS || '',
  };
}

export const telegramBase = () => process.env.TELEGRAM_API_BASE || 'https://api.telegram.org';
