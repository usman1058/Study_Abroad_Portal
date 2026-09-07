import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is not set");
}

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

async function main() {
  const passwordHash = await bcrypt.hash('admin1234', 12);
  await prisma.user.update({
    where: { email: 'admin@studyabroad.test' },
    data: { passwordHash }
  });
  console.log('Password updated successfully');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());