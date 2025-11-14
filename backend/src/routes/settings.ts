import { FastifyInstance } from 'fastify';
import { authenticate } from '../lib/auth';

// Simple in-memory store for settings
let settings = {
    siteName: 'GrowShop',
    contactEmail: 'contact@growshop.com',
    maintenanceMode: false,
};

async function settingsRoutes(fastify: FastifyInstance) {
    // Get all settings
    fastify.get(
        '/api/settings',
        { preHandler: [authenticate] },
        async (request, reply) => {
            return settings;
        }
    );

    // Update settings
    fastify.put<{ Body: typeof settings }>(
        '/api/settings',
        { preHandler: [authenticate] },
        async (request, reply) => {
            // In a real app, you would validate the input
            settings = { ...settings, ...request.body };
            fastify.log.info({ settings }, 'Settings updated');
            return settings;
        }
    );
}

export default settingsRoutes;
