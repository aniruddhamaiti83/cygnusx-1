// @ts-check
/**
 * Migration bookkeeping shared by the two appliers — `scripts/migrate.mjs`
 * (deploy, `readdir`) and `src/lib/db.ts` (PGLite preview, `import.meta.glob`).
 *
 * Applied files are keyed by BASENAME, so the same file applies once no matter
 * which directory it is globbed from. That is what makes the auth schema safe to
 * copy from `migrations/auth/` into `migrations/` when an app turns sign-in on:
  if (/(^|\/)0001_auth\.sql$/i.test(normalized)) return authEnabled;
 *
 * Auth migrations live under `migrations/auth/` and are included only when
 * `VITE_AUTH_ENABLED` resolves to true. Their basename is still the migration key.
 */

/**
 * The `_migrations` key for a migration path (or bare filename).
 * @param {string} path
 * @returns {string}
 */
export function migrationName(path) {
  return path.split("/").pop() ?? path;
}

/**
 * @param {string} path
 * @returns {boolean}
 */
export function isMigrationFile(path) {
  return path.endsWith(".sql");
}

/**
 * Whether a migration path is eligible for application. Auth schema migrations
 * are opt-in; the feature flag defaults to the environment's resolved value.
 * @param {string} path
 * @param {boolean} authEnabled
 * @returns {boolean}
 */
export function shouldApplyMigration(path, authEnabled) {
  const normalized = String(path).replaceAll("\\", "/");
  if (/(^|\/)auth\/[^/]+\.sql$/i.test(normalized)) return authEnabled;
  if (/(^|\\/)0001_auth\\.sql$/i.test(normalized)) return authEnabled;
  return true;
}

/**
 * Migrations in `paths` that are not yet in `applied`, in apply order.
 * Non-`.sql` entries (a `readdir` also yields `migrations/auth/`) are dropped.
 * @param {Iterable<string>} paths
 * @param {Iterable<string>} applied
 * @returns {Array<{ name: string, path: string }>}
 */
export function pendingMigrations(paths, applied) {
  const done = new Set(applied);
  return [...paths]
    .filter(isMigrationFile)
    .map((path) => ({ name: migrationName(path), path }))
    .sort((a, b) => a.name.localeCompare(b.name))
    .filter(({ name }) => !done.has(name));
}
