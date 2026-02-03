import { PrismaClient } from '@prisma/client';

/**
 * Prisma Client Singleton
 *
 * 開発環境でのホットリロード時にPrismaClientインスタンスが複数生成されることを防ぐため、
 * グローバルオブジェクトにインスタンスをキャッシュします。
 * 本番環境では単純にシングルトンとして動作します。
 */

const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

export default prisma;
