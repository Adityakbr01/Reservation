import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const amenities = await prisma.amenity.findMany();
  for (const a of amenities) {
    console.log(`${a.name.padEnd(25)}: iconUrl=${a.iconUrl}, imageMediaId=${a.imageMediaId}`);
  }
  await prisma.$disconnect();
}

main();
