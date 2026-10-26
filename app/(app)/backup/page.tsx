import { sql } from '@/lib/db';
import { BACKUP_TABLES } from '@/lib/backupTables';
import PageHeader from '../PageHeader';
import BackupClient from './BackupClient';

export const metadata = { title: 'Backup & Restore - MicroLoan Admin' };
export const dynamic = 'force-dynamic';

export default async function BackupPage() {
  const tables: { name: string; count: number; missing?: boolean; heavy: string[] }[] = [];
  for (const t of BACKUP_TABLES) {
    try {
      const [r] = (await (sql as any)(`SELECT count(*)::int AS n FROM "${t.name}"`, [])) as any[];
      tables.push({ name: t.name, count: r.n, heavy: t.heavy || [] });
    } catch {
      tables.push({ name: t.name, count: 0, missing: true, heavy: t.heavy || [] });
    }
  }

  return (
    <div>
      <PageHeader title="Backup & Restore" />
      <BackupClient tables={tables} />
    </div>
  );
}
