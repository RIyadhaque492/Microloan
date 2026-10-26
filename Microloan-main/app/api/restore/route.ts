import { sql } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { BACKUP_TABLES, findTable } from '@/lib/backupTables';
import { DELETE_PASSWORD } from '@/lib/deletePin';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const q = (text: string, params: any[] = []) => (sql as any)(text, params) as Promise<any[]>;
const missingTable = (e: any) => e?.code === '42P01' || /relation .* does not exist/i.test(String(e?.message || ''));

/**
 * Restore, one small step per request (the browser drives it):
 *   {action:'check'}                                -> password check only
 *   {action:'wipe'}                                 -> empties every backed-up table
 *   {action:'rows', table, rows:[...]}              -> inserts a batch of rows (original ids kept)
 *   {action:'heavy', table, id, col, value}         -> sets one large column (banner image / logo)
 *   {action:'finish'}                               -> re-aligns the id counters
 * Every call needs a logged-in admin AND the admin (delete) password.
 */
export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  let body: any;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Bad request.' }, { status: 400 });
  }
  if (String(body?.pin ?? '') !== DELETE_PASSWORD) {
    return Response.json({ error: 'Wrong password.' }, { status: 403 });
  }

  try {
    switch (body.action) {
      case 'check':
        return Response.json({ ok: true });

      case 'wipe': {
        const existing: string[] = [];
        for (const t of BACKUP_TABLES) {
          try {
            await q(`SELECT 1 FROM "${t.name}" LIMIT 1`);
            existing.push(`"${t.name}"`);
          } catch (e) {
            if (!missingTable(e)) throw e;
          }
        }
        await q(`TRUNCATE TABLE ${existing.join(', ')} RESTART IDENTITY CASCADE`);
        return Response.json({ ok: true });
      }

      case 'rows': {
        const t = findTable(String(body.table));
        if (!t) return Response.json({ error: 'Unknown table.' }, { status: 400 });
        const rows = Array.isArray(body.rows) ? body.rows : [];
        if (rows.length === 0) return Response.json({ ok: true, inserted: 0 });
        try {
          await q(`INSERT INTO "${t.name}" SELECT * FROM jsonb_populate_recordset(NULL::"${t.name}", $1::jsonb)`, [JSON.stringify(rows)]);
        } catch (e) {
          if (missingTable(e)) return Response.json({ ok: true, inserted: 0, skipped: true });
          throw e;
        }
        return Response.json({ ok: true, inserted: rows.length });
      }

      case 'heavy': {
        const t = findTable(String(body.table));
        const col = String(body.col);
        if (!t || !t.heavy?.includes(col)) return Response.json({ error: 'Unknown column.' }, { status: 400 });
        await q(`UPDATE "${t.name}" SET "${col}" = $1 WHERE "${t.key}" = $2`, [body.value ?? null, Number(body.id)]);
        return Response.json({ ok: true });
      }

      case 'finish': {
        for (const t of BACKUP_TABLES) {
          if (t.key !== 'id') continue;
          try {
            await q(
              `SELECT setval(pg_get_serial_sequence('"${t.name}"', 'id'),
                 GREATEST(COALESCE((SELECT MAX(id) FROM "${t.name}"), 0), 1),
                 (SELECT MAX(id) IS NOT NULL FROM "${t.name}"))`
            );
          } catch (e) {
            if (!missingTable(e)) throw e;
          }
        }
        return Response.json({ ok: true });
      }

      default:
        return Response.json({ error: 'Unknown action.' }, { status: 400 });
    }
  } catch (e: any) {
    return Response.json({ error: String(e?.message || 'Restore step failed.') }, { status: 500 });
  }
}
