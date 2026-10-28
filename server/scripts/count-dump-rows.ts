import { readFileSync } from "fs";

const dump = readFileSync("backups/reservation_mysql_dump.sql", "utf8");

const tables = [...dump.matchAll(/-- Table structure for table `([^`]+)`/g)].map(m => m[1]);

for (const t of tables) {
  // Find INSERT INTO `table`
  const regex = new RegExp(`INSERT INTO \`${t}\` VALUES (.+?);`, "s");
  const match = dump.match(regex);
  if (match) {
    // Count tuples by counting ")," or starting "("
    const valuesStr = match[1];
    // A quick way: split on "),"
    const count = (valuesStr.match(/\),/g) || []).length + 1;
    console.log(`Dump table ${t.padEnd(25)}: ~${count} rows in dump`);
  } else {
    console.log(`Dump table ${t.padEnd(25)}: 0 rows (no INSERT)`);
  }
}
