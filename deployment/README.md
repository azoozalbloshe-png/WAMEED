# Free Render trial

Use the platform Google account (wameedplus@gmail.com) as owner of Render,
Neon, and the Google mail relay. Existing connected tools may belong to a personal
account: verify ownership before creating deployment resources.

## Resources

- One Render Free Docker web service, built from the repository root Dockerfile.
  It serves React and `/api` on one origin. It may sleep when idle.
- A Neon Free PostgreSQL project, preferably Frankfurt. All records and binary
  attachments live in PostgreSQL; nothing persistent depends on Render's local disk.
- A Google Apps Script web app under the platform Gmail. `deployment/google-mail/Code.gs`
  accepts timestamped HMAC-signed requests over HTTPS. Store a generated 32+ character
  `WAMEED_MAIL_SECRET` in Script Properties, and the identical secret in Render.
  Deploy as the owner, access Anyone. Authorization to send mail requires the owner.
  Consumer Google quotas currently allow 100 email recipients per day; this can
  change. Requests are replay-protected for the five-minute validity window.
- No paid AI service: leave `OPENAI_API_KEY` empty for direct account summaries.

## Render environment

Use `render.yaml` or create the web service using Docker, repository root context,
Free plan, and health check `/api/health`. Set `DATABASE_URL` to the Neon connection
string with `sslmode=require`, `SECRET_KEY` to a stable generated secret,
`BACKUP_ENABLED=false`, `EMAIL_DELIVERY=google_script`, `GOOGLE_MAIL_URL` to the
Google web app `/exec` URL, `GOOGLE_MAIL_SECRET` to the relay secret, and
`FRONTEND_URL` to the service's HTTPS address. The Dockerfile supplies the frontend path.

Local SMTP settings stay local. Gmail app passwords are not required on Render.
Do not upload `.env`, SQLite files, signing keys, local logs, or backups to Git or
Render. `.dockerignore` also excludes these from Docker build contexts.

## Validation before sharing

Use a fresh trial database rather than copying local customer records. Validate
registration, login, email code recovery, isolated accounts, contracts, payments,
attachments, and persistence across a redeploy. The Neon connection should use a
direct endpoint for additive startup migrations (this app is one small service).
Manual account data export remains available. Automatic SQLite snapshot/restore is
unavailable in this PostgreSQL deployment: use the Neon retention tools and account
exports instead. Export before exceeding free storage/retention limits.

The native Render tool requires the target workspace to be explicitly confirmed.
If a Blueprint workflow is used, review its planned resources before approving.

References:
- https://render.com/docs/free
- https://neon.com/pricing
- https://developers.google.com/apps-script/guides/services/quotas
- https://developers.google.com/apps-script/guides/web
