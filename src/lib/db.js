import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

function initPrisma() {
  const dbUrl = process.env.DATABASE_URL || 'postgresql://placeholder:placeholder@localhost:5432/placeholder';
  const pool = new Pool({ 
    connectionString: dbUrl,
    connectionTimeoutMillis: 15000, // 15s connection timeout for cloud DB wake-up
    idleTimeoutMillis: 20000,       // Close idle connections after 20s before cloud server drops TCP socket
    max: 20                         // Healthy pool limit for concurrent API routes
  });

  // Handle errors on idle connections to avoid unhandled socket exceptions
  pool.on('error', (err) => {
    console.warn('PostgreSQL Pool idle client notice (auto-recovered):', err?.message || err);
  });

  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
}

let prisma;

if (process.env.NODE_ENV === 'production') {
  prisma = initPrisma();
} else {
  if (!global.globalPrisma) {
    global.globalPrisma = initPrisma();
  }
  prisma = global.globalPrisma;
}

export { prisma };
export default prisma;
