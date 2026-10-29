import dotenv from "dotenv";
dotenv.config();

import { connectDatabase, prisma } from "../src/config/database";

async function main() {
  await connectDatabase();
  
  const tables: any = await prisma.$queryRawUnsafe(`
    SELECT table_name FROM information_schema.tables WHERE table_schema = 'reservation';
  `);

  console.log("Searching all tables in reservation DB...");
  const target1 = "588538e2f27befb6aa40f0da";
  const target2 = "QB-HYQ7NS";
  const target3 = "pi_3UVaMYA5UusZunBY1fJQxLor";

  for (const t of tables) {
    const tableName = t.table_name || t.TABLE_NAME;
    try {
      const rows: any = await prisma.$queryRawUnsafe(`SELECT * FROM \`${tableName}\`;`);
      const matched = rows.filter((r: any) => {
        const str = JSON.stringify(r);
        return str.includes(target1) || str.includes(target2) || str.includes(target3);
      });
      if (matched.length > 0) {
        console.log(`FOUND in table ${tableName}:`, matched);
      }
    } catch (e: any) {
      // ignore
    }
  }
  console.log("Search complete.");
}

main().catch(console.error).finally(() => prisma.$disconnect());
