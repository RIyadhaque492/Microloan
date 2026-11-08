import { sql } from '@/lib/db';

export const dynamic = 'force-dynamic';

/** Public (no login) download for a shared file — the long random token is the key, and it expires after 48 hours. */
export async function GET(_req: Request, { params }: { params: { token: string } }) {
  const token = params.token;
  if (!/^[A-Za-z0-9_-]{16,64}$/.test(token)) return new Response('Not found', { status: 404 });

  try {
    const [row] = await sql`SELECT filename, mime_type, file_data FROM shared_files WHERE token = ${token} AND expires_at > now()`;
    if (!row) return new Response('This link has expired or does not exist.', { status: 404 });
    return new Response(Buffer.from(row.file_data, 'base64'), {
      headers: {
        'Content-Type': row.mime_type,
        'Content-Disposition': `inline; filename="${row.filename}"`,
        'Cache-Control': 'private, no-store',
        'X-Robots-Tag': 'noindex',
      },
    });
  } catch {
    return new Response('Not found', { status: 404 });
  }
}
