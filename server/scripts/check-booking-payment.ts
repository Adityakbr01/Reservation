import dotenv from "dotenv";
dotenv.config();

import { connectDatabase, prisma } from "../src/config/database";

async function main() {
  await connectDatabase();
  const bookings = await prisma.booking.findMany({
    orderBy: { createdAt: "desc" },
    take: 5,
  });
  console.log("Recent bookings in DB count:", bookings.length);
  for (const b of bookings) {
    console.log(`- ID: ${b.id}, Number: ${b.bookingNumber}, Status: ${b.status}, PaymentStatus: ${b.paymentStatus}, Created: ${b.createdAt}`);
  }

  const payments = await prisma.payment.findMany({
    orderBy: { createdAt: "desc" },
    take: 5,
  });
  console.log("Recent payments in DB count:", payments.length);
  for (const p of payments) {
    console.log(`- ID: ${p.id}, BookingId: ${p.bookingId}, Status: ${p.status}, Intent: ${p.providerPaymentIntentId}`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
