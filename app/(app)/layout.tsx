import { getSession } from '@/lib/auth';
import { getUnreadNotificationCount } from '@/lib/data';
import Sidebar from './Sidebar';
import ConfirmDeleteHandler from './ConfirmDeleteHandler';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  const unread = await getUnreadNotificationCount();

  return (
    <div className="lg:flex min-h-screen">
      <ConfirmDeleteHandler />
      <Sidebar name={session?.name} role={session?.role} unread={unread} />
      <main className="flex-1 lg:ml-64">
        <div className="p-4 lg:p-6">{children}</div>
      </main>
    </div>
  );
}
