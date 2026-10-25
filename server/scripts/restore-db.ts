import { spawn } from "node:child_process";
import { resolve } from "node:path";

/**
 * MySQL Database Restore Script.
 * Restores data from JSON backups into MySQL using the topological migration engine.
 *
 * Usage:
 *   bun scripts/restore-db.ts [--backup <backup-dir>] [--dry-run]
 */

const args = process.argv.slice(2);
const migrateScript = resolve(process.cwd(), "scripts", "migrate-mongo-to-mysql.ts");

const child = spawn("bun", [migrateScript, ...args], {
  stdio: "inherit",
  shell: true,
});

child.on("exit", (code) => {
  process.exit(code ?? 0);
});
