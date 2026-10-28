import { readFileSync } from "fs";

const sql = readFileSync("backups/clean_import.sql", "utf8");
const lines = sql.split(/\r?\n/);
const line = lines[853];

let inString = false;
let escape = false;
let count = 0;

for (let i = 0; i < line.length; i++) {
  const ch = line[i];
  if (escape) {
    escape = false;
    continue;
  }
  if (ch === "\\") {
    escape = true;
    continue;
  }
  if (ch === "'") {
    inString = !inString;
    if (!inString) {
      const next = line[i + 1];
      if (next !== "," && next !== ")" && next !== ";" && next !== undefined) {
        console.log(`FIRST SUSPICIOUS QUOTE at pos ${i}! Next char is '${next}'`);
        console.log(`Context:`, line.slice(Math.max(0, i - 40), i + 40));
        count++;
        if (count >= 3) break;
      }
    }
  }
}
