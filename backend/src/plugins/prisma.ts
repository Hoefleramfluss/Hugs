// backend/src/plugins/prisma.ts
import fp from 'fastify-plugin';
import type { FastifyPluginAsync } from 'fastify';
import { PrismaClient } from '@prisma/client';

const isTestEnv = process.env.NODE_ENV === 'test';

const prismaPlugin: FastifyPluginAsync = async (server) => {
  if (isTestEnv) {
    const globalWithMock = globalThis as typeof globalThis & { __PRISMA_TEST_MOCK__?: PrismaClient };
    const prismaMock = globalWithMock.__PRISMA_TEST_MOCK__;

    if (!prismaMock) {
      server.log.warn('Prisma test mock not initialized; attaching empty stub client');
    }

    const mockClient =
      prismaMock ??
      ({
        $connect: async () => undefined,
        $disconnect: async () => undefined,
      } as unknown as PrismaClient);

    server.decorate('prisma', mockClient);
    server.addHook('onClose', async () => {
      if (prismaMock?.$disconnect) {
        await prismaMock.$disconnect();
      }
    });

    return;
  }

  const prisma = new PrismaClient();

  // Konfigurierbare Defaults über ENV:
  // PRISMA_CONNECT_RETRIES (default 10), PRISMA_CONNECT_BASE_DELAY_MS (default 2000)
  const maxAttempts = Number(process.env.PRISMA_CONNECT_RETRIES ?? 10);
  const baseDelayMs = Number(process.env.PRISMA_CONNECT_BASE_DELAY_MS ?? 2000);

  async function connectWithRetry(attempts = maxAttempts, delayMs = baseDelayMs) {
    let lastErr: unknown = null;
    for (let i = 0; i < attempts; i += 1) {
      try {
        await prisma.$connect();
        server.log.info(`Prisma connected on attempt ${i + 1}`);
        return;
      } catch (err) {
        lastErr = err;
        server.log.warn(
          `Prisma connect attempt ${i + 1} failed: ${err instanceof Error ? err.message : String(err)}`,
        );
        // exponential backoff-ish (linear multiplied by attempt index)
        await new Promise((resolve) => setTimeout(resolve, delayMs * (i + 1)));
      }
    }
    throw lastErr ?? new Error('Prisma connection failed after retries');
  }

  // Versuche zu verbinden; bei dauerhaften Fehlern wird Exception geworfen
  await connectWithRetry();

  // Aufräum-Task beim Service-Shutdown
  server.addHook('onClose', async () => {
    try {
      await prisma.$disconnect();
      server.log.info('Prisma disconnected');
    } catch (err) {
      server.log.warn({ err }, 'Prisma disconnect error');
    }
  });

  // Prisma-Client als Decoration bereitstellen
  server.decorate('prisma', prisma);
};

export default fp(prismaPlugin, { name: 'prisma-auto-0' });