import { notFound } from 'next/navigation';
import { saveCashEntryAction } from '@/lib/actions';
import { getCashEntry } from '@/lib/accounts';
import { todayISO } from '@/lib/utils';
import PageHeader from '../../../PageHeader';
import EntryForm from '../../EntryForm';

export const metadata = { title: 'Edit Cash Entry - MicroLoan Admin' };
export const dynamic = 'force-dynamic';

export default async function EditCashEntryPage({ params, searchParams }: { params: { id: string }; searchParams: { error?: string } }) {
  const id = Number(params.id);
  if (!id) notFound();
  const e: any = await getCashEntry(id);
  if (!e) notFound();
  const iso = e.entry_date instanceof Date ? e.entry_date.toLocaleDateString('en-CA') : String(e.entry_date).slice(0, 10);
  return (
    <div>
      <PageHeader title="Edit Cash Entry" />
      <EntryForm
        action={saveCashEntryAction.bind(null, id)}
        initial={{ direction: e.direction === 'out' ? 'out' : 'in', date: iso, category: e.category, description: e.description || '', amount: String(Number(e.amount)) }}
        today={todayISO()}
        error={searchParams.error}
        submitLabel="💾 Save Changes"
      />
    </div>
  );
}
