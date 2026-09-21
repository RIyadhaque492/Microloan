import { sql } from '@/lib/db';
import PageHeader from '../../PageHeader';
import LoanForm from './LoanForm';

export const metadata = { title: 'Loan Registration - MicroLoan Admin' };
export const dynamic = 'force-dynamic';

export default async function NewLoanPage({ searchParams }: { searchParams: { borrower_id?: string; error?: string } }) {
  const borrowers = await sql`SELECT id, full_name, borrower_code, phone FROM borrowers WHERE status = 'active' ORDER BY full_name`;
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div>
      <PageHeader title="Loan Registration" />
      {searchParams.error && <div className="mb-4 rounded-lg bg-red-50 text-red-700 text-sm px-3 py-2">{searchParams.error}</div>}
      <LoanForm borrowers={borrowers as any[]} preselectBorrowerId={Number(searchParams.borrower_id) || 0} today={today} />
    </div>
  );
}
