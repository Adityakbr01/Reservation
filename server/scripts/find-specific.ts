import dotenv from "dotenv";
dotenv.config();

import { connectDatabase, prisma } from "../src/config/database";

async function main() {
  await connectDatabase();
  
  const bById = await prisma.$queryRawUnsafe(`SELECT * FROM bookings WHERE id = '588538e2f27befb6aa40f0da';`);
  console.log("Found by id:", bById);

  const bByNum = await prisma.$queryRawUnsafe(`SELECT * FROM bookings WHERE bookingNumber = 'QB-HYQ7NS';`);
  console.log("Found by bookingNumber:", bByNum);

  const pByIntent = await prisma.$queryRawUnsafe(`SELECT * FROM payments WHERE providerPaymentIntentId = 'pi_3UVaMYA5UusZunBY1fJQxLor';`);
  console.log("Found by payment intent:", pByIntent);

  const count = await prisma.$queryRawUnsafe(`SELECT count(*) as cnt FROM bookings;`);
  console.log("Total bookings in DB:", count);
}

main().catch(console.error).finally(() => prisma.$disconnect());
