import Link from 'next/link';
import { getBinContents } from '@/lib/data';
import { restoreBorrowerAction, restoreLoanAction, purgeBorrowerAction, purgeLoanAction, emptyBinAction } from '@/lib/actions';
import { money, statusBadgeClass, formatDMYTime } from '@/lib/utils';
import PageHeader from '../PageHeader';

export const metadata = { title: 'Bin - MicroLoan Admin' };
export const dynamic = 'force-dynamic';

export default async function BinPage() {
  const { borrowers, loans } = await getBinContents();

  return (
    <div>
      <PageHeader
        title="🗑 Bin"
        showBack={false}
        action={
          (borrowers as any[]).length + (loans as any[]).length > 0 ? (
            <form action={emptyBinAction}>
              <button className="btn btn-danger confirm-delete confirm-purge">☠ Empty Bin</button>
            </form>
          ) : undefined
        }
      />
      <p className="text-sm text-gray-500 mb-4">
        Removed members and loans stay here until you restore them — or erase them for good with <strong>Delete permanently</strong>.
      </p>

      <div className="table-wrap mb-6">
        <div className="px-4 py-3 border-b border-gray-100 font-semibold text-sm">Removed Members ({(borrowers as any[]).length})</div>
        <table className="app-table">
          <thead><tr><th>Member ID</th><th>Name</th><th>Phone</th><th>Removed On</th><th></th></tr></thead>
          <tbody>
            {(borrowers as any[]).length === 0 && <tr><td colSpan={5} className="text-center text-gray-400 py-8">Bin is empty.</td></tr>}
            {(borrowers as any[]).map((b) => (
              <tr key={b.id}>
                <td>{b.borrower_code}</td>
                <td>{b.full_name}</td>
                <td>{b.phone}</td>
                <td>{formatDMYTime(b.deleted_at)}</td>
                <td className="text-right whitespace-nowrap">
                  <div className="inline-flex gap-2">
                    <form action={restoreBorrowerAction.bind(null, b.id)}>
                      <button className="btn btn-outline !py-1 !px-2 text-xs">↩ Restore</button>
                    </form>
                    <form action={purgeBorrowerAction.bind(null, b.id, '/bin')}>
                      <button className="btn btn-danger !py-1 !px-2 text-xs confirm-delete confirm-purge">☠ Delete permanently</button>
                    </form>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="table-wrap">
        <div className="px-4 py-3 border-b border-gray-100 font-semibold text-sm">Removed Loans ({(loans as any[]).length})</div>
        <table className="app-table">
          <thead><tr><th>Loan Code</th><th>Member</th><th>Amount</th><th>Status</th><th>Removed On</th><th></th></tr></thead>
          <tbody>
            {(loans as any[]).length === 0 && <tr><td colSpan={6} className="text-center text-gray-400 py-8">Bin is empty.</td></tr>}
            {(loans as any[]).map((l) => (
              <tr key={l.id}>
                <td>{l.loan_code}</td>
                <td>{l.full_name} ({l.borrower_code}){l.borrower_deleted_at && <span className="text-xs text-red-500 block">member also in Bin</span>}</td>
                <td>৳{money(l.loan_amount)}</td>
                <td><span className={`badge ${statusBadgeClass(l.status)}`}>{l.status}</span></td>
                <td>{formatDMYTime(l.deleted_at)}</td>
                <td className="text-right whitespace-nowrap">
                  <div className="inline-flex gap-2">
                    <form action={restoreLoanAction.bind(null, l.id)}>
                      <button className="btn btn-outline !py-1 !px-2 text-xs">↩ Restore</button>
                    </form>
                    <form action={purgeLoanAction.bind(null, l.id, '/bin')}>
                      <button className="btn btn-danger !py-1 !px-2 text-xs confirm-delete confirm-purge">☠ Delete permanently</button>
                    </form>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
