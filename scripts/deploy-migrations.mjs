import { spawnSync } from "node:child_process";
import pg from "pg";

const failedMigration = "20261125180000_require_invited_password_change";

function run(command, args) {
  const executable = process.platform === "win32" && command === "pnpm" ? "pnpm.cmd" : command;
  const result = spawnSync(executable, args, {
    stdio: "inherit",
    shell: process.platform === "win32",
  });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}

async function resolveKnownFailedMigration() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required to deploy database migrations.");
  const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
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
      run("pnpm", ["exec", "prisma", "migrate", "resolve", "--rolled-back", failedMigration]);
    }
  } catch (error) {
    if (error?.code !== "42P01") throw error;
    // A fresh database has no migration history yet; let Prisma report or create it.
  } finally {
    await client.end();
  }
}

await resolveKnownFailedMigration();
run("pnpm", ["exec", "prisma", "migrate", "deploy"]);
run("pnpm", ["run", "build"]);
