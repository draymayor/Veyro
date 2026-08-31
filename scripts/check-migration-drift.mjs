#!/usr/bin/env node
// Compares supabase/migrations/ against what is actually applied on the
// live Supabase project, and fails loudly on any mismatch. See the
// Supabase section of docs/deployment.md for why this exists: this exact
// bug (a migration file merged locally but never pushed to the live
// database) has caused 6 separate silent feature failures on this
// project.
//
// Usage:
//   SUPABASE_DB_URL="postgresql://postgres:[PASSWORD]@db.<project-ref>.supabase.co:5432/postgres" \
//     node scripts/check-migration-drift.mjs
//
// SUPABASE_DB_URL must be the project's direct connection string (port
// 5432, not the pgbouncer/connection-pooler port), from Supabase
// dashboard -> Project Settings -> Database -> Connection string -> URI.
//
// Requires the Supabase CLI (`supabase`) to be installed and on PATH.

import { spawnSync } from "node:child_process";

const TIMESTAMP = /^\d{14}$/;

function fail(message) {
  console.error(`\nMigration drift check failed: ${message}\n`);
  process.exit(1);
}

const dbUrl = process.env.SUPABASE_DB_URL;
if (!dbUrl) {
  fail(
    "SUPABASE_DB_URL is not set. Point it at the live project's direct " +
      "database connection string (Supabase dashboard -> Project Settings " +
      "-> Database -> Connection string -> URI, port 5432, not the pooler).",
  );
}

const cli = spawnSync("supabase", ["migration", "list", "--db-url", dbUrl], {
  encoding: "utf8",
});

if (cli.error) {
  fail(
    `could not run the Supabase CLI (${cli.error.message}). Install it: ` +
      "https://supabase.com/docs/guides/cli/getting-started",
  );
}

if (cli.status !== 0) {
  console.error(cli.stdout);
  console.error(cli.stderr);
  fail("`supabase migration list` exited with an error, see output above.");
}

// The CLI renders a LOCAL | REMOTE | TIME (UTC) table using box-drawing
// characters, with each cell's value wrapped in backticks (at least in CLI
// versions that render it as markdown). Pull out any row where the first
// two cells look like migration timestamps (14 digits, e.g.
// 20240115093000) rather than depending on exact border/header formatting
// or backtick-wrapping, both of which the CLI has changed across versions.
const rows = [];
for (const line of cli.stdout.split("\n")) {
  const cells = line
    .split(/[│|]/)
    .map((cell) => cell.trim().replace(/^`+|`+$/g, ""));
  if (cells.length < 2) continue;
  const [local, remote] = cells;
  if (TIMESTAMP.test(local) || TIMESTAMP.test(remote)) {
    rows.push({ local, remote });
  }
}

if (rows.length === 0) {
  fail(
    "could not parse any migration rows from `supabase migration list` " +
      "output, its table format may have changed. Raw output:\n\n" +
      cli.stdout,
  );
}

const localOnly = rows.filter(
  (r) => TIMESTAMP.test(r.local) && !TIMESTAMP.test(r.remote),
);
const remoteOnly = rows.filter(
  (r) => TIMESTAMP.test(r.remote) && !TIMESTAMP.test(r.local),
);

if (localOnly.length > 0 || remoteOnly.length > 0) {
  console.error(
    "\nMigration drift detected between supabase/migrations/ and the live database:\n",
  );
  if (localOnly.length > 0) {
    console.error(
      "  Local migration files with no matching applied migration on the live project:",
    );
    for (const r of localOnly) console.error(`    - ${r.local}`);
  }
  if (remoteOnly.length > 0) {
    console.error(
      "  Migrations applied on the live project with no matching local file:",
    );
    for (const r of remoteOnly) console.error(`    - ${r.remote}`);
  }
  console.error(
    "\nFix: run `supabase db push --linked` to apply pending local " +
      "migrations, or `supabase migration repair` if the live project has " +
      "migrations not tracked locally.\n",
  );
  process.exit(1);
}

console.log(
  `Migration check passed: ${rows.length} migration(s) in sync between local files and the live database.`,
);
