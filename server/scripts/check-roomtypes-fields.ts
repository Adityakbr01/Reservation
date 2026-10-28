import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const roomtypes = await prisma.roomType.findMany();
  for (const rt of roomtypes) {
    console.log(`Checking RoomType: ${rt.name} (${rt.id})`);
    for (const [key, val] of Object.entries(rt)) {
      if (typeof val === "string") {
        // Check if string contains single quote
        if (val.includes("'")) {
          console.log(`  Field "${key}" contains single quote! Count: ${(val.match(/'/g) || []).length}`);
          console.log(`  Sample:`, val.slice(0, 150));
        }
      }
    }
  }
  await prisma.$disconnect();
}

main();
