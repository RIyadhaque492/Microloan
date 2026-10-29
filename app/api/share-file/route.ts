import { randomBytes } from 'crypto';
import { sql } from '@/lib/db';
import { getSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const MAX_BYTES = 6 * 1024 * 1024;
const HOURS = 48; // keep in step with the interval in the INSERT below

/** Stores a generated report/receipt for 48 hours and returns an unguessable link that can be sent
 *  through Telegram, Messenger, WhatsApp or email. Only logged-in admins can create links. */
export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const form = await request.formData();
  const file = form.get('file') as File | null;
  if (!file || file.size === 0) return Response.json({ error: 'No file.' }, { status: 400 });
  if (file.size > MAX_BYTES) return Response.json({ error: 'File is too large to share by link.' }, { status: 413 });

  const token = randomBytes(24).toString('base64url');
  const filename = (file.name || 'file').replace(/[^A-Za-z0-9._-]+/g, '-').slice(0, 120);
  const base64 = Buffer.from(await file.arrayBuffer()).toString('base64');

  try {
    await sql`CREATE TABLE IF NOT EXISTS shared_files (
      token VARCHAR(64) PRIMARY KEY, filename VARCHAR(255) NOT NULL, mime_type VARCHAR(100) NOT NULL,
      file_data TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT now(), expires_at TIMESTAMPTZ NOT NULL)`;
    await sql`DELETE FROM shared_files WHERE expires_at < now()`;
    await sql`
      INSERT INTO shared_files (token, filename, mime_type, file_data, expires_at)
      VALUES (${token}, ${filename}, ${file.type || 'application/octet-stream'}, ${base64}, now() + interval '48 hours')
    `;
  } catch (err: any) {
    const msg = String(err?.message || '');
    return Response.json(
      { error: msg.includes('shared_files') ? 'Run migration_add_shared_files.sql in Neon first.' : 'Could not create the link.' },
      { status: 500 }
    );
  }

  const origin = new URL(request.url).origin;
  return Response.json({ url: `${origin}/s/${token}`, hours: HOURS });
}
