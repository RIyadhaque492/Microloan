import { sql } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { BACKUP_TABLES, findTable } from '@/lib/backupTables';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const q = (text: string, params: any[] = []) => (sql as any)(text, params) as Promise<any[]>;
const missingTable = (e: any) => e?.code === '42P01' || /relation .* does not exist/i.test(String(e?.message || ''));

/**
 * Backup data, one small piece per request (so big files never hit the host's size limit):
 *   GET /api/backup                          -> table list with row counts
 *   GET /api/backup?table=T&after=K          -> the next page of rows of table T after key K
 *   GET /api/backup?table=T&col=C&id=K       -> one large column (e.g. the banner image) of row K
 * Only logged-in admins.
 */
export async function GET(request: Request) {
  const session = await getSession();
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const url = new URL(request.url);
  const tableName = url.searchParams.get('table');

  try {
    if (!tableName) {
      const tables: { name: string; count: number; missing?: boolean; heavy: string[] }[] = [];
      for (const t of BACKUP_TABLES) {
        try {
          const [r] = await q(`SELECT count(*)::int AS n FROM "${t.name}"`);
          tables.push({ name: t.name, count: r.n, heavy: t.heavy || [] });
        } catch (e) {
          if (!missingTable(e)) throw e;
          tables.push({ name: t.name, count: 0, missing: true, heavy: t.heavy || [] });
        }
      }
      return Response.json({ tables });
    }

    const t = findTable(tableName);
    if (!t) return Response.json({ error: 'Unknown table.' }, { status: 400 });

    const col = url.searchParams.get('col');
    if (col) {
      if (!t.heavy?.includes(col)) return Response.json({ error: 'Unknown column.' }, { status: 400 });
      const id = Number(url.searchParams.get('id'));
      try {
        const rows = await q(`SELECT "${col}" AS v FROM "${t.name}" WHERE "${t.key}" = $1`, [id]);
        return Response.json({ value: rows[0]?.v ?? null });
      } catch (e: any) {
        if (e?.code === '42703') return Response.json({ value: null }); // column not in this database yet
        throw e;
      }
    }

    const after = Number(url.searchParams.get('after') ?? 0) || 0;
    // to_jsonb gives every column exactly as stored; heavy columns are left out here and fetched separately.
    const strip = (t.heavy || []).map((c) => ` - '${c}'`).join('');
    const rows = await q(
      `SELECT (to_jsonb(x)${strip}) AS r, x."${t.key}" AS k FROM "${t.name}" x WHERE x."${t.key}" > $1 ORDER BY x."${t.key}" ASC LIMIT ${t.limit}`,
      [after]
    );
    const last = rows.length ? Number(rows[rows.length - 1].k) : null;
    return Response.json({
      rows: rows.map((r) => r.r),
      keys: rows.map((r) => Number(r.k)),
      next: rows.length === t.limit ? last : null,
    });
  } catch (e: any) {
    if (missingTable(e)) return Response.json({ rows: [], keys: [], next: null, missing: true });
    return Response.json({ error: String(e?.message || 'Backup failed.') }, { status: 500 });
  }
}
