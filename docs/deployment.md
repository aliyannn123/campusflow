# Deploy CampusFlow on Render

You currently have a Render account but no service. Nothing has been deployed by this implementation.

## Create the service

1. Put the reviewed code, including `render.yaml`, in your GitHub repository. Keep `server/.env` and credentials out of Git.
2. In the Render dashboard, choose **New → Blueprint**, connect the repository, and select the branch containing these changes. Render reads the root `render.yaml`. Review the service and plan before creating it. [Blueprint guide](https://render.com/docs/infrastructure-as-code)
3. Supply the requested environment variables in Render. Render generates SESSION_SECRET and OTP_PEPPER automatically.
4. Deploy the Blueprint. The single Node web service builds React, runs Express, serves the SPA and hosts Socket.IO. Leave Root Directory empty if configuring a Web Service manually.
5. After a successful deploy, copy the public `https://…onrender.com` URL for live verification.

| Variable | Value |
| --- | --- |
| MONGODB_URI | Dedicated Atlas database connection string; authorize Render's outbound addresses in Atlas |
| EMAIL_FROM | Plain sender email address verified in Brevo (no display name or angle brackets) |
| BREVO_API_KEY | Brevo API key, entered only in Render; not an SMTP key |
| EMAIL_FROM_NAME | CampusFlow (already set in the Blueprint) |
| S3_ENDPOINT | Your private S3 or R2 endpoint |
| S3_REGION | `auto` for R2; actual bucket region for AWS S3 |
| S3_BUCKET | Private bucket name |
| S3_ACCESS_KEY_ID / S3_SECRET_ACCESS_KEY | Bucket-scoped storage credentials |

EMAIL_MODE defaults to `brevo`: the backend calls the provider over HTTPS. Render free web services block outbound SMTP ports 25, 465 and 587, so SMTP on those ports will not work on the free plan. If you choose a paid service and your own SMTP provider, set EMAIL_MODE=smtp and supply SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_USER and SMTP_PASS instead. [Render free-service limits](https://render.com/docs/free)

In Brevo, open Settings → Senders, Domains, IPs → Senders, add CampusFlow with an email address you control, and verify the emailed code. Create an API key under Settings → SMTP & API → API Keys & MCP. Transactional sending may require account activation. For initial testing without a domain, Brevo temporarily rewrites free-email senders to a compliant address; this is not a permanent deliverability solution. [Sender setup](https://help.brevo.com/hc/en-us/articles/208836149-Create-a-new-sender-From-name-and-From-email), [sender-domain policy](https://help.brevo.com/hc/en-us/articles/14925263522578-Comply-with-Gmail-Yahoo-and-Microsoft-s-requirements-for-email-senders)

Resend remains supported with EMAIL_MODE=resend and RESEND_API_KEY, but requires a verified sending domain for general delivery. The email sender and the allowed student registration domain are separate settings: the app still accepts only `walchandsangli.ac.in` accounts.

CLIENT_ORIGIN defaults to Render's RENDER_EXTERNAL_URL. For a custom domain, set CLIENT_ORIGIN to its HTTPS origin with no trailing slash. Do not put server secrets in VITE variables. The app refuses production startup without durable storage and email configuration.

## Manual Web Service alternative

Use the same environment variables, Node 24.21.0, and:
- Build: `npm ci --prefix client --include=dev && npm run build --prefix client && npm ci --prefix server --omit=dev`
- Start: `npm start --prefix server`
- Health path: `/api/v1/health`

## First administrator and academic setup

For an empty database, run `npm run seed:academic --prefix server` from a trusted local environment pointed at the intended database. This creates illustrative AIML/CSE departments, programs, sections and Semester 5 subjects. Replace these with the college's actual structure in administration.

Register, verify and complete onboarding for your institutional account. Then run `npm run admin:grant --prefix server -- your-email@walchandsangli.ac.in` against that database. The command only grants access to an existing verified account. Never seed public demo accounts into production.

## Live release checks

- Health endpoint returns 200; direct reloads of /home and nested workspace URLs render.
- A real institutional email receives an OTP, verifies once, and can log in; replay fails.
- Login persists across refresh; logout and password reset revoke old access.
- Student, assigned faculty, coordinator and administrator permissions work.
- A different section's content remains inaccessible through API, search and file URLs.
- Two sessions receive realtime discussion and notification updates.
- An uploaded file survives a service restart and remains private.
- College timezone, academic year, sender identity and allowed domain are correct.

Free services can sleep. Reminder jobs run at startup and every five minutes while awake; use an always-on service for timely reminders. The current Socket.IO implementation targets one server instance. Multiple instances require a shared socket adapter and coordinated jobs. Run `npm run cleanup:files --prefix server` periodically from a trusted configured environment to remove stale attachment records/objects.

Sources: [Blueprint specification](https://render.com/docs/blueprint-spec), [Render web services](https://render.com/docs/web-services).
