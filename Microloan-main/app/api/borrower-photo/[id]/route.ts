import { sql } from '@/lib/db';
import { getSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

/** Member profile picture (login required). The page adds ?v=<updated time>, so a new photo shows at once. */
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return new Response('Unauthorized', { status: 401 });

  const id = Number(params.id);
  if (!id) return new Response('Not found', { status: 404 });

  try {
    const [row] = await sql`SELECT mime_type, photo_data FROM borrower_photos WHERE borrower_id = ${id}`;
    if (!row) return new Response('Not found', { status: 404 });
    return new Response(Buffer.from(row.photo_data, 'base64'), {
      headers: { 'Content-Type': row.mime_type, 'Cache-Control': 'private, max-age=31536000, immutable' },
    });
  } catch {
    return new Response('Not found', { status: 404 });
  }
}
