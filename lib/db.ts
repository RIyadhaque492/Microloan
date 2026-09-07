import { neon, NeonQueryFunction } from '@neondatabase/serverless';

let _sql: NeonQueryFunction<false, false> | null = null;

/**
 * Lazily-created Neon client. Deferring creation (rather than doing it at
 * module load time) means the app can still build/boot even if DATABASE_URL
 * isn't present in that particular environment — the error only surfaces
 * when a query actually runs, with a clear message.
 */
function getClient(): NeonQueryFunction<false, false> {
  if (!_sql) {
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL is not set. Copy .env.example to .env.local and fill it in.');
    }
    _sql = neon(process.env.DATABASE_URL);
  }
  return _sql;
}

// Tagged-template SQL client. Usage: await sql`SELECT * FROM borrowers WHERE id = ${id}`
export const sql: NeonQueryFunction<false, false> = ((...args: Parameters<NeonQueryFunction<false, false>>) =>
  getClient()(...args)) as NeonQueryFunction<false, false>;
