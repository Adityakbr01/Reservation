import dotenv from "dotenv";
dotenv.config();

import mongoose from "mongoose";

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.log("No MONGODB_URI in .env");
    return;
  }
  await mongoose.connect(uri);
  console.log("Connected to MongoDB!");

  const dbs = await mongoose.connection.db?.admin().listDatabases();
  console.log("Databases in Mongo cluster:", dbs?.databases.map(d => d.name));

  const collections = await mongoose.connection.db?.listCollections().toArray();
  console.log("Collections in reservation db:", collections?.map(c => c.name));

  const bookingCol = mongoose.connection.collection("bookings");
  const recent = await bookingCol.find().sort({ createdAt: -1 }).limit(5).toArray();
  console.log("Recent Mongo bookings count:", recent.length);
  for (const b of recent) {
    console.log(`- _id: ${b._id}, Number: ${b.bookingNumber}, Status: ${b.status}, PaymentStatus: ${b.paymentStatus}, Created: ${b.createdAt}`);
  }

  // Also search specifically for QB-HYQ7NS
  const specific = await bookingCol.findOne({ bookingNumber: "QB-HYQ7NS" });
  console.log("Specific QB-HYQ7NS in Mongo:", specific);
}

main().catch(console.error).finally(() => mongoose.disconnect());
