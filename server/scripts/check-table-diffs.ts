import { readFileSync } from "fs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const dump = readFileSync("backups/reservation_mysql_dump.sql", "utf8");
  const tables = [...dump.matchAll(/-- Table structure for table `([^`]+)`/g)].map(m => m[1]);

  console.log("Analyzing table differences...");

  for (const table of tables) {
    // Extract dump INSERT statement
    const regex = new RegExp(`LOCK TABLES \`${table}\` WRITE;[\\s\\S]*?UNLOCK TABLES;`, "m");
    const match = dump.match(regex);
    const hasInsertInDump = match && match[0].includes(`INSERT INTO \`${table}\``);

    // Get live count
    const liveCountArr: any[] = await prisma.$queryRawUnsafe(`SELECT COUNT(*) as cnt FROM \`${table}\``);
    const liveCount = Number(liveCountArr[0].cnt);

    if (!hasInsertInDump && liveCount === 0) {
      // Both empty
      continue;
    }

    console.log(`Table ${table}: in dump=${hasInsertInDump ? 'YES' : 'NO'}, live count=${liveCount}`);
  }

  await prisma.$disconnect();
}

main();
