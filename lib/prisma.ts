import { PrismaClient } from '@prisma/client'

function createPrismaClient() {
  if (process.env.DATABASE_URL) {
    // Production: Neon serverless over WebSocket
    const { PrismaNeon } = require('@prisma/adapter-neon')
    const { neonConfig, Pool } = require('@neondatabase/serverless')
    const ws = require('ws')
    neonConfig.webSocketConstructor = ws
    const pool = new Pool({ connectionString: process.env.DATABASE_URL })
    const adapter = new PrismaNeon(pool)
    return new PrismaClient({ adapter } as any)
  } else {
    // Local dev: PGlite (in-process WASM PostgreSQL, no server needed)
    const { PGlite } = require('@electric-sql/pglite')
    const { PrismaPg } = require('@prisma/adapter-pg-worker')
    const db = new PGlite('./local.db')
    const adapter = new PrismaPg(db)
    return new PrismaClient({ adapter } as any)
  }
}

declare global {
  var prisma: ReturnType<typeof createPrismaClient> | undefined
}

export const prisma = globalThis.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') {
  globalThis.prisma = prisma
}
