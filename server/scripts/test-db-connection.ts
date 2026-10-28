import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  try {
    const res = await prisma.$queryRawUnsafe("SELECT DATABASE() as db, VERSION() as version");
    console.log("Connected successfully:", res);

    // Check grants
    const grants = await prisma.$queryRawUnsafe("SHOW GRANTS");
    console.log("Grants:", grants);
  } catch (err) {
    console.error("DB Error:", err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
