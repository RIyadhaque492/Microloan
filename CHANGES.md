
# Batch 7
- Collect Payment: amount = loan-based (selected installment); method + notes = last entered for the SAME member; date = today.
- PDF previews show the page as an image fitted to the screen (one page = whole page, 100% fit). Needs `npm install` (adds pdfjs-dist).
- PDFs: receipt now coloured (ribbon, tinted label column, cream amount box).
- Settings > Report/Receipt: added Footer Email + text edit toolbar (bold, italic, size, colour, alignment) with live preview.
- Savings list: top cards (Total Savings, Deposit, Withdraw, Remaining), per-member Deposit/Withdraw/Remaining, View + Edit buttons.
- Savings profile redesigned like the loan profile (coloured cards).
- Run migration_add_document_branding.sql again (adds doc_footer_email, doc_style) - safe to re-run.
