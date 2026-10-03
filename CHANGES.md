# Microloan update — how to apply in Codespace

1. Copy these files over your project (same paths).
2. Run `migration_add_age_processing_fee.sql` once in the Neon SQL Editor (adds member age + loan processing fee).
3. `npm run dev` and test.

## What changed
- Dashboard: new **Total Payable** card (Other Revenue now also includes processing fees).
- All Members: Remove button taken out of the list. Member view page has **Remove** -> choose **Loan** or **Member**.
- Add Member: **Age** field; Registration Fee starts at 150 (editable). Age also in Edit + profile.
- All Loans: Disbursement Date after Loan Amount, old Tenure column removed, Progress renamed **Tenure**, coloured amounts, **Remove** button per row.
- Loan profile: 5 coloured cards (Loan Amount, Disbursement Date, Total Payable, Total Paid, Balance); flat interest card removed; **Edit** button (opens form again, schedule rebuilt, payments kept FIFO); Remove works on every loan.
- Loan Registration: **Processing Fee** box (auto 2%, editable); green tick "Registered successfully" on click and after saving.
- Loan Collection: red **Collect** -> green **Collected** with amount below; red again when next due date arrives; due loans first (oldest due first = FIFO), collected last; **search by date**; last payment date column kept.
- Transaction History: 5 cards, one-screen layout (table scrolls inside), receipts in order R0001, R0002..., **Delete** receipt (loan recalculates).
- Receipt page: **Delete Receipt**; PDF preview now full screen / fit page (report PDF too).
- Single-user report: Disbursement Date right after Loan Amount (screen, PDF, Excel, Word).
- Documents upload: photos are compressed in the browser before upload, clear error messages.
