import dotenv from "dotenv";
dotenv.config();

import Stripe from "stripe";

async function main() {
  const key = process.env.STRIPE_SECRET_KEY;
  console.log("Using key prefix:", key?.slice(0, 15));
  const stripe = new Stripe(key!);
  const intent = await stripe.paymentIntents.retrieve("pi_3UVaMYA5UusZunBY1fJQxLor");
  console.log("Stripe intent details:");
  console.log({
    id: intent.id,
    status: intent.status,
    amount: intent.amount,
    currency: intent.currency,
    created: new Date(intent.created * 1000).toISOString(),
    metadata: intent.metadata,
    latest_charge: intent.latest_charge,
  });
}

main().catch(console.error);
