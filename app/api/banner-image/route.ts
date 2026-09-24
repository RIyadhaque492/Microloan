import { sql } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const [row] = await sql`SELECT banner_image_data, banner_image_mime FROM site_settings WHERE id = 1`;
    if (!row?.banner_image_data) {
      return new Response('Not found', { status: 404 });
    }
    const buffer = Buffer.from(row.banner_image_data, 'base64');
    return new Response(buffer, {
      headers: {
        'Content-Type': row.banner_image_mime || 'image/jpeg',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch {
    return new Response('Not found', { status: 404 });
  }
}
