import PageHeader from '../PageHeader';
import ShareSettingsClient from './ShareSettingsClient';

export const metadata = { title: 'Share Settings - MicroLoan Admin' };
export const dynamic = 'force-dynamic';

export default function ShareSettingsPage() {
  return (
    <div>
      <PageHeader title="Share Settings" />
      <ShareSettingsClient />
    </div>
  );
}
