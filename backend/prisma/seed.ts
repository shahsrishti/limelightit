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

  // 3. Create Default Factory
  const factoryId = 'factory-01';
  const factory = await prisma.factory.upsert({
    where: { id: factoryId },
    update: {},
    create: {
      id: factoryId,
      name: 'Main Assembly Plant',
      location: 'Building A, Floor 1',
    },
  });
  console.log('Factory seeded:', factory.name);

  // 4. Create Mock Machines and Devices
  const mockMachines = [
    {
      id: 'cnc-01',
      name: 'CNC Machine 01',
      deviceMac: '00:1A:2B:3C:4D:01',
      deviceId: 'device-cnc-01',
    },
    {
      id: 'weld-02',
      name: 'Welding Robot 02',
      deviceMac: '00:1A:2B:3C:4D:02',
      deviceId: 'device-weld-02',
    },
    {
      id: 'assembly-03',
      name: 'Assembly Line 03',
      deviceMac: '00:1A:2B:3C:4D:03',
      deviceId: 'device-assembly-03',
    },
  ];

  for (const m of mockMachines) {
    const machine = await prisma.machine.upsert({
      where: { id: m.id },
      update: {},
      create: {
        id: m.id,
        name: m.name,
        factoryId: factory.id,
      },
    });

    await prisma.device.upsert({
      where: { macAddress: m.deviceMac },
      update: {},
      create: {
        id: m.deviceId,
        macAddress: m.deviceMac,
        machineId: machine.id,
      },
    });

    // Seed initial statuses so OEE count and status counts work on mount
    await prisma.machineStatus.create({
      data: {
        machineId: machine.id,
        status: m.id === 'cnc-01' ? 'RUNNING' : 'IDLE',
        timestamp: new Date(),
      },
    });

    // Seed initial OEE Snapshot so OEE KPI is populated
    await prisma.oEESnapshot.create({
      data: {
        machineId: machine.id,
        availability: 0.92,
        performance: 0.88,
        quality: 0.98,
        oee: 0.79,
        timestamp: new Date(),
      },
    });
  }
  console.log('Mock Machines, Devices, Statuses, and OEE Snapshots seeded.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
