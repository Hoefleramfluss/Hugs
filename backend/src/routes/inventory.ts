import { FastifyInstance } from 'fastify';
import { authenticate } from '../lib/auth';

async function inventoryRoutes(fastify: FastifyInstance) {
  // Get all stock levels
  fastify.get(
    '/api/inventory/stock',
    { preHandler: [authenticate] },
    async (request, reply) => {
      const stockLevels = await fastify.prisma.inventoryStock.findMany({
        include: {
          variant: {
            select: { sku: true, product: { select: { title: true } } },
          },
          location: {
            select: { name: true },
          },
        },
      });
      return stockLevels;
    }
  );

  // Update stock for a specific variant at a location
  fastify.post<{ Body: { variantId: string, locationId: string, change: number } }>(
    '/api/inventory/stock/adjust',
    { preHandler: [authenticate] },
    async (request, reply) => {
      const { variantId, locationId, change } = request.body;
      if (!variantId || !locationId || typeof change !== 'number') {
        return reply.code(400).send({ error: 'Missing required fields: variantId, locationId, change (number)' });
      }

      try {
        const updatedStock = await fastify.prisma.inventoryStock.update({
          where: {
            variantId_locationId: {
              variantId,
              locationId,
            },
          },
          data: {
            quantity: {
              increment: change,
            },
          },
        });
        return updatedStock;
      } catch (error) {
        fastify.log.error(error, 'Failed to adjust stock');
        return reply.code(500).send({ error: 'Could not adjust stock level.' });
      }
    }
  );
}

export default inventoryRoutes;
