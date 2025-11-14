import { FastifyInstance } from 'fastify';
import { authenticate } from '../lib/auth';

async function productRoutes(fastify: FastifyInstance) {
  // Get all products
  fastify.get('/api/products', async (request, reply) => {
    const products = await fastify.prisma.product.findMany({
      include: {
        images: true,
        variants: true,
      },
      orderBy: {
        createdAt: 'desc',
      }
    });
    return products;
  });

  // Get a single product by slug
  fastify.get<{ Params: { slug: string } }>('/api/products/:slug', async (request, reply) => {
    const { slug } = request.params;
    const product = await fastify.prisma.product.findUnique({
      where: { slug },
      include: {
        images: true,
        variants: true,
      },
    });

    if (!product) {
      return reply.code(404).send({ error: 'Product not found' });
    }
    return product;
  });

  // Get product of the week
  fastify.get('/api/products/pdw', async (request, reply) => {
      const product = await fastify.prisma.product.findFirst({
        where: { productOfWeek: true },
        include: {
            images: true,
            variants: true
        }
      });
      if (!product) {
          return reply.code(404).send({ error: 'Product of the week not set' });
      }
      return product;
  });

  // Set product of the week (Admin only)
  fastify.post<{ Body: { productId: string } }>(
    '/api/products/pdw',
    { preHandler: [authenticate] },
    async (request, reply) => {
        // Simple authorization check
        if (request.user.role !== 'ADMIN') {
            return reply.code(403).send({ error: 'Forbidden' });
        }
        
        const { productId } = request.body;

        try {
            // This is an atomic transaction to ensure data integrity.
            // 1. Set all products' productOfWeek to false.
            // 2. Set the specified product's productOfWeek to true.
            const [_, updatedProduct] = await fastify.prisma.$transaction([
                fastify.prisma.product.updateMany({
                    where: { productOfWeek: true },
                    data: { productOfWeek: false }
                }),
                fastify.prisma.product.update({
                    where: { id: productId },
                    data: { productOfWeek: true }
                })
            ]);
            
            return updatedProduct;

        } catch (error) {
            fastify.log.error(error, "Failed to set product of the week");
            return reply.code(500).send({ error: 'Could not update product of the week.' });
        }
    }
  );

}

export default productRoutes;
