import dotenv from "dotenv";
dotenv.config();

import { connectDatabase, prisma } from "../src/config/database";

async function main() {
  await connectDatabase();
  
  // Search bookings table
  const allBookings = await prisma.$queryRawUnsafe(`SELECT id, bookingNumber, status, paymentStatus, createdAt FROM bookings ORDER BY createdAt DESC LIMIT 20;`);
  console.log("All bookings in MySQL bookings table:", allBookings);

  // Search payments table
  const allPayments = await prisma.$queryRawUnsafe(`SELECT id, bookingId, status, providerPaymentIntentId, createdAt FROM payments ORDER BY createdAt DESC LIMIT 20;`);
  console.log("All payments in MySQL payments table:", allPayments);
}

main().catch(console.error).finally(() => prisma.$disconnect());
