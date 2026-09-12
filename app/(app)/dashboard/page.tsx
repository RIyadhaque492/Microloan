import Link from 'next/link';
import { getDashboardStats, generateDueNotifications } from '@/lib/data';
import { money, statusBadgeClass } from '@/lib/utils';
import PageHeader from '../PageHeader';

export const metadata = { title: 'Dashboard - MicroLoan Admin' };

const COLORS = {
  teal: { chip: 'bg-teal-100 text-teal-700', border: 'border-l-teal-500' },
  navy: { chip: 'bg-sky-100 text-sky-700', border: 'border-l-sky-500' },
  gold: { chip: 'bg-amber-100 text-amber-700', border: 'border-l-amber-500' },
  red: { chip: 'bg-red-100 text-red-700', border: 'border-l-red-500' },
  purple: { chip: 'bg-purple-100 text-purple-700', border: 'border-l-purple-500' },
  green: { chip: 'bg-green-100 text-green-700', border: 'border-l-green-500' },
} as const;

function StatCard({ icon, label, value, color = 'teal' }: { icon: string; label: string; value: string; color?: keyof typeof COLORS }) {
  const c = COLORS[color];
  return (
    <div className={`card p-4 flex items-center gap-3 border-l-4 ${c.border}`}>
      <div className={`w-11 h-11 rounded-lg flex items-center justify-center text-xl ${c.chip}`}>{icon}</div>
      <div>
        <div className="text-xl font-bold text-navy">{value}</div>
        <div className="text-xs text-gray-500">{label}</div>
      </div>
    </div>
  );
}

export default async function DashboardPage() {
  await generateDueNotifications();
  const stats = await getDashboardStats();

  return (
    <div>
      <PageHeader title="Dashboard" showBack={false} />

      <div className="rounded-xl bg-gradient-to-r from-navy via-teal-700 to-teal-600 text-white p-5 mb-4 flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-bold">Welcome back 👋</h2>
          <p className="text-teal-50 text-sm opacity-90">Here's how your loan book looks today.</p>
        </div>
        <Link href="/loans/new" className="btn bg-white text-navy hover:bg-gray-100 font-semibold">➕ Register New Loan</Link>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-3">
        <StatCard icon="👥" label="Total Borrowers" value={String(stats.totalBorrowers)} color="teal" />
        <StatCard icon="📄" label="Active Loans" value={String(stats.activeLoans)} color="navy" />
        <StatCard icon="💵" label="Total Collected" value={`৳${money(stats.totalCollected)}`} color="green" />
        <StatCard icon="⚠️" label="Overdue Installments" value={String(stats.overdueCount)} color="red" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <StatCard icon="📈" label="Total Disbursed" value={`৳${money(stats.totalDisbursed)}`} color="purple" />
        <StatCard icon="⏳" label="Outstanding Balance" value={`৳${money(stats.outstanding)}`} color="gold" />
        <StatCard icon="🕒" label="Pending Approval" value={String(stats.pendingLoans)} color="navy" />
        <Link href="/calculator" className="card p-4 flex items-center justify-center bg-navy text-white font-semibold hover:bg-navydark transition-colors">
          🧮 Loan Calculator
        </Link>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="table-wrap">
          <div className="px-4 py-3 border-b border-gray-100 font-semibold text-sm flex justify-between">
            Recent Loans <Link href="/loans" className="text-teal text-xs font-normal">View all</Link>
          </div>
          <table className="app-table">
            <thead><tr><th>Loan Code</th><th>Borrower</th><th>Amount</th><th>Status</th></tr></thead>
            <tbody>
              {(stats.recentLoans as any[]).length === 0 && (
                <tr><td colSpan={4} className="text-center text-gray-400 py-6">No loans yet.</td></tr>
              )}
              {(stats.recentLoans as any[]).map((l) => (
                <tr key={l.id}>
                  <td><Link href={`/loans/${l.id}`} className="text-teal">{l.loan_code}</Link></td>
                  <td>{l.full_name}</td>
                  <td>৳{money(l.loan_amount)}</td>
                  <td><span className={`badge ${statusBadgeClass(l.status)}`}>{l.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="table-wrap">
          <div className="px-4 py-3 border-b border-gray-100 font-semibold text-sm flex justify-between">
            Installments Due (Next 7 Days) <Link href="/collections" className="text-teal text-xs font-normal">Collect</Link>
          </div>
          <table className="app-table">
            <thead><tr><th>Borrower</th><th>Due</th><th>Amount</th><th></th></tr></thead>
            <tbody>
              {(stats.upcoming as any[]).length === 0 && (
                <tr><td colSpan={4} className="text-center text-gray-400 py-6">No upcoming dues.</td></tr>
              )}
              {(stats.upcoming as any[]).map((i) => (
                <tr key={i.id}>
                  <td>{i.full_name}<div className="text-xs text-gray-400">{i.phone}</div></td>
                  <td>{new Date(i.due_date).toLocaleDateString()}<div><span className={`badge ${statusBadgeClass(i.status)}`}>{i.status}</span></div></td>
                  <td>৳{money(Number(i.amount) - Number(i.paid_amount))}</td>
                  <td><Link href={`/collections/${i.loan_id}?installment_id=${i.id}`} className="btn btn-outline !py-1 !px-2 text-xs">Collect</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
