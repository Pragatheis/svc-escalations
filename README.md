# Escalation Tracker

Self-contained web app for tracking operational escalations as a system of record.

The default dataset is generated from `/Users/praga/Desktop/Svc Escalation Log.xlsx`.

## Features

- Escalation intake form with manual entry
- Paste-to-parse ticket text helper
- List view with filters by customer, vendor, category, status, severity, owner, and week
- Detail view for history, actions, attachments, and notes
- Weekly review dashboard for open items, overdue actions, recently closed items, and trends
- Local persistence through `localStorage`
- Workbook snapshot regeneration via `python3 scripts/import_excel.py`

