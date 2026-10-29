import dotenv from "dotenv";
dotenv.config();

import { connectDatabase, prisma } from "../src/config/database";

async function main() {
  await connectDatabase();
  
  const users = await prisma.$queryRawUnsafe(`SELECT id, name, email, role, createdAt FROM users WHERE email LIKE '%saarthi%' OR email LIKE '%sharma%';`);
  console.log("Users found in MySQL:", users);

  const allUsers = await prisma.$queryRawUnsafe(`SELECT id, name, email, role, createdAt FROM users ORDER BY createdAt DESC LIMIT 10;`);
  console.log("Recent users in MySQL:", allUsers);
}

main().catch(console.error).finally(() => prisma.$disconnect());
