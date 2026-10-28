import { readFileSync } from "fs";

const sql = readFileSync("backups/clean_import.sql", "utf8");
const lines = sql.split(/\r?\n/);
const line = lines[853]; // 0-indexed line 854

console.log("Line 854 length:", line.length);

// Let's find every single quote in line 854 and check its preceding character
for (let i = 0; i < line.length; i++) {
  if (line[i] === "'") {
    const prev = i > 0 ? line[i - 1] : "";
    if (prev !== "\\") {
      // Unescaped quote!
      // Print context around it
      console.log(`Unescaped quote at pos ${i}: ...${line.slice(Math.max(0, i - 20), i + 20)}...`);
    }
  }
}
