import { FastifyRequest, FastifyReply } from 'fastify';

// Placeholder for a different authentication strategy for POS devices
// e.g., using API keys instead of JWTs
export async function authenticatePOS(request: FastifyRequest, reply: FastifyReply) {
    const apiKey = request.headers['x-api-key'];
    if (!apiKey || apiKey !== process.env.POS_API_KEY) {
        reply.code(401).send({ error: 'Unauthorized' });
        return;
    }
}
