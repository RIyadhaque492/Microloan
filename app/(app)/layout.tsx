import { getSession } from '@/lib/auth';
import { getUnreadNotificationCount } from '@/lib/data';
import Sidebar from './Sidebar';
import ConfirmDeleteHandler from './ConfirmDeleteHandler';
import WrongPasswordBanner from './WrongPasswordBanner';
import MainFocus from './MainFocus';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  const unread = await getUnreadNotificationCount();

  return (
    <div className="lg:flex min-h-screen lg:h-screen lg:overflow-hidden">
      <ConfirmDeleteHandler />
      <WrongPasswordBanner />
      <MainFocus />
      <Sidebar name={session?.name} role={session?.role} unread={unread} />
      <main id="main-scroll" tabIndex={-1} className="flex-1 lg:ml-64 lg:h-screen lg:overflow-y-auto outline-none transition-[margin] duration-200 main-shift">
        <div className="p-4 lg:p-6">{children}</div>
      </main>
    </div>
  );
}
