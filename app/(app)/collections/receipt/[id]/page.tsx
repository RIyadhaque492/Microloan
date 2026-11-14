import { notFound } from 'next/navigation';
import Link from 'next/link';
import { sql } from '@/lib/db';
import { getSiteSettings } from '@/lib/data';
import { money, amountInWords, titleCase, formatDMY } from '@/lib/utils';
import ReceiptExportButtons from './ReceiptExportButtons';
import PageHeader from '../../../PageHeader';
import { deleteCollectionAction } from '@/lib/actions';

export const metadata = { title: 'Payment Receipt - MicroLoan Admin' };

export default async function ReceiptPage({ params }: { params: { id: string } }) {
  const id = Number(params.id);
  if (!id || isNaN(id)) notFound();
  const [p] = await sql`
    SELECT c.*, b.full_name, b.phone, b.borrower_code, l.loan_code, l.installment_amount AS loan_installment, l.status AS loan_status
    FROM collections c
    JOIN borrowers b ON b.id = c.borrower_id
    JOIN loans l ON l.id = c.loan_id
    WHERE c.id = ${id}
  `;
  if (!p) notFound();
  // Fully paid = this payment covers the installment (or it closed the loan); anything less is a partial payment.
  const partial = !(p.loan_status === 'completed' || Number(p.loan_installment || 0) <= 0 || Number(p.amount_paid) + 0.005 >= Number(p.loan_installment));
  const receiptData = { ...p, is_partial: partial };
  const brand: any = await getSiteSettings();
  let docStyle: any = {};
  try { docStyle = brand?.doc_style ? JSON.parse(brand.doc_style) : {}; } catch {}
  const hs: any = { bold: true, italic: false, size: 'md', color: '#0F2A3F', align: 'left', ...(docStyle.header || {}) };
  const fsx: any = { bold: false, italic: false, size: 'md', color: '#3C4650', align: 'center', ...(docStyle.footer || {}) };
  const css = (st: any, k: 'h' | 'f'): React.CSSProperties => ({
    fontWeight: st.bold ? 700 : 400,
    fontStyle: st.italic ? 'italic' : 'normal',
    color: st.color,
    textAlign: st.align,
    fontSize: (k === 'h' ? { sm: 13, md: 15, lg: 19 } : { sm: 10, md: 11, lg: 13 })[st.size as 'sm' | 'md' | 'lg'],
  });
  const logoSrc = brand?.doc_logo_data ? `data:${brand.doc_logo_mime || 'image/png'};base64,${brand.doc_logo_data}` : '';

  const shareText = [
    `*MicroLoan Payment Receipt*`,
    `Receipt No: ${p.receipt_no}`,
    `Date: ${formatDMY(p.payment_date)}`,
    `Member: ${p.full_name} (${p.borrower_code})`,
    `Loan Code: ${p.loan_code}`,
    `Amount (In BDT): ${money(p.amount_paid)}`,
    `Amount in Words (BDT): ${amountInWords(p.amount_paid)}`,
    `Status: ${partial ? 'PARTIALLY PAID' : 'PAID'}`,
    `Method: ${titleCase(p.payment_method)}`,
  ].join('\n');

  return (
    <div className="max-w-md mx-auto">
      <PageHeader title="Payment Receipt" />
      <div className="card p-4 text-center border-2 border-navy/20">
        <div className="flex items-center gap-2 pb-2 mb-2 border-b-2" style={{ borderColor: hs.color }}>
          {logoSrc ? <img src={logoSrc} alt="" className="h-10 w-auto max-w-[110px] object-contain" /> : <span className="text-2xl">💰</span>}
          <div className="flex-1 leading-tight" style={{ textAlign: hs.align as any }}>
            <h2 style={css(hs, 'h')}>{brand?.doc_header_text || 'MicroLoan Admin'}</h2>
            <p className="text-teal text-xs font-semibold">Payment Receipt</p>
          </div>
        </div>

        <div className="text-left text-xs space-y-1">
          <Row label="Receipt No." value={p.receipt_no} />
          <Row label="Date" value={formatDMY(p.payment_date)} />
          <Row label="Member" value={`${p.full_name} (${p.borrower_code})`} />
          <Row label="Loan Code" value={p.loan_code} />
          <Row label="Method" value={titleCase(p.payment_method)} />
          {p.notes && <Row label="Notes" value={p.notes} />}
        </div>

        <div className="flex justify-between items-center rounded-lg px-3 py-2 my-3 border border-amber-300" style={{ backgroundColor: '#FFF6DC' }}>
          <span className="font-semibold text-sm">Amount (In BDT):</span>
          <span className="font-bold text-teal text-xl">{money(p.amount_paid)}</span>
        </div>
        <div className="text-left -mt-1 mb-3">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">Amount in Words (BDT):</div>
          <p className="font-bold text-teal text-xl leading-snug">{amountInWords(p.amount_paid)}</p>
        </div>

        <div className="flex justify-end mb-3 pr-2" aria-label="Paid">
          <div className={`-rotate-6 text-center border-4 border-double rounded-lg px-4 py-1 select-none ${partial ? 'border-red-600 text-red-600' : 'border-green-600 text-green-600'}`}>
            <div className={`font-extrabold leading-tight ${partial ? 'text-lg tracking-[0.12em] pl-[0.12em]' : 'text-2xl tracking-[0.25em] pl-[0.25em]'}`}>{partial ? 'PARTIALLY PAID' : 'PAID'}</div>
            <div className="text-[10px] font-semibold leading-none pb-0.5">{formatDMY(p.payment_date)}</div>
          </div>
        </div>

        {(brand?.doc_footer_address || brand?.doc_footer_contact || brand?.doc_footer_email) && (
          <div className="border-t pt-1.5 mb-3 leading-snug" style={{ borderColor: hs.color, ...css(fsx, 'f') }}>
            {brand?.doc_footer_address && <div>{brand.doc_footer_address}</div>}
            {brand?.doc_footer_contact && <div>{brand.doc_footer_contact}</div>}
            {brand?.doc_footer_email && <div>{brand.doc_footer_email}</div>}
          </div>
        )}

        <div className="flex flex-col gap-2">
          <ReceiptExportButtons receipt={receiptData} shareText={shareText} />
          <div className="grid grid-cols-3 gap-2">
            <Link href={`/collections/edit/${p.id}`} className="btn btn-outline !px-2 !py-1.5 text-xs">✏️ Edit</Link>
            <form action={deleteCollectionAction.bind(null, p.id)} className="contents">
              <button className="btn btn-danger-outline !px-2 !py-1.5 text-xs confirm-delete">🗑 Delete</button>
            </form>
            <Link href="/collections" prefetch={false} className="btn btn-primary !px-2 !py-1.5 text-xs">✔ Done</Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between border-b border-gray-100 pb-1">
      <span className="text-gray-500">{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
