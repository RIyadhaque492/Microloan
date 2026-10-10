import Link from 'next/link';
import { money, memberSerial, reportTotals } from '@/lib/utils';

function fmtDate(d: any) {
  if (!d) return '—';
  const dt = new Date(d);
  return isNaN(dt.getTime()) ? '—' : dt.toLocaleDateString();
}

/** The loan register used by every report screen — same columns, order and colours as the PDF:
 *  SL = member serial, ID beside the name, membership date, and a differently coloured Savings column last.
 *  Header stays on top and the TOTAL row stays at the bottom while the table scrolls. */
export default function RegisterTable({
  rows,
  headColor = '#0F2A3F',
  showActions = false,
  maxHeight = 'max-h-[60vh]',
}: {
  rows: any[];
  headColor?: string;
  showActions?: boolean;
  maxHeight?: string;
}) {
  const totals = reportTotals(rows);
  const cols = 14 + (showActions ? 1 : 0);
  const th = 'sticky top-0 z-10 text-white whitespace-nowrap';

  return (
    <div className={`overflow-auto overscroll-contain ${maxHeight} border border-gray-200 rounded-lg`}>
      <table className="app-table text-xs min-w-[1100px]">
        <thead>
          <tr>
            {['SL', 'Name (ID)', 'Membership Date', 'Loan Amount', 'Disbursement Date', 'Total Payable', 'Installment Amt', 'Tenure', 'Total Paid', 'Remaining Balance', 'Maturity Date', 'Last Payment Date', 'Contact'].map((h) => (
              <th key={h} className={`${th} ${['Loan Amount', 'Total Payable', 'Installment Amt', 'Total Paid', 'Remaining Balance'].includes(h) ? 'text-right' : ''}`} style={{ backgroundColor: headColor }}>{h}</th>
            ))}
            <th className={`${th} text-right`} style={{ backgroundColor: '#14958F' }}>Savings</th>
            {showActions && <th className={th} style={{ backgroundColor: headColor }}></th>}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr><td colSpan={cols} className="text-center text-gray-400 py-8">No disbursed loans found.</td></tr>
          )}
          {rows.map((r: any, i: number) => (
            <tr key={r.loan_id}>
              <td className="font-semibold">{memberSerial(r.borrower_code, i + 1)}</td>
              <td className="whitespace-nowrap">{r.full_name} <span className="text-gray-400">({r.borrower_code})</span></td>
              <td>{fmtDate(r.membership_date)}</td>
              <td className="text-right">৳{money(r.loan_amount)}</td>
              <td>{fmtDate(r.disbursement_date)}</td>
              <td className="text-right">৳{money(r.total_payable)}</td>
              <td className="text-right">৳{money(r.installment_amount)}</td>
              <td><span className="inline-block rounded-full bg-teal-50 text-teal-700 px-2 text-[11px] font-semibold">{r.paid_count ?? 0}/{r.total_count || r.tenure}</span></td>
              <td className="text-green-700 font-semibold text-right">৳{money(r.total_paid)}</td>
              <td className="text-red-600 font-semibold text-right">৳{money(r.remaining_balance)}</td>
              <td>{fmtDate(r.maturity_date)}</td>
              <td>{fmtDate(r.last_payment_date)}</td>
              <td>{r.phone}</td>
              <td className="font-bold text-right" style={{ backgroundColor: '#E6F6F5', color: '#0A5A56' }}>{r.savings_balance == null ? '—' : `৳${money(r.savings_balance)}`}</td>
              {showActions && (
                <td className="whitespace-nowrap">
                  <Link href={`/reports?mode=single&borrower=${r.borrower_id}`} className="text-xs text-teal hover:underline mr-2">View</Link>
                  <Link href={`/loans/${r.loan_id}`} className="text-xs text-gray-400 hover:text-teal">Loan</Link>
                </td>
              )}
            </tr>
          ))}
        </tbody>
        {rows.length > 0 && (
          <tfoot>
            <tr className="font-bold">
              {[
                ['', 1], ['TOTAL', 1], ['', 1], [`৳${money(totals.loanAmount)}`, 1], ['', 1], [`৳${money(totals.totalPayable)}`, 1], ['', 1], ['', 1],
                [`৳${money(totals.totalPaid)}`, 1], [`৳${money(totals.remaining)}`, 1], ['', 1], ['', 1], ['', 1],
              ].map(([v, _], idx) => (
                <td key={idx} className={`sticky bottom-0 z-10 bg-amber-100 text-navy border-t-2 border-amber-400 ${[3, 5, 8, 9].includes(idx) ? "text-right" : ""}`}>{v as string}</td>
              ))}
              <td className="sticky bottom-0 z-10 border-t-2 border-teal-500 font-bold text-right" style={{ backgroundColor: '#B2E2DE', color: '#0A5A56' }}>৳{money(totals.savings)}</td>
              {showActions && <td className="sticky bottom-0 z-10 bg-amber-100 border-t-2 border-amber-400"></td>}
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  );
}

/** Bottom bar with the grand totals — mirrors the footer bar of the PDF. */
export function TotalsBar({ rows, labelPrefix = '' }: { rows: any[]; labelPrefix?: string }) {
  const t = reportTotals(rows);
  return (
    <div className="bg-navy text-white px-5 py-3 flex flex-wrap justify-around gap-x-6 gap-y-1 text-sm">
      <span><strong>{labelPrefix}Loan Amount:</strong> ৳{money(t.loanAmount)}</span>
      <span><strong>Total Payable:</strong> ৳{money(t.totalPayable)}</span>
      <span><strong>Total Paid:</strong> ৳{money(t.totalPaid)}</span>
      <span><strong>Remaining:</strong> ৳{money(t.remaining)}</span>
      <span className="text-teal-200"><strong>Savings:</strong> ৳{money(t.savings)}</span>
    </div>
  );
}
