import dotenv from "dotenv";
dotenv.config();

import { connectDatabase, prisma } from "../src/config/database";

async function main() {
  await connectDatabase();
  const dbs = await prisma.$queryRawUnsafe("SHOW DATABASES;");
  console.log("Databases accessible via Prisma:", dbs);

  const currentDb = await prisma.$queryRawUnsafe("SELECT DATABASE();");
  console.log("Current Database:", currentDb);
}

main().catch(console.error).finally(() => prisma.$disconnect());
