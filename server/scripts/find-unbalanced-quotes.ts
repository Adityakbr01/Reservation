import { readFileSync } from "fs";

const sql = readFileSync("backups/clean_import.sql", "utf8");
const lines = sql.split(/\r?\n/);

console.log("Total lines:", lines.length);

for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
  const line = lines[lineIdx];
  // Count single quotes that are not preceded by backslash
  let quoteCount = 0;
  for (let i = 0; i < line.length; i++) {
    if (line[i] === "'") {
      // Check if preceded by odd number of backslashes
      let backslashes = 0;
      let j = i - 1;
      while (j >= 0 && line[j] === "\\") {
        backslashes++;
        j--;
      }
      if (backslashes % 2 === 0) {
        quoteCount++;
      }
    }
  }
  if (quoteCount % 2 !== 0) {
    console.log(`Line ${lineIdx + 1} has ODD quotes (${quoteCount}):`, line.slice(0, 100));
  }
}
