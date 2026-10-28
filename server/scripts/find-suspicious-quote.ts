import { readFileSync } from "fs";

const sql = readFileSync("backups/clean_import.sql", "utf8");
const lines = sql.split(/\r?\n/);
const line = lines[853];

// We know the line has unbalanced quotes.
// Let's step character by character and track when inString changes, and print any suspicious sequences.
let inString = false;
let escape = false;

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
    // When inString is FALSE, the next character should be ',' or ')' or ';' or whitespace!
    if (!inString) {
      const next = line[i + 1];
      if (next !== "," && next !== ")" && next !== ";" && next !== undefined) {
        console.log(`SUSPICIOUS CLOSING QUOTE at pos ${i}! Next char is '${next}'`);
        console.log(`Context:`, line.slice(Math.max(0, i - 30), i + 30));
      }
    }
  }
}
