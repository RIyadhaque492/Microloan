import Link from 'next/link';
import { getNotifications, generateDueNotifications } from '@/lib/data';
import { markNotificationReadAction, markAllNotificationsReadAction } from '@/lib/actions';
import PageHeader from '../PageHeader';
import { formatDMYTime, sortByDate } from '@/lib/utils';
import OrderBar from '../OrderBar';

export const metadata = { title: 'Notifications - MicroLoan Admin' };

const ICONS: Record<string, string> = {
  due_soon: '⏰',
  overdue: '⚠️',
  payment_received: '✅',
};

export default async function NotificationsPage({ searchParams }: { searchParams: { type?: string; order?: string } }) {
  await generateDueNotifications();
  const notifications = sortByDate((await getNotifications(searchParams.type)) as any[], searchParams.order, (n) => n.created_at);

  return (
    <div>
      <PageHeader title="Notifications" showBack={false} action={
        <form action={markAllNotificationsReadAction}><button className="btn btn-outline !py-1.5 !px-3 text-xs">✔ Mark all read</button></form>
      } />

      <div className="flex gap-2 flex-wrap mb-4 items-center">
        <Link href="/notifications" className={`btn ${!searchParams.type ? 'btn-primary' : 'btn-outline'} !py-1.5 !px-3 text-xs`}>All</Link>
        <Link href="/notifications?type=due_soon" className={`btn ${searchParams.type === 'due_soon' ? 'btn-primary' : 'btn-outline'} !py-1.5 !px-3 text-xs`}>Due Soon</Link>
        <Link href="/notifications?type=overdue" className={`btn ${searchParams.type === 'overdue' ? 'btn-primary' : 'btn-outline'} !py-1.5 !px-3 text-xs`}>Overdue</Link>
        <Link href="/notifications?type=payment_received" className={`btn ${searchParams.type === 'payment_received' ? 'btn-primary' : 'btn-outline'} !py-1.5 !px-3 text-xs`}>Payments</Link>
        <span className="ml-auto"><OrderBar order={searchParams.order} keep={{ type: searchParams.type }} /></span>
      </div>

      <div className="table-wrap">
        {notifications.length === 0 && <p className="text-center text-gray-400 py-10">No notifications.</p>}
        {notifications.map((n) => (
          <div key={n.id} className={`flex items-start gap-3 p-4 border-b border-gray-100 ${n.is_read ? '' : 'bg-tealight/40'}`}>
            <div className="text-xl">{ICONS[n.type] || '🔔'}</div>
            <div className="flex-1">
              <p className="font-semibold text-sm">{n.title}</p>
              <p className="text-sm text-gray-600">{n.message}</p>
              <p className="text-xs text-gray-400 mt-1">{formatDMYTime(n.created_at)}</p>
            </div>
            {!n.is_read && (
              <form action={markNotificationReadAction.bind(null, n.id)}>
                <button className="btn btn-outline !py-1 !px-2 text-xs">Mark read</button>
              </form>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
