'use client';

import { useEffect, useRef, useState } from 'react';
import { downloadBlob } from '@/lib/clientExport';
import { BACKUP_FORMAT, BACKUP_VERSION, BACKUP_TABLES } from '@/lib/backupTables';
import { todayISO } from '@/lib/utils';

type TableInfo = { name: string; count: number; missing?: boolean; heavy: string[] };
type Progress = { label: string; done: number; total: number } | null;

const LABELS: Record<string, string> = {
  admins: 'Admin users',
  site_settings: 'Website settings',
  borrowers: 'Members',
  loans: 'Loans',
  loan_installments: 'Installments',
  collections: 'Payments collected',
  notifications: 'Notifications',
  savings_transactions: 'Savings transactions',
  borrower_photos: 'Member photos',
  borrower_documents: 'Member documents',
};

async function getJson(url: string) {
  const res = await fetch(url, { cache: 'no-store' });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || `Request failed (${res.status})`);
  return json;
}

async function post(body: any) {
  const res = await fetch('/api/restore', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || `Request failed (${res.status})`);
  return json;
}

function stamp() {
  const t = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Dhaka', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date()).replace(':', '');
  return `${todayISO()}_${t}`;
}

/** Reads every table from the server piece by piece and returns one backup file (JSON). */
async function buildBackup(onProgress: (p: Progress) => void): Promise<{ blob: Blob; counts: Record<string, number> }> {
  const meta = await getJson('/api/backup');
  const infos: TableInfo[] = meta.tables;
  const total = infos.reduce((s, t) => s + t.count, 0);
  let done = 0;
  const counts: Record<string, number> = {};
  const parts: string[] = [];

  parts.push(`{"format":${JSON.stringify(BACKUP_FORMAT)},"version":${BACKUP_VERSION},"created_at":${JSON.stringify(new Date().toISOString())},"tables":{`);
  let firstTable = true;
  for (const t of infos) {
    parts.push(`${firstTable ? '' : ','}${JSON.stringify(t.name)}:[`);
    firstTable = false;
    let after = 0;
    let n = 0;
    while (!t.missing) {
      const page = await getJson(`/api/backup?table=${t.name}&after=${after}`);
      for (let i = 0; i < page.rows.length; i++) {
        const row = page.rows[i];
        for (const col of t.heavy) {
          const v = await getJson(`/api/backup?table=${t.name}&col=${col}&id=${page.keys[i]}`);
          if (v.value != null) row[col] = v.value;
        }
        parts.push((n > 0 ? ',' : '') + JSON.stringify(row));
        n++;
        done++;
      }
      onProgress({ label: LABELS[t.name] || t.name, done, total });
      if (page.next == null) break;
      after = page.next;
    }
    counts[t.name] = n;
    parts.push(']');
  }
  parts.push('}}');
  return { blob: new Blob(parts, { type: 'application/json' }), counts };
}

export default function BackupClient({ tables }: { tables: TableInfo[] }) {
  const [busy, setBusy] = useState<'backup' | 'restore' | null>(null);
  const [progress, setProgress] = useState<Progress>(null);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [lastBackup, setLastBackup] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [parsed, setParsed] = useState<{ created_at?: string; counts: Record<string, number>; tables: Record<string, any[]> } | null>(null);
  const [fileError, setFileError] = useState('');
  const [agree, setAgree] = useState(false);
  const [pin, setPin] = useState('');
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try { setLastBackup(localStorage.getItem('microloan_last_backup') || ''); } catch {}
  }, []);

  const totalRows = tables.reduce((s, t) => s + t.count, 0);

  async function doBackup() {
    setBusy('backup');
    setMessage(null);
    setProgress({ label: 'Starting…', done: 0, total: totalRows });
    try {
      const { blob, counts } = await buildBackup(setProgress);
      const name = `microloan-backup-${stamp()}.json`;
      downloadBlob(blob, name);
      const when = new Date().toLocaleString('en-GB', { timeZone: 'Asia/Dhaka' });
      try { localStorage.setItem('microloan_last_backup', when); } catch {}
      setLastBackup(when);
      const rows = Object.values(counts).reduce((s, n) => s + n, 0);
      setMessage({ ok: true, text: `Backup saved as ${name} (${rows} records). Keep it somewhere safe — e.g. Google Drive or a USB drive.` });
    } catch (e: any) {
      setMessage({ ok: false, text: `Backup failed: ${e?.message || 'unknown error'}` });
    } finally {
      setBusy(null);
      setProgress(null);
    }
  }

  async function pickFile(f: File | null) {
    setFile(f);
    setParsed(null);
    setFileError('');
    setAgree(false);
    setMessage(null);
    if (!f) return;
    try {
      const data = JSON.parse(await f.text());
      if (data?.format !== BACKUP_FORMAT || typeof data.tables !== 'object') throw new Error('not a MicroLoan backup');
      if (Number(data.version) > BACKUP_VERSION) throw new Error('this backup is from a newer version of the app');
      const counts: Record<string, number> = {};
      for (const t of BACKUP_TABLES) counts[t.name] = Array.isArray(data.tables[t.name]) ? data.tables[t.name].length : 0;
      if (!counts.borrowers && !counts.loans && !counts.admins) throw new Error('the backup has no data in it');
      setParsed({ created_at: data.created_at, counts, tables: data.tables });
    } catch (e: any) {
      setFileError(`This file cannot be used: ${e?.message || 'it is not a valid backup file'}.`);
    }
  }

  async function doRestore() {
    if (!parsed) return;
    setBusy('restore');
    setMessage(null);
    let wiped = false;
    try {
      setProgress({ label: 'Checking password…', done: 0, total: 1 });
      await post({ action: 'check', pin });

      // Safety copy of what is in the database right now, saved BEFORE anything is replaced.
      setProgress({ label: 'Saving a safety copy of the current data…', done: 0, total: totalRows });
      const safety = await buildBackup(setProgress);
      const safetyName = `microloan-BEFORE-restore-${stamp()}.json`;
      downloadBlob(safety.blob, safetyName);

      const total = Object.values(parsed.counts as Record<string, number>).reduce((s: number, n: number) => s + n, 0);
      let done = 0;
      setProgress({ label: 'Clearing current data…', done, total });
      await post({ action: 'wipe', pin });
      wiped = true;

      for (const t of BACKUP_TABLES) {
        const all: any[] = parsed.tables[t.name] || [];
        const label = LABELS[t.name] || t.name;
        const heavy = t.heavy || [];
        for (let i = 0; i < all.length; i += t.limit) {
          const batch = all.slice(i, i + t.limit);
          // large columns go separately so no single request gets too big
          const light = batch.map((r) => {
            if (!heavy.length) return r;
            const c = { ...r };
            for (const h of heavy) delete c[h];
            return c;
          });
          await post({ action: 'rows', table: t.name, rows: light, pin });
          for (const r of batch) for (const h of heavy) if (r[h] != null) await post({ action: 'heavy', table: t.name, id: r[t.key], col: h, value: r[h], pin });
          done += batch.length;
          setProgress({ label: `Restoring ${label}…`, done, total });
        }
      }
      await post({ action: 'finish', pin });
      setMessage({ ok: true, text: `Restore complete — ${total} records restored from ${file?.name}. A copy of your previous data was downloaded as ${safetyName}. Reload the page to see everything.` });
      setFile(null); setParsed(null); setAgree(false); setPin('');
      if (fileInput.current) fileInput.current.value = '';
    } catch (e: any) {
      setMessage({
        ok: false,
        text: wiped
          ? `Restore stopped part-way: ${e?.message || 'unknown error'}. Your data from before the restore was downloaded as "microloan-BEFORE-restore-…json" — run the restore again with the backup file (or that safety file) to finish.`
          : `Restore was not started: ${e?.message || 'unknown error'}. Nothing was changed.`,
      });
    } finally {
      setBusy(null);
      setProgress(null);
    }
  }

  const pct = progress && progress.total > 0 ? Math.min(100, Math.round((progress.done / progress.total) * 100)) : 0;

  return (
    <div className="space-y-5 max-w-3xl">
      {message && (
        <div className={`rounded-lg px-3 py-2 text-sm ${message.ok ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>{message.text}</div>
      )}

      {progress && (
        <div className="card p-4">
          <div className="text-sm font-semibold text-navy mb-2">{progress.label}</div>
          <div className="h-2.5 rounded-full bg-gray-100 overflow-hidden"><div className="h-full bg-teal transition-all" style={{ width: `${pct}%` }} /></div>
          <div className="text-xs text-gray-500 mt-1">{progress.done} / {progress.total} records — please keep this page open.</div>
        </div>
      )}

      <section className="card p-5">
        <h2 className="font-bold text-navy mb-1">💾 Take a backup</h2>
        <p className="text-sm text-gray-600 mb-3">
          Downloads one file with <strong>all</strong> your data: members, loans, installments, payments, savings, notifications, photos, documents, settings and admin users.
          {lastBackup && <> Last backup from this device: <strong>{lastBackup}</strong>.</>}
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-4">
          {tables.filter((t) => !t.missing).map((t) => (
            <div key={t.name} className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5">
              <div className="text-[11px] text-gray-500">{LABELS[t.name] || t.name}</div>
              <div className="font-bold text-navy">{t.count}</div>
            </div>
          ))}
        </div>
        <button type="button" onClick={doBackup} disabled={!!busy} className="btn btn-primary disabled:opacity-60">
          {busy === 'backup' ? 'Backing up…' : '⬇ Download Backup'}
        </button>
        <p className="text-xs text-gray-400 mt-2">The file contains private member data and admin password hashes — store it safely and do not share it.</p>
      </section>

      <section className="card p-5 border-l-4 border-l-amber-500">
        <h2 className="font-bold text-navy mb-1">♻️ Restore from a backup</h2>
        <p className="text-sm text-gray-600 mb-3">
          Choose a backup file made here. Restoring <strong>replaces everything currently in the system</strong> with the contents of the file.
          A safety copy of the current data is downloaded automatically first.
        </p>
        <input
          ref={fileInput}
          type="file"
          accept=".json,application/json"
          disabled={!!busy}
          onChange={(e) => pickFile(e.target.files?.[0] || null)}
          className="block text-sm mb-3"
        />
        {fileError && <div className="rounded-lg bg-red-50 text-red-700 text-sm px-3 py-2 mb-3">{fileError}</div>}

        {parsed && (
          <div className="space-y-3">
            <div className="rounded-lg bg-sky-50 border border-sky-200 px-3 py-2 text-sm text-sky-900">
              <div className="font-semibold mb-1">
                Backup file: {file?.name}
                {parsed.created_at && <> · made {new Date(parsed.created_at).toLocaleString('en-GB', { timeZone: 'Asia/Dhaka' })}</>}
              </div>
              <div className="text-xs">
                {BACKUP_TABLES.filter((t) => parsed.counts[t.name] > 0).map((t) => `${LABELS[t.name] || t.name}: ${parsed.counts[t.name]}`).join(' · ')}
              </div>
            </div>
            <label className="flex items-start gap-2 text-sm">
              <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} className="mt-1" />
              <span>I understand this will <strong>replace all current data</strong> with the data in this file.</span>
            </label>
            <div>
              <label className="label">Admin password</label>
              <input type="password" value={pin} onChange={(e) => setPin(e.target.value)} autoComplete="off" placeholder="Same password used for deleting" className="input max-w-xs" />
            </div>
            <button type="button" onClick={doRestore} disabled={!!busy || !agree || !pin} className="btn bg-red-600 text-white hover:bg-red-700 disabled:opacity-50">
              {busy === 'restore' ? 'Restoring…' : '♻️ Restore Now'}
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
