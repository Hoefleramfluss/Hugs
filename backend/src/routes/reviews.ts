import { FastifyInstance } from 'fastify';
import { authenticate } from '../lib/auth';

// This is a placeholder. The prisma schema would need a Review model.
// model Review {
//   id        String   @id @default(cuid())
//   rating    Int
//   comment   String
//   productId String
//   product   Product  @relation(fields: [productId], references: [id])
//   userId    String
//   user      User     @relation(fields: [userId], references: [id])
//   createdAt DateTime @default(now())
// }

async function reviewRoutes(fastify: FastifyInstance) {
    // Get reviews for a product
    fastify.get<{ Params: { productId: string } }>('/api/products/:productId/reviews', async (request, reply) => {
        const { productId } = request.params;
        const reviews = await fastify.prisma.review.findMany({
            where: { productId },
            include: { user: { select: { name: true } } },
            orderBy: { createdAt: 'desc' },
        });
        return reviews;
    });

    // Add a review
    fastify.post<{ Body: { productId: string, rating: number, comment: string } }>(
        '/api/reviews',
        { preHandler: [authenticate] },
        async (request, reply) => {
            const { productId, rating, comment } = request.body;
            const userId = request.user.id;
            
            const newReview = await fastify.prisma.review.create({
                data: {
                    productId,
                    userId,
                    rating,
                    comment,
                }
            });
            return newReview;
        }
    );
}

export default reviewRoutes;
