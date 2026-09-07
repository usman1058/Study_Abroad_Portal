const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

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