'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { logoutAction } from '@/lib/actions';

export default function Sidebar({ name, role, unread }: { name?: string; role?: string; unread: number }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  function linkClass(active: boolean, extra = '') {
    const base = 'flex items-center gap-2.5 px-5 py-2 text-sm rounded-r-lg mx-0 pl-4 border-l-[3px]';
    return active
      ? `${base} border-teal bg-teal-600/25 text-white font-semibold ${extra}`
      : `${base} border-transparent text-gray-200 hover:bg-white/10 hover:text-white ${extra}`;
  }

  const isDashboard = pathname === '/';
  const isBorrowersList = pathname.startsWith('/borrowers') && pathname !== '/borrowers/new';
  const isBorrowersNew = pathname === '/borrowers/new';
  const isLoansList = pathname.startsWith('/loans') && pathname !== '/loans/new';
  const isLoansNew = pathname === '/loans/new';
  const isCollections = pathname.startsWith('/collections');
  const isReports = pathname.startsWith('/reports');
  const isNotifications = pathname.startsWith('/notifications');

  return (
    <>
      {/* Mobile topbar — only shown below the lg breakpoint */}
      <div className="lg:hidden sticky top-0 z-30 flex items-center justify-between bg-navy text-white px-4 py-3">
        <button onClick={() => setOpen(true)} aria-label="Open menu" className="text-2xl leading-none px-1">☰</button>
        <div className="font-bold flex items-center gap-2">💰 MicroLoan</div>
        <Link href="/notifications" className="relative text-xl px-1">
          🔔
          {unread > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] rounded-full px-1.5 leading-4">{unread}</span>
          )}
        </Link>
      </div>

      {open && <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setOpen(false)} />}

      <aside
        className={`w-64 bg-gradient-to-b from-navy to-navydark text-white flex flex-col fixed inset-y-0 z-50
          transition-transform duration-200 ease-in-out
          ${open ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}
      >
        <div className="px-5 py-5 text-lg font-bold border-b border-white/10 flex items-center justify-between">
          <span className="flex items-center gap-2">💰 MicroLoan</span>
          <button onClick={() => setOpen(false)} className="lg:hidden text-xl px-1" aria-label="Close menu">✕</button>
        </div>

        <nav className="flex-1 py-3 space-y-0.5 overflow-y-auto" onClick={() => setOpen(false)}>
          <Link href="/" className={linkClass(isDashboard)}>📊 Dashboard</Link>

          <div className="px-5 pt-4 pb-1 text-xs uppercase text-gray-400 font-semibold">Borrowers</div>
          <Link href="/borrowers" className={linkClass(isBorrowersList)}>👥 All Borrowers</Link>
          <Link href="/borrowers/new" className={linkClass(isBorrowersNew)}>➕ Add Borrower</Link>

          <div className="px-5 pt-4 pb-1 text-xs uppercase text-gray-400 font-semibold">Loans</div>
          <Link href="/loans" className={linkClass(isLoansList)}>📄 All Loans</Link>
          <Link href="/loans/new" className={linkClass(isLoansNew)}>🆕 Loan Registration</Link>

          <div className="px-5 pt-4 pb-1 text-xs uppercase text-gray-400 font-semibold">Collections</div>
          <Link href="/collections" className={linkClass(isCollections)}>💵 Loan Collection</Link>

          <div className="px-5 pt-4 pb-1 text-xs uppercase text-gray-400 font-semibold">Reports</div>
          <Link href="/reports" className={linkClass(isReports)}>📑 Credit Reports</Link>

          <div className="px-5 pt-4 pb-1 text-xs uppercase text-gray-400 font-semibold">Alerts</div>
          <Link href="/notifications" className={linkClass(isNotifications, 'justify-between')}>
            <span>🔔 Notifications</span>
            {unread > 0 && <span className="bg-red-500 text-white text-xs rounded-full px-2 py-0.5">{unread}</span>}
          </Link>
        </nav>

        <div className="p-4 border-t border-white/10">
          <div className="text-xs text-gray-300 mb-2">{name} · {role}</div>
          <form action={logoutAction}>
            <button className="text-sm text-red-300 hover:text-red-200">↩ Logout</button>
          </form>
        </div>
      </aside>
    </>
  );
}
