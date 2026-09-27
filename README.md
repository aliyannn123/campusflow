# CampusFlow

CampusFlow brings academic work and campus activity into one private college workspace. Registration is restricted to **walchandsangli.ac.in**. Faculty accounts require administrator approval.

## Features

- Persistent accounts, emailed OTP verification, session login/logout, password reset and academic onboarding.
- Class, subject and club memberships with server-enforced permissions.
- Announcements, realtime discussions, replies, reactions, mentions, doubts and accepted answers.
- Resources, private uploads, bookmarks, assignment progress and deadline reminders.
- Weekly schedules, single-day exceptions, calendar and class polls.
- Clubs and approvals, events with capacity limits, targeted notices and acknowledgements, placement eligibility and applied tracking, lost and found.
- Student/faculty dashboards, notification preferences, search, editable profiles and light/dark responsive layouts.
- Administration for academic structure, user approval/roles/profiles, class representatives, club leadership, campus content, moderation, audit history and college branding.

## Local development

Use Node 24 and a MongoDB replica set (Atlas works). Transactions protect event registrations, club leadership transfers and poll voting.

1. Install dependencies:
   ```powershell
   npm ci --prefix server
   npm ci --prefix client
   ```
2. If it does not already exist, copy `server/.env.example` to `server/.env`. Preserve an existing file. Fill in your MongoDB URI and distinct random SESSION_SECRET and OTP_PEPPER values of at least 32 characters.
3. Keep EMAIL_MODE=console for development: OTPs and reset links appear in the server terminal. Never use console delivery in production.
4. For an empty development database, optionally run the illustrative academic seed:
   ```powershell
   npm run seed:academic --prefix server
   ```
5. In separate terminals:
   ```powershell
   npm run dev --prefix server
   npm run dev --prefix client
   ```
6. Open http://localhost:5173. Register, verify your email and complete onboarding. To initialize the first administrator, run:
   ```powershell
   npm run admin:grant --prefix server -- your-email@walchandsangli.ac.in
   ```

An administrator sets up the institution's real departments/programs/sections/subjects and assigns faculty to offerings. The optional seed is illustrative, not an official Walchand curriculum.

## Checks

Run from the repository root. The production-route test requires the client build.

```powershell
npm run build --prefix client
npm test --prefix server
npm run lint --prefix client
npm test --prefix client
```

Backend tests use an isolated in-memory MongoDB replica set. The first run downloads a MongoDB binary; it never connects to your configured application database. No real emails are sent. Tests cover authorization, OTP replay, sessions, CSRF, private search/files, password reset, concurrent registration, mentions/reminders, sockets, schedules and production routing. GitHub Actions runs the same checks.

## Safe demo

```powershell
npm run preview:fixture --prefix server
```

In a second PowerShell terminal:

```powershell
$env:VITE_PROXY_TARGET = "http://127.0.0.1:5010"
npm run dev --prefix client -- --port 5174
```

Open http://localhost:5174. Synthetic accounts are `student@walchandsangli.ac.in`, `faculty@walchandsangli.ac.in`, and `admin@walchandsangli.ac.in`, all with password `CampusFlow-demo-2026`. These exist only in the disposable preview database. Stopping the fixture discards it. Never run this fixture on a public service.

## Architecture and handoff

React + Vite + Tailwind, Axios and TanStack Query run the client. Express + Mongoose serve the API; MongoDB stores users, sessions and domain records. Socket.IO publishes authenticated invalidation events. File downloads recheck membership and target status. Production files use private S3/R2 storage.

- [Render deployment guide](docs/deployment.md)
- [Implementation and verification record](docs/implementation-progress.md)
- [Demo walkthrough and operational notes](docs/handoff.md)

The Render Blueprint is prepared; no service has been created or deployed. External email delivery, durable-storage persistence and live HTTPS behavior still require provider setup and verification.
