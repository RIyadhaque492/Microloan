import { saveCashEntryAction } from '@/lib/actions';
import { todayISO } from '@/lib/utils';
import PageHeader from '../../PageHeader';
import EntryForm from '../EntryForm';

export const metadata = { title: 'Add Cash Entry - MicroLoan Admin' };
export const dynamic = 'force-dynamic';

export default function NewCashEntryPage({ searchParams }: { searchParams: { type?: string; error?: string } }) {
  return (
    <div>
      <PageHeader title="Add Cash Entry" />
      <EntryForm
        action={saveCashEntryAction.bind(null, 0)}
        initial={{ direction: searchParams.type === 'out' ? 'out' : 'in', date: '', category: '', description: '', amount: '' }}
        today={todayISO()}
        error={searchParams.error}
        submitLabel="💾 Save Entry"
      />
    </div>
  );
}
