'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { loginAction } from '@/lib/actions';

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn btn-primary w-full py-2.5 disabled:opacity-60">
      {pending ? 'Signing in…' : 'Sign In'}
    </button>
  );
}

export default function LoginPage() {
  const [state, formAction] = useFormState(async (_prev: any, formData: FormData) => {
    return (await loginAction(formData)) || null;
  }, null);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-navydark to-navy px-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-sm">
        <div className="text-center mb-1">
          <div className="text-2xl font-extrabold text-navy">💰 MicroLoan</div>
        </div>
        <p className="text-center text-gray-500 text-sm mb-6">Admin Panel Sign In</p>

        {state?.error && (
          <div className="mb-4 rounded-lg bg-red-50 text-red-700 text-sm px-3 py-2">{state.error}</div>
        )}

        <form action={formAction} className="space-y-4">
          <div>
            <label className="label">Email address</label>
            <input type="email" name="email" required autoFocus className="input" placeholder="admin@microloan.com" />
          </div>
          <div>
            <label className="label">Password</label>
            <input type="password" name="password" required className="input" placeholder="••••••••" />
          </div>
          <SubmitButton />
        </form>
        <p className="text-center text-gray-400 text-xs mt-6">Default: admin@microloan.com / admin123</p>
      </div>
    </div>
  );
}
