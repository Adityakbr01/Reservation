import { readFileSync } from "fs";

const sql = readFileSync("backups/clean_import.sql", "utf8");
const lines = sql.split(/\r?\n/);
const line = lines[853]; // line 854

let inString = false;
let escape = false;
let currentStr = "";
let startPos = 0;

for (let i = 0; i < line.length; i++) {
  const ch = line[i];
  if (escape) {
    currentStr += ch;
    escape = false;
    continue;
  }
  if (ch === "\\") {
    currentStr += ch;
    escape = true;
    continue;
  }
  if (ch === "'") {
    if (!inString) {
      inString = true;
      startPos = i;
      currentStr = "";
    } else {
      inString = false;
      // String ended normally
    }
    continue;
  }
  if (inString) {
    currentStr += ch;
  }
}

if (inString) {
  console.log(`Unterminated string started at pos ${startPos}!`);
  console.log(`Content of string (first 200 chars):`, currentStr.slice(0, 200));
  console.log(`Content around startPos:`, line.slice(Math.max(0, startPos - 50), startPos + 100));
} else {
  console.log(`All strings properly closed!`);
}
