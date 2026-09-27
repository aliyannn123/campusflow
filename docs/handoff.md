# Demo and technical handoff

## Five-minute demo

Use the disposable fixture described in the README.

1. Sign in as the student. Show the home dashboard, academic spaces and calendar. Open an assignment and mark it complete.
2. Sign in as faculty. Show assigned subjects and completion counts. Publish an announcement, create an assignment and answer a doubt.
3. Return to the student. Show the announcement/notification and discussion replies/reactions. Open Community and join the coding club.
4. Open Campus. Register for an event, acknowledge a notice, check placement eligibility or post a lost-and-found item.
5. Sign in as the administrator. Show academic setup, faculty approval, class representative assignment, club leadership, audience-targeted notices, event registrations and moderation/audit history.
6. Open Settings. Update a profile, change notification preferences and switch the theme.

Only synthetic accounts belong in this preview. The fixture's database is discarded when it stops.

## Architecture

The React client uses a shared Axios client for credentials/CSRF and TanStack Query for API state. Protected routes reflect the server's account state. Every backend operation independently enforces account status, memberships and roles.

MongoDB stores users, sessions, academic structure, membership, content, notifications and file metadata. Argon2 hashes passwords. OTPs are HMAC-protected, expiring and attempt-limited; reset links use one-time random tokens. Session versions revoke prior access after account/security changes.

Socket.IO shares the HTTP session. It checks membership when joining or sending typing events, and sends lightweight invalidation events; authorized REST queries load content. Logout disconnects the corresponding socket session.

Event registration uses a transaction for capacity and registration consistency. Poll votes serialize against poll closure. Unique indexes enforce one vote per user, one acknowledgement per user, notification deduplication and one active schedule exception per occurrence.

Files use generated storage keys and detected content types. Download routes recheck the target's visibility and the requesting user's membership. Local storage supports development; production requires private S3/R2.

## Main code locations

- `server/src/app.js`: middleware, route mounting, static production client.
- `server/src/modules/auth`, `users`: registration, verification, sessions, profiles.
- `server/src/modules/spaces`: workspace authorization and collaboration.
- `server/src/modules/admin`: validation and administration.
- `server/src/realtime`: socket sessions and room access.
- `server/src/jobs`: idempotent assignment reminders.
- `client/src/pages`: application screens.
- `client/src/features`: auth, administration and polls.
- `server/tests`, `client/tests`: automated regression checks.

## Operations and recovery

Use the Render guide for deployment and the implementation record for verified checks and limits. If initial onboarding has no departments, initialize academic data. If a faculty account remains pending, a college administrator must approve it. If mail fails, check the configured mode, sender verification and provider logs; do not weaken email verification.

Keep the same session/OTP secrets across restarts. Store backups in Atlas and keep storage private. Do not use production credentials in the disposable fixture. Do not run file cleanup against an unfamiliar database/bucket.

After deployment, record the public URL and complete the guide's live checks. Email-provider acceptance in tests does not prove real inbox delivery.
