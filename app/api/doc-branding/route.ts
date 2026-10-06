import { sql } from '@/lib/db';

export const dynamic = 'force-dynamic';

/** Header/footer branding used by report & receipt exports (PDF / Word / Excel).
 *  Protected by the login middleware like every non-public route. */
export async function GET() {
  try {
    const [row] = await sql`
      SELECT doc_header_text, doc_logo_data, doc_logo_mime, doc_footer_address, doc_footer_contact
      FROM site_settings WHERE id = 1
    `;
    return Response.json(
      {
        headerText: row?.doc_header_text || '',
        logo: row?.doc_logo_data ? `data:${row.doc_logo_mime || 'image/png'};base64,${row.doc_logo_data}` : '',
        footerAddress: row?.doc_footer_address || '',
        footerContact: row?.doc_footer_contact || '',
      },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch {
    // Columns not created yet (migration not run) — exports just use the default look.
    return Response.json({ headerText: '', logo: '', footerAddress: '', footerContact: '' });
  }
}
