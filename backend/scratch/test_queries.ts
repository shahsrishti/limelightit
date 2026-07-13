import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'postgresql://postgres.izufebgxlbxjmdxucgsf:vB00FqkTRJV07MU4@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true&statement_cache_size=0&connection_limit=3'
    }
  }
});

async function main() {
  console.log('=== Testing dashboard queries ===\n');

  try {
    const tables = await prisma.$queryRaw<{ tablename: string }[]>`
      SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;
    `;
    console.log('TABLES:', tables.map(t => t.tablename).join(', '));
  } catch (err: any) {
    console.error('Failed to list tables:', err.message);
    process.exit(1);
  }

  try {
    const count = await prisma.machine.count();
    console.log('\n✅ machine.count():', count);
  } catch (err: any) {
    console.error('❌ machine.count() failed:', err.message);
  }

  try {
    const count = await prisma.alert.count({ where: { resolved: false } });
    console.log('✅ alert.count():', count);
  } catch (err: any) {
    console.error('❌ alert.count() failed:', err.message);
  }

  try {
    const count = await prisma.downtimeSession.count({ where: { endTime: null } });
    console.log('✅ downtimeSession.count():', count);
  } catch (err: any) {
    console.error('❌ downtimeSession.count() failed:', err.message);
  }

  try {
    const agg = await prisma.machineMetric.aggregate({
      _sum: { power: true },
      _avg: { power: true },
    });
    console.log('✅ machineMetric.aggregate():', JSON.stringify(agg));
  } catch (err: any) {
    console.error('❌ machineMetric.aggregate() failed:', err.message);
  }

  try {
    const latestStatuses = await prisma.$queryRaw<{ machineId: string; status: string }[]>`
      SELECT DISTINCT ON ("machineId") "machineId", status
      FROM machine_statuses
      ORDER BY "machineId", timestamp DESC
    `;
    console.log('✅ $queryRaw machine_statuses DISTINCT ON:', latestStatuses.length, 'rows');
  } catch (err: any) {
    console.error('❌ $queryRaw machine_statuses failed:', err.message);
  }

  try {
    const machines = await prisma.machine.findMany({
      take: 3,
      include: {
        factory: { select: { name: true } },
        devices: { select: { id: true, macAddress: true } },
        statuses: { orderBy: { timestamp: 'desc' }, take: 1 },
        metrics: { orderBy: { timestamp: 'desc' }, take: 1 },
      }
    });
    console.log('✅ machine.findMany() with includes:', machines.length, 'rows');
  } catch (err: any) {
    console.error('❌ machine.findMany() failed:', err.message);
  }

  await prisma.$disconnect();
}

main().catch(console.error);
