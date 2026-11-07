# Automatic backups, customer exports, and recovery

The SQLite installation creates a verified full database snapshot when the service starts if no recent snapshot exists, then checks once per minute for the next daily snapshot. Defaults: enabled, every 24 hours, keep the newest 30 automatic/manual snapshots. Up to 30 pre-recovery safety snapshots are retained separately. The service must be running; if it was stopped past the due time, it takes a backup on startup.

`BACKUP_ENABLED`, `BACKUP_INTERVAL_HOURS`, `BACKUP_RETENTION_COUNT`, `BACKUP_DIR` configure this in the backend environment. The default folder is `$DATA_DIR/backups` or `backend/backups`. Docker already mounts the data directory. Keep the directory on durable private storage; these local snapshots do not protect against loss of the entire disk. Off-machine storage is not configured by this feature.

Files use SQLite's online backup API, not a copy of an open database. Each snapshot passes an integrity check, is atomically published, and has a SHA-256 manifest. The folder has mode 0700 and files 0600. Files and manifests are excluded from Git and the Docker build context. Full snapshots contain authentication data, so they have no customer download route and must remain private. The worker retries failures each minute; the administration panel reports failures and shows the latest saved snapshot. A shared file lock prevents duplicate due backups from multiple workers on the same machine.

## Customer export

Settings → Export your account data. The server verifies `CustomerAccount.owner_user_id` rather than granting export to every administrator or employee. ZIP contains `data.json`, a bilingual README, and attachments under numeric IDs; original filenames are metadata, never ZIP paths. Includes all ten business tables, including archived rows. No password hashes, reset/verification tokens, user authentication data, roles, or subscription configuration. The download is audited and sent without cache storage. This export is a portable customer data copy, not an import or recovery command.

## Administration recovery

Developer console → Backups and recovery. Platform superusers can create a backup, select a managed snapshot and customer account, preview record counts, enter the exact account name, and confirm recovery. Normal customer administrators cannot access these endpoints.

Recovery restores only the selected account's ten business tables. Users, credentials, permissions, subscriptions, audit history, and other customer accounts are preserved. The preview is signed, bound to the actor/account/snapshot/current data, and expires after ten minutes. Changes after preview require a fresh preview. Recovery re-verifies the snapshot, rejects incompatible schemas, invalid links and cross-account conflicts, saves a mandatory pre-recovery snapshot, and uses one SQLite write transaction. Any insertion failure rolls back the complete replacement. Recovery and its safety snapshot ID are audited. An account must exist both now and in the selected snapshot. Recovery never reads uploaded files or user-provided filesystem paths.

To undo an account recovery, select its `Before recovery` safety snapshot and preview/restore that same account. For whole-server disaster recovery, stop all service processes and have an operator verify the saved manifest and SQLite integrity before replacing the database file at `DATABASE_URL`; retain the current database and environment/signing keys separately. This offline operation is deliberately not exposed in the customer or administration UI.

## Verification

`../.venv/bin/python -m pytest app/tests/test_backups.py -q` from `backend/` tests daily scheduling and retention, private file modes and integrity checks, owner-only account export with archived records and attachment bytes, privilege boundaries, account isolation, mandatory safety snapshots, stale/tampered previews, and complete transactional rollback on restore failure. Tests use isolated databases and temporary backup folders.
