import { FastifyInstance } from 'fastify';
import { authenticate } from '../lib/auth';

// Simple in-memory store for global SEO settings
let seoSettings = {
    globalTitle: 'GrowShop - Your Premium Grow Supply Store',
    globalDescription: 'Find the best supplies for your indoor and outdoor growing projects at GrowShop.',
    jsonLd: {
        '@context': 'https://schema.org',
        '@type': 'Organization',
        'url': 'http://www.example.com',
        'name': 'GrowShop',
        'contactPoint': {
            '@type': 'ContactPoint',
            'telephone': '+1-401-555-1212',
            'contactType': 'customer service'
        }
    }
};

async function seoRoutes(fastify: FastifyInstance) {
    // Get SEO settings
    fastify.get(
        '/api/seo/settings',
        { preHandler: [authenticate] },
        async (request, reply) => {
            return seoSettings;
        }
    );

    // Update SEO settings
    fastify.put<{ Body: typeof seoSettings }>(
        '/api/seo/settings',
        { preHandler: [authenticate] },
        async (request, reply) => {
            seoSettings = { ...seoSettings, ...request.body };
            fastify.log.info({ seoSettings }, 'SEO settings updated');
            return seoSettings;
        }
    );
}

export default seoRoutes;
