import { readFileSync } from "fs";

const original = readFileSync("backups/reservation_mysql_dump.sql", "utf8");
const clean = readFileSync("backups/clean_import.sql", "utf8");

console.log("Original starts with:", JSON.stringify(original.slice(0, 80)));
console.log("Clean starts with:", JSON.stringify(clean.slice(0, 80)));

console.log("Original ends with:", JSON.stringify(original.slice(-80)));
console.log("Clean ends with:", JSON.stringify(clean.slice(-80)));

// Check which tables are in original vs clean
const origTables = [...original.matchAll(/-- Table structure for table `([^`]+)`/g)].map(m => m[1]);
const cleanTables = [...clean.matchAll(/-- Table structure for table `([^`]+)`/g)].map(m => m[1]);

console.log("Original table count:", origTables.length);
console.log("Clean table count:", cleanTables.length);

// Check if any CREATE TABLE statements differ in foreign keys or columns
for (const t of origTables) {
  const origCreate = original.match(new RegExp(`CREATE TABLE \`${t}\` \\([\\s\\S]+?\\) ENGINE=[^;]+;`));
  const cleanCreate = clean.match(new RegExp(`CREATE TABLE \`${t}\` \\([\\s\\S]+?\\) ENGINE=[^;]+;`));
  if (origCreate && cleanCreate && origCreate[0] !== cleanCreate[0]) {
    console.log(`Table structure differs for: ${t}`);
  }
}
