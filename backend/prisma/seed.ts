import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding Database...');

  // 1. Create Default Roles
  const roles = ['SUPER_ADMIN', 'ADMIN', 'SUPERVISOR', 'VIEWER'];
  
  for (const roleName of roles) {
    await prisma.role.upsert({
      where: { name: roleName },
      update: {},
      create: {
        name: roleName,
        description: `Default ${roleName} role`,
      },
    });
  }
  console.log('Roles seeded.');

  // 2. Create Super Admin User
  const superAdminRole = await prisma.role.findUnique({
    where: { name: 'SUPER_ADMIN' },
  });

  if (!superAdminRole) throw new Error('SUPER_ADMIN role not found');

  const hashedPassword = await bcrypt.hash('Admin@123!', 10);

  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@limelightit.com' },
    update: {},
    create: {
      email: 'admin@limelightit.com',
      password: hashedPassword,
      firstName: 'Super',
      lastName: 'Admin',
      roleId: superAdminRole.id,
    },
  });

  console.log('Super Admin seeded:', adminUser.email);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
