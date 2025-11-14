import { FastifyInstance } from 'fastify';
import { Prisma } from '@prisma/client';
import { authenticate } from '../lib/auth';

type SectionInput = {
  id?: string;
  type: string;
  props?: Prisma.InputJsonValue;
  order?: number;
};

function normalizeSections(
  sections: SectionInput[]
): Prisma.SectionCreateWithoutPageInput[] {
  return sections.map((section, index) => {
    const normalizedProps: Prisma.InputJsonValue =
      section.props && typeof section.props === 'object'
        ? (section.props as Prisma.JsonObject)
        : (Prisma.JsonNull as unknown as Prisma.InputJsonValue);

    return {
      type: section.type,
      props: normalizedProps,
      order: typeof section.order === 'number' ? section.order : index,
    };
  });
}

async function pageRoutes(fastify: FastifyInstance) {
  fastify.get('/api/pages', async () => {
    return fastify.prisma.page.findMany({
      orderBy: { slug: 'asc' },
      include: {
        sections: { orderBy: { order: 'asc' } },
      },
    });
  });

  fastify.get<{ Params: { slug: string } }>('/api/pages/:slug', async (request, reply) => {
    const page = await fastify.prisma.page.findUnique({
      where: { slug: request.params.slug },
      include: { sections: { orderBy: { order: 'asc' } } },
    });

    if (!page) {
      return reply.code(404).send({ error: 'Page not found' });
    }

    return page;
  });

  fastify.put<{ Params: { slug: string }; Body: { sections: SectionInput[] } }>(
    '/api/pages/:slug',
    { preHandler: [authenticate] },
    async (request, reply) => {
      const userRole = (request.user as any)?.role;
      if (userRole !== 'ADMIN') {
        return reply.code(403).send({ error: 'Forbidden' });
      }

      const page = await fastify.prisma.page.findUnique({
        where: { slug: request.params.slug },
        select: { id: true },
      });

      if (!page) {
        return reply.code(404).send({ error: 'Page not found' });
      }

      if (!Array.isArray(request.body.sections) || request.body.sections.length === 0) {
        return reply.code(400).send({ error: 'At least one section is required.' });
      }

      if (request.body.sections.some(section => typeof section.type !== 'string' || !section.type.trim())) {
        return reply.code(400).send({ error: 'Each section requires a valid type.' });
      }

      const normalizedSections = normalizeSections(request.body.sections);

      const updated = await fastify.prisma.page.update({
        where: { id: page.id },
        data: {
          status: 'PUBLISHED',
          publishedAt: new Date(),
          sections: {
            deleteMany: {
              pageId: page.id,
            },
            create: normalizedSections,
          },
        },
        include: {
          sections: { orderBy: { order: 'asc' } },
        },
      });

      return updated;
    }
  );
}

export default pageRoutes;
