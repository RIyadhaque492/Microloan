import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getBorrower, getLoansForBorrower, getBorrowerDocuments } from '@/lib/data';
import { money, statusBadgeClass, frequencyShortLabel } from '@/lib/utils';
import { uploadDocumentAction, deleteDocumentAction } from '@/lib/actions';
import PageHeader from '../../PageHeader';

export const metadata = { title: 'Borrower Profile - MicroLoan Admin' };

const DOC_TYPE_LABELS: Record<string, string> = {
  borrower_nid: 'Borrower NID/ID',
  borrower_photo: 'Borrower Photo',
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

  const uploadAction = uploadDocumentAction.bind(null, id);

  return (
    <div>
      <PageHeader
        title={borrower.full_name}
        action={<Link href={`/borrowers/${id}/edit`} className="btn btn-outline">✏️ Edit</Link>}
      />

      {searchParams.error && <div className="mb-4 rounded-lg bg-red-50 text-red-700 text-sm px-3 py-2">{searchParams.error}</div>}

      <div className="grid lg:grid-cols-3 gap-4">
        <div className="card p-5 text-center lg:col-span-1 h-fit">
          <div className="w-20 h-20 rounded-full bg-tealight mx-auto flex items-center justify-center text-2xl font-bold text-teal mb-2">
            {borrower.full_name.charAt(0)}
          </div>
          <h2 className="font-bold text-navy">{borrower.full_name}</h2>
          <p className="text-gray-400 text-sm mb-2">{borrower.borrower_code}</p>
          <span className={`badge ${statusBadgeClass(borrower.status)}`}>{borrower.status}</span>
          <p className="text-xs text-gray-400 mt-2">
            {loans.length} loan{loans.length !== 1 ? 's' : ''} total
            {loans.filter((l) => l.status === 'active').length > 0 && (
              <> · <span className="text-teal font-semibold">{loans.filter((l) => l.status === 'active').length} active</span></>
            )}
          </p>
          <div className="text-left text-sm mt-4 space-y-1 text-gray-600">
            <p>📞 {borrower.phone}</p>
            <p>✉️ {borrower.email || '—'}</p>
            <p>🪪 NID: {borrower.nid_number || '—'}</p>
            <p>💼 {borrower.occupation || '—'}</p>
            <p>📍 {borrower.present_address || '—'}</p>
            <p>🤝 Guarantor: {borrower.guarantor_name || '—'} {borrower.guarantor_phone ? `(${borrower.guarantor_phone})` : ''}</p>
          </div>
          <div className="mt-4 flex gap-2">
            <Link href={`/borrowers/${id}/edit`} className="btn btn-outline flex-1">✏️ Edit</Link>
            <Link href={`/loans/new?borrower_id=${borrower.id}`} className="btn btn-primary flex-1">➕ New Loan</Link>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-4">
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

          <div id="documents" className="card p-5">
            <h3 className="font-semibold text-sm mb-3">Documents (Borrower &amp; Guarantor)</h3>

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
                        <button type="submit" className="text-[11px] text-red-500 hover:text-red-700">🗑 Delete</button>
                      </form>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <details className="border-t border-gray-100 pt-3">
              <summary className="cursor-pointer text-sm font-semibold text-teal">➕ Upload a document</summary>
              <form action={uploadAction} className="mt-3 space-y-3">
                <div>
                  <label className="label">Document Title *</label>
                  <input name="doc_title" required placeholder="e.g. NID Front Side" className="input" />
                </div>
                <div>
                  <label className="label">Document Type</label>
                  <select name="doc_type" className="input" defaultValue="borrower_nid">
                    <optgroup label="Borrower">
                      <option value="borrower_nid">Borrower NID / ID Card</option>
                      <option value="borrower_photo">Borrower Photo</option>
                      <option value="income_proof">Income Proof</option>
                      <option value="address_proof">Address Proof</option>
                    </optgroup>
                    <optgroup label="Guarantor">
                      <option value="guarantor_nid">Guarantor NID / ID Card</option>
                      <option value="guarantor_photo">Guarantor Photo</option>
                    </optgroup>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="label">File *</label>
                  <input name="file" type="file" accept="image/jpeg,image/png,image/webp,application/pdf" required className="input" />
                  <p className="text-xs text-gray-400 mt-1">JPG, PNG, WEBP, or PDF. Max 3MB.</p>
                </div>
                <button type="submit" className="btn btn-primary">Upload</button>
              </form>
            </details>
          </div>
        </div>
      </div>
    </div>
  );
}
