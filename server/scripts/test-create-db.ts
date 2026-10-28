import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  try {
    await prisma.$executeRawUnsafe("CREATE DATABASE IF NOT EXISTS reservation_test_check");
    console.log("SUCCESS: CREATE DATABASE allowed!");
    await prisma.$executeRawUnsafe("DROP DATABASE reservation_test_check");
    console.log("SUCCESS: DROP DATABASE allowed!");
  } catch (err: any) {
    console.log("NOT ALLOWED to create database:", err.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
