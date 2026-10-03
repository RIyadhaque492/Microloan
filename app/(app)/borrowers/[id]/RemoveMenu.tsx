'use client';

import { useState } from 'react';
import { deleteBorrowerAction, removeLoanFromMemberAction } from '@/lib/actions';

type LoanLite = { id: number; loan_code: string; loan_amount: string | number; status: string };

/** Remove button for the member profile: choose to remove either a loan or the whole member.
 *  Everything goes to the Bin and can be restored from the sidebar. */
export default function RemoveMenu({ borrowerId, memberName, loans }: { borrowerId: number; memberName: string; loans: LoanLite[] }) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<'choose' | 'loan'>('choose');

  function close() {
    setOpen(false);
    setStep('choose');
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="btn btn-danger-outline">🗑 Remove</button>

      {open && (
        <div className="fixed inset-0 z-[100] bg-black/50 flex items-end sm:items-center justify-center p-3" onClick={close}>
          <div className="bg-white rounded-2xl w-full max-w-sm p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-navy">{step === 'choose' ? 'What do you want to remove?' : 'Choose a loan to remove'}</h3>
              <button type="button" onClick={close} className="text-gray-400 text-xl leading-none" aria-label="Close">✕</button>
            </div>

            {step === 'choose' && (
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => setStep('loan')}
                  disabled={loans.length === 0}
                  className="w-full text-left rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 disabled:opacity-50"
                >
                  <div className="font-semibold text-amber-800">📄 Remove a Loan</div>
                  <div className="text-xs text-amber-700">{loans.length === 0 ? 'No loans on this member.' : 'Pick one of this member\u2019s loans.'}</div>
                </button>
                <form action={deleteBorrowerAction.bind(null, borrowerId)}>
                  <button className="w-full text-left rounded-xl border border-red-300 bg-red-50 px-4 py-3 confirm-delete">
                    <div className="font-semibold text-red-700">🗑 Remove Member</div>
                    <div className="text-xs text-red-600">Removes {memberName} and all their loans.</div>
                  </button>
                </form>
              </div>
            )}

            {step === 'loan' && (
              <div className="space-y-2 max-h-72 overflow-auto">
                {loans.map((l) => (
                  <form key={l.id} action={removeLoanFromMemberAction.bind(null, borrowerId, l.id)}>
                    <button className="w-full flex items-center justify-between rounded-xl border border-gray-200 px-4 py-3 text-left hover:bg-red-50 confirm-delete">
                      <span>
                        <span className="font-semibold text-navy block">{l.loan_code}</span>
                        <span className="text-xs text-gray-500">৳{Number(l.loan_amount).toLocaleString()} · {l.status}</span>
                      </span>
                      <span className="text-red-600 text-xs font-semibold">🗑 Remove</span>
                    </button>
                  </form>
                ))}
                <button type="button" onClick={() => setStep('choose')} className="text-xs text-gray-500 underline pt-1">← Back</button>
              </div>
            )}

            <p className="text-[11px] text-gray-400 mt-3">Moves to the Bin — restore anytime from 🗑 Bin in the sidebar.</p>
          </div>
        </div>
      )}
    </>
  );
}
