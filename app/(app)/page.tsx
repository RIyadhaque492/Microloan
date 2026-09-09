import Link from 'next/link';
import { getDashboardStats, generateDueNotifications } from '@/lib/data';
import { money, statusBadgeClass } from '@/lib/utils';
import PageHeader from './PageHeader';

const COLORS = {
  teal: 'bg-teal-100 text-teal-700',
  navy: 'bg-sky-100 text-sky-700',
  gold: 'bg-amber-100 text-amber-700',
  red: 'bg-red-100 text-red-700',
} as const;

function StatCard({ icon, label, value, color = 'teal' }: { icon: string; label: string; value: string; color?: keyof typeof COLORS }) {
  return (
    <div className="card p-4 flex items-center gap-3">
      <div className={`w-11 h-11 rounded-lg flex items-center justify-center text-xl ${COLORS[color]}`}>{icon}</div>
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

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-3">
        <StatCard icon="👥" label="Total Borrowers" value={String(stats.totalBorrowers)} color="teal" />
        <StatCard icon="📄" label="Active Loans" value={String(stats.activeLoans)} color="navy" />
        <StatCard icon="💵" label="Total Collected" value={`৳${money(stats.totalCollected)}`} color="gold" />
        <StatCard icon="⚠️" label="Overdue Installments" value={String(stats.overdueCount)} color="red" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <StatCard icon="📈" label="Total Disbursed" value={`৳${money(stats.totalDisbursed)}`} color="teal" />
        <StatCard icon="⏳" label="Outstanding Balance" value={`৳${money(stats.outstanding)}`} color="gold" />
        <StatCard icon="🕒" label="Pending Approval" value={String(stats.pendingLoans)} color="navy" />
        <Link href="/loans/new" className="card p-4 flex items-center justify-center bg-teal text-white font-semibold">
          ➕ New Loan
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
