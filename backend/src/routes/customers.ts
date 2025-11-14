import { FastifyInstance } from 'fastify';
import { authenticate } from '../lib/auth';

async function customerRoutes(fastify: FastifyInstance) {
  // Get all customers (simplified)
  fastify.get(
    '/api/customers',
    { preHandler: [authenticate] },
    async (request, reply) => {
      // In a real app, you'd want pagination here.
      // This is a placeholder and should not be used in production without pagination.
      const customers = await fastify.prisma.user.findMany({
          where: { role: 'USER' },
          select: { id: true, email: true, name: true, createdAt: true, orders: true }
      });
      return customers;
    }
  );

  // Get a single customer
  fastify.get<{ Params: { id: string } }>(
    '/api/customers/:id',
    { preHandler: [authenticate] },
    async (request, reply) => {
      const { id } = request.params;
      const customer = await fastify.prisma.user.findUnique({
        where: { id: id, role: 'USER' },
        select: { id: true, email: true, name: true, createdAt: true, orders: true }
      });

      if (!customer) {
        return reply.code(404).send({ error: 'Customer not found' });
      }
      return customer;
    }
  );
}

export default customerRoutes;
