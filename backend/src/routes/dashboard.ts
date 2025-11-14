import { FastifyInstance } from 'fastify';
import { authenticate } from '../lib/auth';

async function dashboardRoutes(fastify: FastifyInstance) {
    // Get dashboard stats (Admin only)
    fastify.get(
        '/api/dashboard/stats',
        { preHandler: [authenticate] },
        async (request, reply) => {
            if (request.user.role !== 'ADMIN') {
                return reply.code(403).send({ error: 'Forbidden' });
            }

            // These would be complex queries in a real app
            const totalRevenue = 54230.50;
            const newOrders = 120;
            const newCustomers = 45;
            const salesData = [
                { name: 'Jan', sales: 4000 },
                { name: 'Feb', sales: 3000 },
                { name: 'Mar', sales: 5000 },
                { name: 'Apr', sales: 4500 },
                { name: 'May', sales: 6000 },
                { name: 'Jun', sales: 5800 },
            ];

            return { totalRevenue, newOrders, newCustomers, salesData };
        }
    );
}

export default dashboardRoutes;
