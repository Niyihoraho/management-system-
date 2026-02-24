import { PrismaClient } from './generated/prisma'

type GlobalWithPrismaClients = typeof globalThis & {
  prismaWrite?: PrismaClient
  prismaRead?: PrismaClient
}

const globalForPrisma = globalThis as GlobalWithPrismaClients

const prismaWrite =
  globalForPrisma.prismaWrite ??
  new PrismaClient()

const readReplicaUrl = process.env.REPLICA_DATABASE_URL ?? process.env.READONLY_DATABASE_URL

const prismaRead =
  readReplicaUrl
    ? globalForPrisma.prismaRead ??
      new PrismaClient({ datasources: { db: { url: readReplicaUrl } } })
    : prismaWrite

export const prisma = prismaWrite
export const prismaReplica = prismaRead

type GetPrismaClientOptions = {
  preferPrimary?: boolean
}

export const getPrismaClient = (
  mode: 'read' | 'write' = 'write',
  options?: GetPrismaClientOptions
) => {
  if (mode === 'write' || options?.preferPrimary) {
    return prisma
  }
  return prismaReplica
}

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prismaWrite = prismaWrite
  globalForPrisma.prismaRead = prismaRead
}
