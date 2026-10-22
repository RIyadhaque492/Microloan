
# Batch 8
- Reports (PDF, Excel, Word, screen): SL = member serial (Member ID number), ID beside the name, Member ID column removed, Membership Date added, Savings column added last (own colour). Totals row sticks at the bottom; totals bar includes savings; PDF has 5 coloured summary boxes.
- Collect payment: amount = the loan's installment amount (capped at what is still due).
- Receipt: amount in words under Amount Paid (screen, PDF, share text).
- Lists (Collection, Loans, Members): table fills the screen and scrolls inside.
- Suggestions: father's name, occupation, guarantor name (add + edit member), document title.

# Batch 9
- Report PDFs: totals bar at the bottom is now column-aligned (totals sit under their table columns, Savings in its own teal cell) on every page.

# Batch 10
- Keyboard arrows/PageUp/PageDown scroll the page content first (main area is the focused scroller).
- Search: member-ID group ("1-20, 25") + date range on Loans, Members, Savings; ID group on Collections.
- Savings posting form is landscape (one row above the history).
- Member view: details as colour boxes.
- Tenure progress follows installment amount (paid 1400 / installment 700 = 2).
- Report PDFs: money + Savings columns right-aligned, totals bar aligned.
- PDF/Excel/Word: separate Download button next to Share. PDF preview worker is now bundled (public/pdf.worker.min.js).

# Batch 11
- Keyboard scrolling fixed and tested in Chromium (arrows/PageUp/PageDown/Home/End scroll the page or the list table, even after clicking the sidebar).
- Reports page: search by text, member-ID group and disbursement date range (exports follow the filter).
- Report PDFs: totals sit directly under the table (last page), not in the footer; headers no longer cut words; Payment History is bold, centred, tinted.
- Receipt: amount in words has the same size/colour as Amount Paid; "Mobile Banking" style capitalisation for payment methods.
- PDF preview: zoom +/- and Fit.
- All tables use the boxed Transaction History design.

# Batch 12
- Savings page: "➕ Savings" button opens a quick form (pick member, deposit/withdrawal, amount, date, notes) and saves without opening the member profile.

# Batch 13
- Single-member report: member search with suggestions (ID / name / phone, opens when picked) + payment date range filter (running balance stays correct).
- Add/Edit member: Age suggestions.
- Report PDF + screen: "Payment History" bar centred with its own colour (purple).
- PDF preview: Fit = exactly 100% fit; +/- in 25% steps with a live % label.

# Batch 14
- All report dates (screen, PDF, Excel, Word, share text) and the receipt PDF date are dd-mm-yyyy; "Generated" shows dd-mm-yyyy, hh:mm AM/PM.

# Batch 15
- Every date in the app shows dd-mm-yyyy; every date box is a dd-mm-yyyy field (type digits, dashes auto, 📅 calendar) that still saves normally.
- Longer tables: compact page header, search bar and cards on Members, Loans, Collection, Savings and Reports.
- Single-member report screen now has the same 5 coloured summary cards as the PDF.
- reset_all_data.sql: wipes all data (keeps admin + settings). Run manually in Neon when ready.

# Batch 16
- Member profile picture: round photo on the member profile with a pencil button (add / change / remove). Photos are shrunk in the browser and stored in a new table (run migration_all_pending.sql).
- Dashboard no longer crashes if the processing_fee column is missing.
- Single-member report screen now follows the PDF order/colours: summary cards, navy Loan Register bar, alternating Payment History rows, light-teal TOTAL PAID; PDF register total row is the same amber as the screen.
- migration_all_pending.sql: one safe-to-rerun SQL with every pending change.

# Batch 22
- Report PDF is now a picture of the website report view itself (same colours, text, alignment, box sizes, taka sign). Landscape A4, header repeats on every page, saved header/footer added. Falls back to the drawn PDF if capturing fails.
- Website report screens share the same components as the PDF (reports/ReportView.tsx).
- Version stamp: Update 22.
