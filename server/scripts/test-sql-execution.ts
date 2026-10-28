import { readFileSync } from "fs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function splitSqlStatements(content: string): string[] {
  const lines = content.split(/\r?\n/);
  const codeLines: string[] = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith("--")) continue;
    codeLines.push(line);
  }
  const cleanContent = codeLines.join("\n");

  const stmts: string[] = [];
  let cur = "";
  let inString = false;
  let escape = false;

  for (let i = 0; i < cleanContent.length; i++) {
    const ch = cleanContent[i];
    if (escape) {
      cur += ch;
      escape = false;
      continue;
    }
    if (ch === "\\") {
      cur += ch;
      escape = true;
      continue;
    }
    if (ch === "'") {
      inString = !inString;
      cur += ch;
      continue;
    }
    if (ch === ";" && !inString) {
      const trimmed = cur.trim();
      if (trimmed.length > 0) {
        stmts.push(trimmed);
      }
      cur = "";
      continue;
    }
    cur += ch;
  }
  const last = cur.trim();
  if (last.length > 0) {
    stmts.push(last);
  }
  return stmts;
}

async function main() {
  const sql = readFileSync("backups/clean_import.sql", "utf8");
  const stmts = splitSqlStatements(sql);
  console.log(`Total executable statements: ${stmts.length}`);

  let drops = 0, creates = 0, inserts = 0;
  for (const s of stmts) {
    if (s.startsWith("DROP TABLE")) drops++;
    else if (s.startsWith("CREATE TABLE")) creates++;
    else if (s.startsWith("INSERT INTO")) inserts++;
  }

  console.log(`Statement Breakdown: Drops=${drops}, Creates=${creates}, Inserts=${inserts}`);

  const testTables = ["amenities", "media", "rateplans", "roomtypes"];
  for (const t of testTables) {
    const createStmt = stmts.find(s => s.startsWith(`CREATE TABLE \`${t}\``));
    const insertStmt = stmts.find(s => s.startsWith(`INSERT INTO \`${t}\``));

    if (!createStmt || !insertStmt) {
      throw new Error(`Missing create or insert for ${t}`);
    }

    // In MySQL, TEMPORARY tables cannot declare FOREIGN KEY constraints.
    // Strip lines with "CONSTRAINT ... FOREIGN KEY" for TEMPORARY table test only.
    const createLines = createStmt.split(/\r?\n/).filter(l => !l.includes("CONSTRAINT ") || !l.includes("FOREIGN KEY"));
    // Fix trailing comma before closing parenthesis if needed
    for (let i = createLines.length - 1; i >= 0; i--) {
      if (createLines[i].trim().startsWith(")")) {
        // Remove trailing comma from previous line
        let prev = createLines[i - 1].trimEnd();
        if (prev.endsWith(",")) {
          createLines[i - 1] = prev.slice(0, -1);
        }
        break;
      }
    }
    const cleanCreate = createLines.join("\n");

    const tempCreate = cleanCreate.replace(`CREATE TABLE \`${t}\``, `CREATE TEMPORARY TABLE \`_temp_test_${t}\``);
    const tempInsert = insertStmt.replace(`INSERT INTO \`${t}\``, `INSERT INTO \`_temp_test_${t}\``);

    console.log(`Testing MySQL execution for table: ${t}...`);
    try {
      await prisma.$executeRawUnsafe(tempCreate);
      await prisma.$executeRawUnsafe(tempInsert);
      const rows: any[] = await prisma.$queryRawUnsafe(`SELECT COUNT(*) as cnt FROM \`_temp_test_${t}\``);
      console.log(`  -> SUCCESS! Table ${t} created and populated with ${rows[0].cnt} rows!`);
      await prisma.$executeRawUnsafe(`DROP TEMPORARY TABLE \`_temp_test_${t}\``);
    } catch (e: any) {
      console.error(`  -> FAILED on table ${t}:`, e.message);
      process.exit(1);
    }
  }

  console.log("\n=========================================================");
  console.log("100% SUCCESS: All tested SQL statements executed cleanly on MySQL with 0 errors!");
  console.log("=========================================================");

  await prisma.$disconnect();
}

main().catch(err => {
  console.error("Fatal:", err);
  process.exit(1);
});
