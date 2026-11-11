import { sql } from './db';

/** Extra member details added in Update 44 (all optional text). */
export const MEMBER_EXTRA_COLUMNS = [
  'mother_name', 'marital_status', 'religion', 'nationality', 'qualification',
  'permanent_address', 'other_info',
  'guarantor_nid', 'guarantor_occupation', 'guarantor_address',
] as const;

export async function ensureMemberExtraColumns() {
  await sql`ALTER TABLE borrowers ADD COLUMN IF NOT EXISTS mother_name VARCHAR(150)`;
  await sql`ALTER TABLE borrowers ADD COLUMN IF NOT EXISTS marital_status VARCHAR(30)`;
  await sql`ALTER TABLE borrowers ADD COLUMN IF NOT EXISTS religion VARCHAR(50)`;
  await sql`ALTER TABLE borrowers ADD COLUMN IF NOT EXISTS nationality VARCHAR(60)`;
  await sql`ALTER TABLE borrowers ADD COLUMN IF NOT EXISTS qualification VARCHAR(120)`;
  await sql`ALTER TABLE borrowers ADD COLUMN IF NOT EXISTS permanent_address TEXT`;
  await sql`ALTER TABLE borrowers ADD COLUMN IF NOT EXISTS other_info TEXT`;
  await sql`ALTER TABLE borrowers ADD COLUMN IF NOT EXISTS guarantor_nid VARCHAR(50)`;
  await sql`ALTER TABLE borrowers ADD COLUMN IF NOT EXISTS guarantor_occupation VARCHAR(100)`;
  await sql`ALTER TABLE borrowers ADD COLUMN IF NOT EXISTS guarantor_address TEXT`;
}

const val = (fd: FormData, k: string, max: number) => String(fd.get(k) || '').trim().slice(0, max);

/** Saves the extra fields for one member. Adds the columns first if the database does not have them yet. */
export async function saveMemberExtras(id: number, fd: FormData) {
  const run = () => sql`
    UPDATE borrowers SET
      mother_name = ${val(fd, 'mother_name', 150)},
      marital_status = ${val(fd, 'marital_status', 30)},
      religion = ${val(fd, 'religion', 50)},
      nationality = ${val(fd, 'nationality', 60)},
      qualification = ${val(fd, 'qualification', 120)},
      permanent_address = ${val(fd, 'permanent_address', 1000)},
      other_info = ${val(fd, 'other_info', 2000)},
      guarantor_nid = ${val(fd, 'guarantor_nid', 50)},
      guarantor_occupation = ${val(fd, 'guarantor_occupation', 100)},
      guarantor_address = ${val(fd, 'guarantor_address', 1000)}
    WHERE id = ${id}`;
  try {
    await run();
  } catch (err: any) {
    if (!(err?.code === '42703' || /column .* does not exist/i.test(String(err?.message || '')))) throw err;
    await ensureMemberExtraColumns();
    await run();
  }
}
