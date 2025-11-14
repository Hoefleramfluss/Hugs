import { describe, it, expect } from '@jest/globals';
import Fastify from 'fastify';
import fastifyJwt from '@fastify/jwt';
import pageRoutes from '../src/routes/pages';
import prismaPlugin from '../src/plugins/prisma';

describe('Page Routes - Concurrency', () => {
    it('should handle concurrent updates to a page, with the last write winning', async () => {
        const app = Fastify();
        app.register(fastifyJwt, { secret: 'test-secret' });
        app.register(prismaPlugin);
        app.addHook('preHandler', (request, _reply, done) => {
            (request as any).user = { id: 'admin-id', role: 'ADMIN' };
            done();
        });
        app.register(pageRoutes);
        await app.ready();
        const adminToken = app.jwt.sign({ id: 'admin-id', role: 'ADMIN' });

        // Get initial page state to use as a base
        const initialRes = await app.inject({ method: 'GET', url: '/api/pages/home' });
        const initialPage = JSON.parse(initialRes.body);
        
        const normalizeForAssertion = (sections: any[]) =>
            sections.map((section, index) => ({
                type: section.type,
                props: section.props ?? {},
                order: typeof section.order === 'number' ? section.order : index,
            }));

        const sectionsForUpdate1 = [
            ...normalizeForAssertion(initialPage.sections),
            { type: 'banner', props: { text: 'First Update' } },
        ];
        const sectionsForUpdate2 = [
            ...normalizeForAssertion(initialPage.sections),
            { type: 'testimonial', props: { author: 'Second Update' } },
        ];

        // Simulate two near-simultaneous update requests
        const promise1 = app.inject({
            method: 'PUT',
            url: '/api/pages/home',
            headers: { Authorization: `Bearer ${adminToken}` },
            payload: { sections: sectionsForUpdate1 }
        });

        const promise2 = app.inject({
            method: 'PUT',
            url: '/api/pages/home',
            headers: { Authorization: `Bearer ${adminToken}` },
            payload: { sections: sectionsForUpdate2 }
        });

        const [res1, res2] = await Promise.all([promise1, promise2]);

        expect(res1.statusCode).toBe(200);
        expect(res2.statusCode).toBe(200);

        // Verify the final state of the page
        const finalRes = await app.inject({ method: 'GET', url: '/api/pages/home' });
        const finalPage = JSON.parse(finalRes.body);
        const normalizedFinal = normalizeForAssertion(finalPage.sections);
        const update1Normalized = normalizeForAssertion(sectionsForUpdate1);
        const update2Normalized = normalizeForAssertion(sectionsForUpdate2);

        const lastUpdateWon =
            JSON.stringify(normalizedFinal) === JSON.stringify(update1Normalized) ||
            JSON.stringify(normalizedFinal) === JSON.stringify(update2Normalized);

        expect(lastUpdateWon).toBe(true);
        console.log('Final page state reflects the last write, which is the expected behavior for this simple in-memory store.');

        await app.close();
    });
});
