import { sql } from './db';

export type AppointmentLetter = {
  id: number;
  letter_date: string; // YYYY-MM-DD or ''
  employee_name: string;
  designation: string;
  contact: string;
  effective_date: string; // YYYY-MM-DD or ''
  salary: number;
  organization: string;
  responsibilities: string;
  rules: string;
  signatory_name: string;
  signatory_title: string;
};

export async function ensureAppointmentTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS appointment_letters (
      id SERIAL PRIMARY KEY,
      letter_date DATE,
      employee_name VARCHAR(150) NOT NULL,
      designation VARCHAR(100) NOT NULL,
      contact VARCHAR(100) NOT NULL DEFAULT '',
      effective_date DATE,
      salary NUMERIC(12,2) NOT NULL DEFAULT 0,
      organization VARCHAR(200) NOT NULL DEFAULT '',
      responsibilities TEXT NOT NULL DEFAULT '',
      rules TEXT NOT NULL DEFAULT '',
      signatory_name VARCHAR(150) NOT NULL DEFAULT '',
      signatory_title VARCHAR(100) NOT NULL DEFAULT '',
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )`;
}

const COLS = `id, to_char(letter_date, 'YYYY-MM-DD') AS letter_date, employee_name, designation, contact,
  to_char(effective_date, 'YYYY-MM-DD') AS effective_date, salary, organization, responsibilities, rules, signatory_name, signatory_title`;

function shape(r: any): AppointmentLetter {
  return {
    id: Number(r.id),
    letter_date: r.letter_date || '',
    employee_name: r.employee_name || '',
    designation: r.designation || '',
    contact: r.contact || '',
    effective_date: r.effective_date || '',
    salary: Number(r.salary || 0),
    organization: r.organization || '',
    responsibilities: r.responsibilities || '',
    rules: r.rules || '',
    signatory_name: r.signatory_name || '',
    signatory_title: r.signatory_title || '',
  };
}

export async function getAppointments(): Promise<AppointmentLetter[]> {
  await ensureAppointmentTable();
  const rows: any[] = await (sql as any)(`SELECT ${COLS} FROM appointment_letters ORDER BY letter_date ASC NULLS LAST, id ASC`, []);
  return rows.map(shape);
}

export async function getAppointment(id: number): Promise<AppointmentLetter | null> {
  await ensureAppointmentTable();
  const rows: any[] = await (sql as any)(`SELECT ${COLS} FROM appointment_letters WHERE id = $1`, [id]);
  return rows[0] ? shape(rows[0]) : null;
}
