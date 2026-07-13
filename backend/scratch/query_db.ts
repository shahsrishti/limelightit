import { PrismaClient } from '@prisma/client';

async function main() {
  // Test connection on port 6543
  const url6543 = 'postgresql://postgres.izufebgxlbxjmdxucgsf:vB00FqkTRJV07MU4@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres?connection_limit=3&pgbouncer=true';
  console.log('Testing connection to port 6543...');
  const prisma6543 = new PrismaClient({
    datasources: {
      db: {
        url: url6543
      }
    }
  });

  try {
    const count = await prisma6543.machine.count();
    console.log('✅ Port 6543 connection SUCCESS! Machine count:', count);
    await prisma6543.$disconnect();
    return;
  } catch (err: any) {
    console.error('❌ Port 6543 connection FAILED:', err.message);
  }

  // Test connection on port 5432
  const url5432 = 'postgresql://postgres.izufebgxlbxjmdxucgsf:vB00FqkTRJV07MU4@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres?connection_limit=3';
  console.log('Testing connection to port 5432...');
  const prisma5432 = new PrismaClient({
    datasources: {
      db: {
        url: url5432
      }
    }
  });

  try {
    const count = await prisma5432.machine.count();
    console.log('✅ Port 5432 connection SUCCESS! Machine count:', count);
    await prisma5432.$disconnect();
  } catch (err: any) {
    console.error('❌ Port 5432 connection FAILED:', err.message);
  }
}

main();
