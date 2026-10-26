/** Tables included in a backup, in the order they must be restored (parents before children).
 *  `limit` = rows fetched per request (kept small for tables that hold files, so each request stays well
 *  under the host's ~4.5 MB request/response limit). `heavy` columns are fetched/restored one by one. */
export type BackupTable = { name: string; key: string; limit: number; heavy?: string[] };

export const BACKUP_TABLES: BackupTable[] = [
  { name: 'admins', key: 'id', limit: 200 },
  { name: 'site_settings', key: 'id', limit: 1, heavy: ['banner_image_data', 'doc_logo_data'] },
  { name: 'borrowers', key: 'id', limit: 300 },
  { name: 'loans', key: 'id', limit: 300 },
  { name: 'loan_installments', key: 'id', limit: 1500 },
  { name: 'collections', key: 'id', limit: 1000 },
  { name: 'notifications', key: 'id', limit: 1000 },
  { name: 'savings_transactions', key: 'id', limit: 1000 },
  { name: 'borrower_photos', key: 'borrower_id', limit: 1 },
  { name: 'borrower_documents', key: 'id', limit: 1 },
];

export const BACKUP_FORMAT = 'microloan-backup';
export const BACKUP_VERSION = 1;

export function findTable(name: string) {
  return BACKUP_TABLES.find((t) => t.name === name);
}
