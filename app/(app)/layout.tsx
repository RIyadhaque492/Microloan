import Link from 'next/link';
import { getSession } from '@/lib/auth';
import { getUnreadNotificationCount } from '@/lib/data';
import { logoutAction } from '@/lib/actions';

const navLink =
  'flex items-center gap-2.5 px-5 py-2 text-sm text-gray-200 hover:bg-white/10 hover:text-white rounded-lg mx-2';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  const unread = await getUnreadNotificationCount();

  return (
    <div className="flex min-h-screen">
      <aside className="w-64 bg-gradient-to-b from-navy to-navydark text-white flex flex-col fixed inset-y-0">
        <div className="px-5 py-5 text-lg font-bold border-b border-white/10 flex items-center gap-2">
          <span>💰</span> MicroLoan
        </div>
        <nav className="flex-1 py-3 space-y-0.5 overflow-y-auto">
          <Link href="/" className={navLink}>📊 Dashboard</Link>
          <div className="px-5 pt-4 pb-1 text-xs uppercase text-gray-400 font-semibold">Borrowers</div>
          <Link href="/borrowers" className={navLink}>👥 All Borrowers</Link>
          <Link href="/borrowers/new" className={navLink}>➕ Add Borrower</Link>
          <div className="px-5 pt-4 pb-1 text-xs uppercase text-gray-400 font-semibold">Loans</div>
          <Link href="/loans" className={navLink}>📄 All Loans</Link>
          <Link href="/loans/new" className={navLink}>🆕 Loan Registration</Link>
          <div className="px-5 pt-4 pb-1 text-xs uppercase text-gray-400 font-semibold">Collections</div>
          <Link href="/collections" className={navLink}>💵 Loan Collection</Link>
          <div className="px-5 pt-4 pb-1 text-xs uppercase text-gray-400 font-semibold">Reports</div>
          <Link href="/reports" className={navLink}>📑 Credit Reports</Link>
          <div className="px-5 pt-4 pb-1 text-xs uppercase text-gray-400 font-semibold">Alerts</div>
          <Link href="/notifications" className={`${navLink} justify-between`}>
            <span>🔔 Notifications</span>
            {unread > 0 && <span className="bg-red-500 text-white text-xs rounded-full px-2 py-0.5">{unread}</span>}
          </Link>
        </nav>
        <div className="p-4 border-t border-white/10">
          <div className="text-xs text-gray-300 mb-2">{session?.name} · {session?.role}</div>
          <form action={logoutAction}>
            <button className="text-sm text-red-300 hover:text-red-200">↩ Logout</button>
          </form>
        </div>
      </aside>

      <main className="flex-1 ml-64">
        <div className="p-6">{children}</div>
      </main>
    </div>
  );
}
