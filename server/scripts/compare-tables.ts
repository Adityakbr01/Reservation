import { readFileSync } from "fs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const dump = readFileSync("backups/reservation_mysql_dump.sql", "utf8");
  
  // Find all table names in reservation_mysql_dump.sql
  const tableMatches = [...dump.matchAll(/-- Table structure for table `([^`]+)`/g)].map(m => m[1]);
  console.log(`Tables in reservation_mysql_dump.sql (${tableMatches.length}):`, tableMatches);

  // Compare row counts in live DB vs dump
  for (const table of tableMatches) {
    try {
      const rows: any[] = await prisma.$queryRawUnsafe(`SELECT COUNT(*) as cnt FROM \`${table}\``);
      console.log(`Table ${table.padEnd(25)}: ${rows[0].cnt} rows in live DB`);
    } catch (e: any) {
      console.log(`Table ${table.padEnd(25)}: ERROR in live DB (${e.message})`);
    }
  }

  await prisma.$disconnect();
}

main();
