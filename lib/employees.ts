import { sql } from './db';

export const EMPLOYEE_FIELDS = [
  'employee_code', 'full_name', 'designation', 'phone', 'email', 'nid_no', 'date_of_birth', 'gender', 'marital_status', 'religion',
  'nationality', 'blood_group', 'father_name', 'mother_name', 'spouse_name', 'qualification', 'present_address', 'permanent_address',
  'joining_date', 'salary', 'status', 'emergency_name', 'emergency_phone', 'emergency_relation', 'bank_account', 'other_info',
] as const;

export type Employee = {
  id: number;
  employee_code: string;
  full_name: string;
  designation: string;
  phone: string;
  email: string;
  nid_no: string;
  date_of_birth: string; // YYYY-MM-DD or ''
  gender: string;
  marital_status: string;
  religion: string;
  nationality: string;
  blood_group: string;
  father_name: string;
  mother_name: string;
  spouse_name: string;
  qualification: string;
  present_address: string;
  permanent_address: string;
  joining_date: string; // YYYY-MM-DD or ''
  salary: number;
  status: string;
  emergency_name: string;
  emergency_phone: string;
  emergency_relation: string;
  bank_account: string;
  other_info: string;
};

export async function ensureEmployeeTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS employees (
      id SERIAL PRIMARY KEY,
      employee_code VARCHAR(50) NOT NULL DEFAULT '',
      full_name VARCHAR(150) NOT NULL,
      designation VARCHAR(100) NOT NULL DEFAULT '',
      phone VARCHAR(50) NOT NULL DEFAULT '',
      email VARCHAR(150) NOT NULL DEFAULT '',
      nid_no VARCHAR(50) NOT NULL DEFAULT '',
      date_of_birth DATE,
      gender VARCHAR(20) NOT NULL DEFAULT '',
      marital_status VARCHAR(30) NOT NULL DEFAULT '',
      religion VARCHAR(50) NOT NULL DEFAULT '',
      nationality VARCHAR(50) NOT NULL DEFAULT '',
      blood_group VARCHAR(10) NOT NULL DEFAULT '',
      father_name VARCHAR(150) NOT NULL DEFAULT '',
      mother_name VARCHAR(150) NOT NULL DEFAULT '',
      spouse_name VARCHAR(150) NOT NULL DEFAULT '',
      qualification VARCHAR(200) NOT NULL DEFAULT '',
      present_address VARCHAR(300) NOT NULL DEFAULT '',
      permanent_address VARCHAR(300) NOT NULL DEFAULT '',
      joining_date DATE,
      salary NUMERIC(12,2) NOT NULL DEFAULT 0,
      status VARCHAR(20) NOT NULL DEFAULT 'Active',
      emergency_name VARCHAR(150) NOT NULL DEFAULT '',
      emergency_phone VARCHAR(50) NOT NULL DEFAULT '',
      emergency_relation VARCHAR(50) NOT NULL DEFAULT '',
      bank_account VARCHAR(100) NOT NULL DEFAULT '',
      other_info TEXT NOT NULL DEFAULT '',
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )`;
}

const COLS = `id, employee_code, full_name, designation, phone, email, nid_no, to_char(date_of_birth, 'YYYY-MM-DD') AS date_of_birth,
  gender, marital_status, religion, nationality, blood_group, father_name, mother_name, spouse_name, qualification, present_address,
  permanent_address, to_char(joining_date, 'YYYY-MM-DD') AS joining_date, salary, status, emergency_name, emergency_phone,
  emergency_relation, bank_account, other_info`;

function shape(r: any): Employee {
  const o: any = { id: Number(r.id), salary: Number(r.salary || 0) };
  for (const f of EMPLOYEE_FIELDS) if (f !== 'salary') o[f] = r[f] == null ? '' : String(r[f]);
  return o as Employee;
}

export async function getEmployees(search = ''): Promise<Employee[]> {
  await ensureEmployeeTable();
  const q = search.trim();
  const rows: any[] = q
    ? await (sql as any)(
        `SELECT ${COLS} FROM employees WHERE full_name ILIKE $1 OR employee_code ILIKE $1 OR designation ILIKE $1 OR phone ILIKE $1 OR nid_no ILIKE $1
         ORDER BY joining_date ASC NULLS LAST, id ASC`, [`%${q}%`])
    : await (sql as any)(`SELECT ${COLS} FROM employees ORDER BY joining_date ASC NULLS LAST, id ASC`, []);
  return rows.map(shape);
}

export async function getEmployee(id: number): Promise<Employee | null> {
  await ensureEmployeeTable();
  const rows: any[] = await (sql as any)(`SELECT ${COLS} FROM employees WHERE id = $1`, [id]);
  return rows[0] ? shape(rows[0]) : null;
}
