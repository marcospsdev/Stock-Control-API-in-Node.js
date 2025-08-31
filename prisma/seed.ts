import { PrismaClient } from "@prisma/client";
import * as bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const administratorId = "af77c7f3-c5b9-4a99-b145-c6328a6f8745";
const operatorId = "e88d7f1d-f8f8-4e8c-8a24-2c6c1a8a25c3";
const sellerId = "f88d7f1d-f8f8-4e8c-8a24-2c6c1a8a25c3";

async function main() {
  console.log("Creating user types...");

  // Creating the user types
  await prisma.userType.upsert({
    where: { name: "Administrator" },
    update: {},
    create: {
      id: administratorId,
      name: "Administrator",
    },
  });

  await prisma.userType.upsert({
    where: { name: "Operator" },
    update: {},
    create: {
      id: operatorId,
      name: "Operator",
    },
  });

  await prisma.userType.upsert({
    where: { name: "Seller" },
    update: {},
    create: {
      id: sellerId,
      name: "Seller",
    },
  });

  // Hashing the default password for the initial users
  const hashedPassword = await bcrypt.hash("123456", 10);

  console.log("Creating default users...");

  // Creating the default Administrator user
  await prisma.user.upsert({
    where: { email: "admin@email.com" },
    update: {},
    create: {
      name: "Administrator",
      email: "admin@email.com",
      password: hashedPassword,
      user_type_id: administratorId,
    },
  });

  // Creating the default Operator user
  await prisma.user.upsert({
    where: { email: "operator@email.com" },
    update: {},
    create: {
      name: "Operator",
      email: "operator@email.com",
      password: hashedPassword,
      user_type_id: operatorId,
    },
  });

  // Creating the default Seller user
  await prisma.user.upsert({
    where: { email: "sales@email.com" },
    update: {},
    create: {
      name: "Seller",
      email: "sales@email.com",
      password: hashedPassword,
      user_type_id: sellerId,
    },
  });

  console.log("Seed completed successfully!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
