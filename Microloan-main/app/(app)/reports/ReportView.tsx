import { money, formatDMY, formatDMYTime } from '@/lib/utils';
import RegisterTable from './RegisterTable';

type Totals = { loanAmount: number; totalPayable: number; totalPaid: number; remaining: number; savings: number };

/** Navy banner with the report title (the on-screen version also shows the export buttons inside it). */
export function ReportBanner({ title, subtitle, children }: { title: string; subtitle: string; children?: React.ReactNode }) {
  return (
    <div className="bg-navy text-white px-5 py-4 flex flex-wrap justify-between items-center gap-3">
      <div>
        <h2 className="font-bold text-lg">{title}</h2>
        <p className="text-teal-100 text-xs opacity-90">{subtitle}</p>
      </div>
      {children}
    </div>
  );
}

export function SingleStatCards({ totals }: { totals: Totals }) {
  return (
    <div data-break className="grid grid-cols-2 md:grid-cols-5 gap-2 mb-3">
      <div className="rounded-lg border border-slate-300 px-3 py-1.5" style={{ backgroundColor: '#E0E7F1' }}><div className="text-[10px] text-navy">LOAN AMOUNT</div><div className="font-bold text-navy">৳{money(totals.loanAmount)}</div></div>
      <div className="rounded-lg border border-slate-300 px-3 py-1.5" style={{ backgroundColor: '#E0E7F1' }}><div className="text-[10px] text-navy">PAYABLE</div><div className="font-bold text-navy">৳{money(totals.totalPayable)}</div></div>
      <div className="rounded-lg border border-green-300 bg-green-50 px-3 py-1.5"><div className="text-[10px] text-green-700">PAID</div><div className="font-bold text-green-800">৳{money(totals.totalPaid)}</div></div>
      <div className="rounded-lg border border-red-300 bg-red-50 px-3 py-1.5"><div className="text-[10px] text-red-700">REMAINING</div><div className="font-bold text-red-800">৳{money(totals.remaining)}</div></div>
      <div className="rounded-lg border border-teal-300 px-3 py-1.5 col-span-2 md:col-span-1" style={{ backgroundColor: '#E6F6F5' }}><div className="text-[10px] text-teal-700">SAVINGS</div><div className="font-bold" style={{ color: '#0A5A56' }}>৳{money(totals.savings)}</div></div>
    </div>
  );
}

export function AllStatCards({ totals, compact = false }: { totals: Totals; compact?: boolean }) {
  if (compact) {
    // slim one-row version for the on-screen page, so the table starts higher up
    const cell = 'rounded-lg border px-3 py-1';
    return (
      <div data-break className="grid grid-cols-2 md:grid-cols-5 gap-2 mb-2">
        <div className={`${cell} border-sky-200 bg-sky-50`}><div className="text-[10px] text-sky-700 leading-tight">Total Loan Amount</div><div className="text-sm font-bold text-navy">৳{money(totals.loanAmount)}</div></div>
        <div className={`${cell} border-sky-200 bg-sky-50`}><div className="text-[10px] text-sky-700 leading-tight">Total Payable</div><div className="text-sm font-bold text-navy">৳{money(totals.totalPayable)}</div></div>
        <div className={`${cell} border-green-200 bg-green-50`}><div className="text-[10px] text-green-700 leading-tight">Total Paid</div><div className="text-sm font-bold text-green-800">৳{money(totals.totalPaid)}</div></div>
        <div className={`${cell} border-red-200 bg-red-50`}><div className="text-[10px] text-red-700 leading-tight">Total Remaining Balance</div><div className="text-sm font-bold text-red-800">৳{money(totals.remaining)}</div></div>
        <div className={`${cell} border-teal-300 col-span-2 md:col-span-1`} style={{ backgroundColor: '#E6F6F5' }}><div className="text-[10px] text-teal-700 leading-tight">Total Savings</div><div className="text-sm font-bold" style={{ color: '#0A5A56' }}>৳{money(totals.savings)}</div></div>
      </div>
    );
  }
  return (
    <div data-break className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-5">
      <div className="rounded-xl border border-sky-200 bg-sky-50 p-4"><div className="text-xs text-sky-700">Total Loan Amount</div><div className="text-lg font-bold text-navy">৳{money(totals.loanAmount)}</div></div>
      <div className="rounded-xl border border-sky-200 bg-sky-50 p-4"><div className="text-xs text-sky-700">Total Payable</div><div className="text-lg font-bold text-navy">৳{money(totals.totalPayable)}</div></div>
      <div className="rounded-xl border border-green-200 bg-green-50 p-4"><div className="text-xs text-green-700">Total Paid</div><div className="text-lg font-bold text-green-800">৳{money(totals.totalPaid)}</div></div>
      <div className="rounded-xl border border-red-200 bg-red-50 p-4"><div className="text-xs text-red-700">Total Remaining Balance</div><div className="text-lg font-bold text-red-800">৳{money(totals.remaining)}</div></div>
      <div className="rounded-xl border border-teal-300 p-4 col-span-2 md:col-span-1" style={{ backgroundColor: '#E6F6F5' }}><div className="text-xs text-teal-700">Total Savings</div><div className="text-lg font-bold" style={{ color: '#0A5A56' }}>৳{money(totals.savings)}</div></div>
    </div>
  );
}

export function PaymentHistoryTable({ payments, totalPayable }: { payments: any[]; totalPayable: number }) {
  let running = 0;
  const totalPaid = payments.reduce((s, p) => s + Number(p.amount_paid), 0);
  const last = payments[payments.length - 1];
  const finalRemaining = last ? (last.remaining_after != null ? Number(last.remaining_after) : Math.max(0, totalPayable - totalPaid)) : 0;
  return (
    <>
      <div data-break className="mt-6 text-center text-white font-bold text-sm py-2 rounded-t" style={{ backgroundColor: '#5B3DA3' }}>Payment History</div>
      <table className="app-table border-2 border-black [&_td]:!border-black [&_th]:!border-black">
        <thead>
          <tr>
            {['SL', 'Receipt No.', 'Particulars', 'Date', 'Amount Paid', 'Remaining Balance'].map((h) => (
              <th key={h} className="!text-center !normal-case !tracking-normal text-white border border-black" style={{ background: '#5B3DA3' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {payments.length === 0 && <tr><td colSpan={6} className="text-center text-gray-400 py-6">No payments recorded.</td></tr>}
          {payments.map((p, i) => {
            running += Number(p.amount_paid);
            const remaining = p.remaining_after != null ? Number(p.remaining_after) : Math.max(0, totalPayable - running);
            return (
              <tr key={p.id} className={`border border-black text-center font-bold ${i % 2 === 0 ? 'bg-sky-50' : 'bg-white'}`}>
                <td className="border border-black text-center font-bold">{i + 1}</td>
                <td className="border border-black text-center font-bold">{p.receipt_no}</td>
                <td className="border border-black text-center font-bold">{p.notes || 'Installment'}</td>
                <td className="border border-black text-center font-bold">{formatDMY(p.payment_date)}</td>
                <td className="border border-black text-center font-bold">৳{money(p.amount_paid)}</td>
                <td className="border border-black text-center font-bold">৳{money(remaining)}</td>
              </tr>
            );
          })}
          {payments.length > 0 && (
            <tr className="bg-tealight font-bold">
              <td className="border border-black text-center font-bold bg-teal-100 text-navy"></td>
              <td className="border border-black text-center font-bold bg-teal-100 text-navy"></td>
              <td className="border border-black text-center font-bold bg-teal-100 text-navy">TOTAL PAID</td>
              <td className="border border-black text-center font-bold bg-teal-100 text-navy"></td>
              <td className="border border-black text-center font-bold bg-teal-100 text-navy">৳{money(totalPaid)}</td>
              <td className="border border-black text-center font-bold bg-teal-100 text-navy">৳{money(finalRemaining)}</td>
            </tr>
          )}
        </tbody>
      </table>
    </>
  );
}

/** Everything inside a single-member report: summary cards, Loan Register and Payment History. */
export function SingleReportBody({ rows, payments, totals, plain = false }: { rows: any[]; payments: any[]; totals: Totals; plain?: boolean }) {
  return (
    <>
      <SingleStatCards totals={totals} />
      <div data-break className="text-white font-bold text-sm px-4 py-2 rounded-t text-center" style={{ backgroundColor: '#0F2A3F' }}>Loan Register</div>
      <RegisterTable rows={rows} headColor="#0F2A3F" maxHeight="max-h-[calc(100dvh-16rem)]" plain={plain} />
      <PaymentHistoryTable payments={payments} totalPayable={totals.totalPayable} />
    </>
  );
}

/** Everything inside the all-members report: summary cards and the gold register. */
export function AllReportBody({ rows, totals, plain = false, showActions = false }: { rows: any[]; totals: Totals; plain?: boolean; showActions?: boolean }) {
  return (
    <>
      <AllStatCards totals={totals} compact={!plain} />
      <div className="rounded-xl border-2 border-navy/10 overflow-hidden">
        <div data-break className={`bg-gold text-white px-5 ${plain ? 'py-3' : 'py-1.5'} font-semibold text-sm text-center`} style={{ backgroundColor: '#d99a2b' }}>All Loans Register — {rows.length} loan(s)</div>
        <div className={plain ? 'p-3 bg-white' : 'p-2 bg-white'}>
          <RegisterTable rows={rows} headColor="#D99A2B" showActions={showActions} maxHeight="max-h-[calc(100dvh-13.5rem)]" plain={plain} repeatHead={plain} />
        </div>
      </div>
    </>
  );
}

/** The exact page that gets captured into the PDF: same banner, cards and tables as the website. */
export function ReportPrintView({ mode, member, rows, payments, totals }: { mode: 'single' | 'all'; member?: any; rows: any[]; payments: any[]; totals: Totals }) {
  return (
    <div className="bg-white">
      <ReportBanner
        title={mode === 'single' ? 'Member Credit / Debt Report' : 'All Loans — Full Register'}
        subtitle={mode === 'single' && member ? `Generated: ${formatDMYTime()}  •  ${member.full_name} (${member.borrower_code})` : `Generated: ${formatDMYTime()}  •  ${rows.length} loan(s)`}
      />
      <div className="p-5 bg-white">
        {mode === 'single' ? <SingleReportBody rows={rows} payments={payments} totals={totals} plain /> : <AllReportBody rows={rows} totals={totals} plain />}
      </div>
    </div>
  );
}
