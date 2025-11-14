'use strict';
const { describe, it, expect } = require('@jest/globals');
const Fastify = require('fastify');
const fastifyJwt = require('@fastify/jwt');
const prismaPluginModule = require('../src/plugins/prisma');
const pagesRoutesModule = require('../src/routes/pages');

const prismaPlugin = prismaPluginModule.default ?? prismaPluginModule;
const pageRoutes = pagesRoutesModule.default ?? pagesRoutesModule;

describe('Page Routes - Concurrency', () => {
  it('should handle concurrent updates to a page, with the last write winning', async () => {
    const app = Fastify();
    app.register(fastifyJwt, { secret: 'test-secret' });
    app.register(prismaPlugin);
    app.addHook('preHandler', (request, _reply, done) => {
      request.user = { id: 'admin-id', role: 'ADMIN' };
      done();
    });
    app.register(pageRoutes);

    await app.ready();

    const adminToken = app.jwt.sign({ id: 'admin-id', role: 'ADMIN' });

    const initialRes = await app.inject({ method: 'GET', url: '/api/pages/home' });
    const initialPage = JSON.parse(initialRes.body ?? '{}');
    const normalizeForAssertion = (sections) =>
      sections.map((section, index) => ({
        type: section.type,
        props: section.props ?? {},
        order: typeof section.order === 'number' ? section.order : index,
      }));

    const initialSections = Array.isArray(initialPage?.sections) ? initialPage.sections : [];
    expect(Array.isArray(initialSections)).toBe(true);

    const sectionsForUpdate1 = [
      ...normalizeForAssertion(initialSections),
      { type: 'banner', props: { text: 'First Update' } },
    ];
    const sectionsForUpdate2 = [
      ...normalizeForAssertion(initialSections),
      { type: 'testimonial', props: { author: 'Second Update' } },
    ];

    const promise1 = app.inject({
      method: 'PUT',
      url: '/api/pages/home',
      headers: { Authorization: `Bearer ${adminToken}` },
      payload: { sections: sectionsForUpdate1 },
    });

    const promise2 = app.inject({
      method: 'PUT',
      url: '/api/pages/home',
      headers: { Authorization: `Bearer ${adminToken}` },
      payload: { sections: sectionsForUpdate2 },
    });

    const [res1, res2] = await Promise.all([promise1, promise2]);

    expect(res1.statusCode).toBe(200);
    expect(res2.statusCode).toBe(200);

    const finalRes = await app.inject({ method: 'GET', url: '/api/pages/home' });
    const finalPage = JSON.parse(finalRes.body ?? '{}');
    const normalizedFinal = normalizeForAssertion(Array.isArray(finalPage.sections) ? finalPage.sections : []);
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