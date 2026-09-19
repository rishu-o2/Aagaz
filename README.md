# Aagaz University Sports Club

A working university sports-club website with registrations, fixture sign-ups, a live-score board, persistent local data, and a club-admin dashboard.

## Run it

1. In this folder, run `npm start`.
2. Open `http://localhost:3000` in your browser.

The public site stores applications, event registrations, contact messages, live scores, fixtures, and gallery tiles in `data/club-data.json`.

## Club admin

Use the **Club admin** link in the footer. For local development, the default password is `aagaz-admin-change-me`.

Before publishing, set a real password in your environment:

```powershell
$env:ADMIN_PASSWORD = "your-strong-password"
npm start
```
