import dotenv from "dotenv";
dotenv.config();

import Stripe from "stripe";
import { connectDatabase, prisma } from "../src/config/database";
import { setBookingStatus } from "../src/modules/bookings/booking.repository";
import { updatePaymentStatus } from "../src/modules/payments/payment.repository";

async function main() {
  await connectDatabase();

  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) throw new Error("Missing STRIPE_SECRET_KEY");
  const stripe = new Stripe(stripeKey);

  const intentId = "pi_3UVaMYA5UusZunBY1fJQxLor";
  console.log("Checking Stripe intent:", intentId);
  const intent = await stripe.paymentIntents.retrieve(intentId);
  console.log("Stripe status:", intent.status);
  console.log("Amount:", intent.amount, intent.currency);

  if (intent.status === "succeeded") {
    console.log("SUCCESS: Stripe reports this payment has succeeded!");
    console.log("Booking ID from Stripe metadata:", intent.metadata.bookingId);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
