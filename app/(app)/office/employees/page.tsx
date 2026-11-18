import Link from 'next/link';
import { getEmployees } from '@/lib/employees';
import { deleteEmployeeAction } from '@/lib/actions';
import { money, formatDMY, sortByDate } from '@/lib/utils';
import PageHeader from '../../PageHeader';
import OrderBar from '../../OrderBar';

export const metadata = { title: 'Employees - MicroLoan Admin' };
export const dynamic = 'force-dynamic';

export default async function EmployeesPage({ searchParams }: { searchParams: { order?: string; q?: string; error?: string } }) {
  const q = (searchParams.q || '').trim();
  const emps = sortByDate(await getEmployees(q), searchParams.order, (e) => e.joining_date);
  return (
    <div className="flex flex-col h-[calc(100dvh-6.5rem)] lg:h-[calc(100dvh-3rem)]">
      <PageHeader title="Employees" showBack={false} action={<Link href="/office/employees/new" className="btn btn-primary">➕ New Employee</Link>} />
      {searchParams.error && <div className="mb-2 rounded-lg bg-red-50 text-red-700 text-sm px-3 py-2 flex-shrink-0">{searchParams.error}</div>}

      <div className="flex items-center justify-between gap-3 flex-wrap mb-2 flex-shrink-0">
        <form className="flex gap-2">
          <input name="q" defaultValue={q} className="input !w-64" placeholder="Search name, ID, designation, phone, NID" />
          {searchParams.order === 'desc' && <input type="hidden" name="order" value="desc" />}
          <button className="btn btn-outline">Search</button>
          {q && <Link href="/office/employees" className="btn btn-outline">Clear</Link>}
        </form>
        <OrderBar order={searchParams.order} />
      </div>

      <div className="table-wrap flex-1 min-h-0 !overflow-auto overscroll-contain [&_thead_th]:sticky [&_thead_th]:top-0 [&_thead_th]:z-10">
        <table className="app-table">
          <thead>
            <tr><th>ID</th><th>Name</th><th>Designation</th><th>Phone</th><th>NID</th><th>Joined</th><th className="text-right">Salary</th><th>Status</th><th></th></tr>
          </thead>
          <tbody>
            {emps.length === 0 && <tr><td colSpan={9} className="text-center text-gray-400 py-10">{q ? 'No employee matches your search.' : 'No employees yet — click “New Employee”.'}</td></tr>}
            {emps.map((e) => (
              <tr key={e.id}>
                <td className="whitespace-nowrap">{e.employee_code || '—'}</td>
                <td className="font-semibold"><Link href={`/office/employees/${e.id}`} className="hover:text-teal">{e.full_name}</Link></td>
                <td>{e.designation || '—'}</td>
                <td>{e.phone || '—'}</td>
                <td>{e.nid_no || '—'}</td>
                <td className="whitespace-nowrap">{e.joining_date ? formatDMY(e.joining_date) : '—'}</td>
                <td className="text-right font-semibold">{e.salary ? `৳${money(e.salary)}` : '—'}</td>
                <td><span className={`text-xs px-2 py-0.5 rounded-full ${e.status === 'Active' ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-600'}`}>{e.status}</span></td>
                <td className="whitespace-nowrap text-right">
                  <span className="inline-flex items-center gap-2">
                    <Link href={`/office/employees/${e.id}`} className="text-xs text-gray-500 hover:text-teal">View</Link>
                    <Link href={`/office/appointments/new?employee=${e.id}`} className="text-xs text-gray-500 hover:text-teal">Letter</Link>
                    <Link href={`/office/employees/${e.id}/edit`} className="text-xs text-gray-500 hover:text-teal">Edit</Link>
                    <form action={deleteEmployeeAction.bind(null, e.id)} className="inline">
                      <button className="text-xs text-red-500 hover:text-red-700 confirm-delete">🗑 Delete</button>
                    </form>
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
