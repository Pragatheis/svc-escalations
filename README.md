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

## Run

Open `/Users/praga/Desktop/Partssource/Codex/index.html` in a browser.

## Refresh From Excel

Run `python3 scripts/import_excel.py` to rebuild `data.js` from the workbook.

## Deploy To GitHub Pages

1. Create a GitHub repository and push this folder to the `main` branch.
2. In GitHub, open `Settings > Pages`.
3. Set `Source` to `GitHub Actions`.
4. Push to `main` again or run the `Deploy Static Site to GitHub Pages` workflow manually.
5. GitHub will publish the site at `https://<your-user>.github.io/<repo-name>/`.

The workflow file is at `.github/workflows/deploy-pages.yml`.
