import { spawnSync } from "node:child_process";
import pg from "pg";

const failedMigration = "20261125180000_require_invited_password_change";
const MIGRATION_LOCK_ATTEMPTS = 5;

function execute(command, args, env = process.env) {
  const executable = process.platform === "win32" && command === "pnpm" ? "pnpm.cmd" : command;
  const result = spawnSync(executable, args, {
    stdio: "pipe",
    encoding: "utf8",
    maxBuffer: 10 * 1024 * 1024,
    shell: process.platform === "win32",
    env,
  });
  if (result.error) throw result.error;
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  return {
    status: result.status ?? 1,
    output: `${result.stdout ?? ""}\n${result.stderr ?? ""}`,
  };
}

function run(command, args, env = process.env) {
  const executable = process.platform === "win32" && command === "pnpm" ? "pnpm.cmd" : command;
  const result = spawnSync(executable, args, {
    stdio: "inherit",
    shell: process.platform === "win32",
    env,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}

function getMigrationDatabaseUrl() {
  const unpooled = process.env.DATABASE_URL_UNPOOLED?.trim();
  if (unpooled) return unpooled;

  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required to deploy database migrations.");
  const url = new URL(process.env.DATABASE_URL);
  // Neon pooled connections use transaction pooling, which cannot reliably
  // hold Prisma Migrate's session-level advisory lock. Neon direct endpoints
  // use the same endpoint hostname without the `-pooler` segment.
  if (url.hostname.includes("-pooler.")) {
    url.hostname = url.hostname.replace("-pooler.", ".");
  }
  return url.toString();
}

async function resolveKnownFailedMigration(databaseUrl, env) {
  const client = new pg.Client({ connectionString: databaseUrl });
  await client.connect();
  try {
    const { rows } = await client.query(
      `SELECT "finished_at", "rolled_back_at"
       FROM "_prisma_migrations"
       WHERE "migration_name" = $1
       ORDER BY "started_at" DESC
       LIMIT 1`,
      [failedMigration],
    );
    const latest = rows[0];
    if (latest && latest.finished_at == null && latest.rolled_back_at == null) {
      console.log(`Resolving failed migration ${failedMigration} as rolled back so Prisma can safely retry it.`);
      await runWithAdvisoryLockRetry("pnpm", ["exec", "prisma", "migrate", "resolve", "--rolled-back", failedMigration], env);
    }
  } catch (error) {
    if (error?.code !== "42P01") throw error;
    // A fresh database has no migration history yet; let Prisma report or create it.
  } finally {
    await client.end();
  }
}

function isAdvisoryLockTimeout(output) {
  return /P1002[\s\S]*advisory lock|timed out trying to acquire (?:a )?postgres advisory lock/i.test(output);
}

async function runWithAdvisoryLockRetry(command, args, env) {
  for (let attempt = 1; attempt <= MIGRATION_LOCK_ATTEMPTS; attempt += 1) {
    const result = execute(command, args, env);
    if (result.status === 0) return;

    if (!isAdvisoryLockTimeout(result.output) || attempt === MIGRATION_LOCK_ATTEMPTS) process.exit(result.status);

    const delayMs = 2_000 * 2 ** (attempt - 1);
    console.log(`Prisma migration advisory lock is busy. Retrying in ${delayMs / 1000}s (attempt ${attempt + 1}/${MIGRATION_LOCK_ATTEMPTS}).`);
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }
}

const migrationDatabaseUrl = getMigrationDatabaseUrl();
const migrationEnv = { ...process.env, DATABASE_URL: migrationDatabaseUrl };
await resolveKnownFailedMigration(migrationDatabaseUrl, migrationEnv);
await runWithAdvisoryLockRetry("pnpm", ["exec", "prisma", "migrate", "deploy"], migrationEnv);
run("pnpm", ["run", "build"]);
