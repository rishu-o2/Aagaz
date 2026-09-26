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

## Firebase participant authentication

Participants register individually for a tournament. They can sign in with email/password, Google, or phone OTP to see only registrations that match their verified account and university registration number. A tournament manager builds teams from approved entries in the staff dashboard; participants cannot create teams or change team rosters. Enable Email/Password, Google, and Phone in Firebase Console > Authentication > Sign-in method, add the app's domain to Authorized domains, and publish `firestore.rules`. Phone OTP also needs Firebase's reCAPTCHA/SMS setup.

University registration numbers are required for tournament entries and staff access. Staff continue to use their separate email/password workspace.

```powershell
Copy-Item .env.example .env.local
npm run dev
```

Without Firebase variables, local development falls back to the built-in JSON API so the rest of the application remains runnable.
