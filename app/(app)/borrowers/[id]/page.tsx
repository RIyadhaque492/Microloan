import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getBorrower, getLoansForBorrower } from '@/lib/data';
import { money, statusBadgeClass, frequencyShortLabel } from '@/lib/utils';
import PageHeader from '../../PageHeader';

export default async function BorrowerViewPage({ params }: { params: { id: string } }) {
  const id = Number(params.id);
  const borrower = await getBorrower(id);
  if (!borrower) notFound();
  const loans = (await getLoansForBorrower(id)) as any[];

  return (
    <div>
      <PageHeader
        title={borrower.full_name}
        action={<Link href={`/borrowers/${id}/edit`} className="btn btn-outline">✏️ Edit</Link>}
      />

      <div className="grid lg:grid-cols-3 gap-4">
        <div className="card p-5 text-center lg:col-span-1 h-fit">
          <div className="w-20 h-20 rounded-full bg-tealight mx-auto flex items-center justify-center text-2xl font-bold text-teal mb-2">
            {borrower.full_name.charAt(0)}
          </div>
          <h2 className="font-bold text-navy">{borrower.full_name}</h2>
          <p className="text-gray-400 text-sm mb-2">{borrower.borrower_code}</p>
          <span className={`badge ${statusBadgeClass(borrower.status)}`}>{borrower.status}</span>
          <div className="text-left text-sm mt-4 space-y-1 text-gray-600">
            <p>📞 {borrower.phone}</p>
            <p>✉️ {borrower.email || '—'}</p>
            <p>🪪 NID: {borrower.nid_number || '—'}</p>
            <p>💼 {borrower.occupation || '—'}</p>
            <p>📍 {borrower.present_address || '—'}</p>
          </div>
          <div className="mt-4 flex gap-2">
            <Link href={`/borrowers/${id}/edit`} className="btn btn-outline flex-1">✏️ Edit</Link>
            <Link href={`/loans/new?borrower_id=${borrower.id}`} className="btn btn-primary flex-1">➕ New Loan</Link>
          </div>
        </div>

        <div className="lg:col-span-2">
          <div className="table-wrap">
            <div className="px-4 py-3 border-b border-gray-100 font-semibold text-sm">Loan History</div>
            <table className="app-table">
              <thead><tr><th>Code</th><th>Amount</th><th>Tenure</th><th>Status</th><th></th></tr></thead>
              <tbody>
                {loans.length === 0 && <tr><td colSpan={5} className="text-center text-gray-400 py-8">No loans yet.</td></tr>}
                {loans.map((l) => (
                  <tr key={l.id}>
                    <td>{l.loan_code}</td>
                    <td>৳{money(l.loan_amount)}</td>
                    <td>{l.tenure} {frequencyShortLabel(l.repayment_frequency)}</td>
                    <td><span className={`badge ${statusBadgeClass(l.status)}`}>{l.status}</span></td>
                    <td><Link href={`/loans/${l.id}`} className="btn btn-outline !py-1 !px-2 text-xs">View</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
