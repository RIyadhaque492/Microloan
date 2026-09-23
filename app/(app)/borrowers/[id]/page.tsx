import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getBorrower, getLoansForBorrower, getBorrowerDocuments, getSavingsBalance } from '@/lib/data';
import { money, statusBadgeClass, frequencyShortLabel } from '@/lib/utils';
import { uploadDocumentAction, deleteDocumentAction } from '@/lib/actions';
import PageHeader from '../../PageHeader';
import UploadForm from './UploadForm';

export const metadata = { title: 'Member Profile - MicroLoan Admin' };

const DOC_TYPE_LABELS: Record<string, string> = {
  borrower_nid: 'Member NID/ID',
  borrower_photo: 'Member Photo',
  income_proof: 'Income Proof',
  address_proof: 'Address Proof',
  guarantor_nid: 'Guarantor NID/ID',
  guarantor_photo: 'Guarantor Photo',
  other: 'Other',
};

export default async function BorrowerViewPage({ params, searchParams }: { params: { id: string }; searchParams: { error?: string } }) {
  const id = Number(params.id);
  if (!id || isNaN(id)) notFound();
  const borrower = await getBorrower(id);
  if (!borrower) notFound();
  const loans = (await getLoansForBorrower(id)) as any[];
  const documents = (await getBorrowerDocuments(id)) as any[];
  const savingsBalance = await getSavingsBalance(id);

  const uploadAction = uploadDocumentAction.bind(null, id);

  return (
    <div>
      <PageHeader
        title={borrower.full_name}
        action={
          <div className="flex gap-2">
            <Link href={`/borrowers/${id}/edit`} className="btn btn-outline">✏️ Edit</Link>
            <Link href="/borrowers" className="btn btn-primary">✔ Done</Link>
          </div>
        }
      />

      {searchParams.error && <div className="mb-4 rounded-lg bg-red-50 text-red-700 text-sm px-3 py-2">{searchParams.error}</div>}

      {/* Member details — landscape / horizontal layout */}
      <div className="card p-5 mb-4">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-16 h-16 rounded-full bg-tealight flex items-center justify-center text-2xl font-bold text-teal flex-shrink-0">
            {borrower.full_name.charAt(0)}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="font-bold text-navy text-lg">{borrower.full_name}</h2>
              <span className={`badge ${statusBadgeClass(borrower.status)}`}>{borrower.status}</span>
            </div>
            <p className="text-gray-400 text-sm">Member ID: {borrower.borrower_code}</p>
            <p className="text-xs text-gray-400 mt-0.5">
              {loans.length} loan{loans.length !== 1 ? 's' : ''} total
              {loans.filter((l) => l.status === 'active').length > 0 && (
                <> · <span className="text-teal font-semibold">{loans.filter((l) => l.status === 'active').length} active</span></>
              )}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-3 text-sm border-t border-gray-100 pt-4">
          <div><div className="text-xs text-gray-400">Phone</div><div>📞 {borrower.phone}</div></div>
          <div><div className="text-xs text-gray-400">Email</div><div>✉️ {borrower.email || '—'}</div></div>
          <div><div className="text-xs text-gray-400">NID</div><div>🪪 {borrower.nid_number || '—'}</div></div>
          <div><div className="text-xs text-gray-400">Occupation</div><div>💼 {borrower.occupation || '—'}</div></div>
          <div><div className="text-xs text-gray-400">Guarantor</div><div>🤝 {borrower.guarantor_name || '—'} {borrower.guarantor_phone ? `(${borrower.guarantor_phone})` : ''}</div></div>
          <div>
            <div className="text-xs text-gray-400">Registration Fee</div>
            <div>🧾 ৳{money(borrower.registration_fee)} {borrower.fee_receipt_no && <span className="text-gray-400">({borrower.fee_receipt_no})</span>}</div>
          </div>
          <div className="col-span-2 md:col-span-2">
            <div className="text-xs text-gray-400">Present Address</div>
            <div>📍 {borrower.present_address || '—'}</div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-gray-100">
          <div className="rounded-lg bg-tealight p-3 flex items-center justify-between">
            <span className="text-sm font-semibold text-navy">🏦 Savings</span>
            <span className="font-bold text-teal">৳{money(savingsBalance)}</span>
          </div>
          <div className="flex gap-2">
            <Link href={`/loans/new?borrower_id=${borrower.id}`} className="btn btn-primary flex-1 text-xs">➕ New Loan</Link>
            <Link href={`/savings/${id}`} className="btn btn-outline flex-1 text-xs">Manage Savings</Link>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="table-wrap">
          <div className="px-4 py-3 border-b border-gray-100 font-semibold text-sm">Loan History</div>
          <table className="app-table">
            <thead><tr><th>Loan Code</th><th>Amount</th><th>Tenure</th><th>Status</th><th></th></tr></thead>
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

        <div id="documents" className="card p-5">
          <h3 className="font-semibold text-sm mb-3">Documents (Member &amp; Guarantor)</h3>

          {documents.length === 0 ? (
            <p className="text-gray-400 text-sm mb-4">No documents uploaded yet.</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
              {documents.map((d) => (
                <div key={d.id} className="border border-gray-200 rounded-lg overflow-hidden">
                  <a href={`/api/documents/${d.id}`} target="_blank" rel="noopener noreferrer">
                    {d.mime_type.startsWith('image/') ? (
                      <img src={`/api/documents/${d.id}`} alt={d.doc_title} className="w-full h-24 object-cover" />
                    ) : (
                      <div className="w-full h-24 bg-gray-50 flex items-center justify-center text-3xl">📄</div>
                    )}
                  </a>
                  <div className="p-2">
                    <p className="text-xs font-semibold truncate" title={d.doc_title}>{d.doc_title}</p>
                    <p className="text-[10px] text-gray-400 mb-1">{DOC_TYPE_LABELS[d.doc_type] || d.doc_type}</p>
                    <form action={deleteDocumentAction.bind(null, id, d.id)}>
                      <button type="submit" className="text-[11px] text-red-500 hover:text-red-700 confirm-delete">🗑 Delete</button>
                    </form>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="border-t border-gray-100 pt-3">
            <p className="text-sm font-semibold text-teal mb-3">➕ Upload a document</p>
            <UploadForm action={uploadAction} />
          </div>
        </div>
      </div>
    </div>
  );
}

