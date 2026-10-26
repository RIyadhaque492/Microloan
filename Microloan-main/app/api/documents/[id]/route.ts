import { sql } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) {
    return new Response('Unauthorized', { status: 401 });
  }

  const id = Number(params.id);
  if (!id) {
    return new Response('Not found', { status: 404 });
  }

  const [doc] = await sql`SELECT file_name, mime_type, file_data FROM borrower_documents WHERE id = ${id}`;
  if (!doc) {
    return new Response('Not found', { status: 404 });
  }

  const buffer = Buffer.from(doc.file_data, 'base64');
  const safeFilename = doc.file_name.replace(/[^A-Za-z0-9._-]+/g, '-');

  return new Response(buffer, {
    headers: {
      'Content-Type': doc.mime_type,
      'Content-Disposition': `inline; filename="${safeFilename}"`,
      'Cache-Control': 'private, max-age=3600',
    },
  });
}
