/**
 * Test setup: provide a lightweight Prisma mock and helper to decorate Fastify instances.
 * Loaded via Jest's setupFilesAfterEnv.
 */
import { beforeAll } from '@jest/globals';
import Fastify from 'fastify';
import { randomUUID } from 'node:crypto';
import type { PrismaClient } from '@prisma/client';

type PrismaMock = ReturnType<typeof createMockPrisma>;

declare global {
  // eslint-disable-next-line no-var
  var __PRISMA_TEST_MOCK__: PrismaMock | undefined;
}

const ensureId = (maybeId?: string) => maybeId || randomUUID();
const now = () => new Date().toISOString();
const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value));

function createMockPrisma(): PrismaClient {
  const users: any[] = [];
  const locations: any[] = [];
  const products: any[] = [];
  const productImages: any[] = [];
  const variants: any[] = [];
  const inventory: any[] = [];
  const orders: any[] = [];
  const orderItems: any[] = [];
  const reviews: any[] = [];
  const pages: any[] = [];
  let sections: any[] = [];

  const getSectionsForPage = (pageId: string) =>
    sections
      .filter((section) => section.pageId === pageId)
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
      .map((section) => clone(section));

  const applyPageInclude = (
    page: any,
    include?: {
      sections?: true | {
        orderBy?: { order?: 'asc' | 'desc' }
      }
    }
  ) => {
    if (!include?.sections) {
      return clone(page);
    }

    const sectionsInclude = include.sections;
    let ordered = getSectionsForPage(page.id);
    if (sectionsInclude && typeof sectionsInclude === 'object' && sectionsInclude.orderBy?.order === 'desc') {
      ordered = ordered.reverse();
    }

    return clone({ ...page, sections: ordered });
  };

  const createSectionForPage = (pageId: string, data: any) => {
    const section = {
      id: ensureId((data as any)?.id),
      pageId,
      type: data?.type ?? '',
      order: data?.order ?? 0,
      props: data?.props ?? {},
      createdAt: now(),
      updatedAt: now(),
    };
    sections.push(section);
    return section;
  };

  const seedDefaultPages = () => {
    if (pages.length > 0) {
      return;
    }

    const pageId = ensureId('home-page');
    const page = {
      id: pageId,
      slug: 'home',
      title: 'Homepage',
      status: 'PUBLISHED',
      isDefaultHome: true,
      publishedAt: now(),
      createdAt: now(),
      updatedAt: now(),
    };
    pages.push(page);

    createSectionForPage(pageId, {
      type: 'hero',
      order: 0,
      props: {
        eyebrow: 'Head & Growshop',
        title: 'Premium grow gear shipped EU-wide',
        subtitle: 'Lighting, nutrients, automation, and expert support in one store.',
        ctaLabel: 'Shop products',
        ctaHref: '/product',
      },
    });

    createSectionForPage(pageId, {
      type: 'product-grid',
      order: 1,
      props: {
        title: 'Featured essentials',
        limit: 4,
      },
    });
  };

  seedDefaultPages();

  const mock: any = {
    $connect: async () => Promise.resolve(),
    $disconnect: async () => Promise.resolve(),
    user: {
      async deleteMany(args?: { where?: { email?: string } }) {
        const before = users.length;
        if (args?.where?.email) {
          for (let i = users.length - 1; i >= 0; i -= 1) {
            if (users[i].email === args.where.email) {
              users.splice(i, 1);
            }
          }
        } else {
          users.length = 0;
        }
        return { count: before - users.length };
      },
      async findUnique(args: { where: { email: string } }) {
        const found = users.find((user) => user.email === args.where.email);
        return found ? clone(found) : null;
      },
      async create(args: { data: any }) {
        const user = {
          id: ensureId(args.data.id),
          email: args.data.email,
          name: args.data.name ?? null,
          password: args.data.password ?? '',
          role: args.data.role ?? 'USER',
          status: 'ACTIVE',
          createdAt: now(),
          updatedAt: now(),
        };
        users.push(user);
        return clone(user);
      },
    },
    location: {
      async create(args: { data: any }) {
        const location = {
          id: ensureId(args.data.id),
          name: args.data.name,
          type: args.data.type ?? 'WAREHOUSE',
          createdAt: now(),
          updatedAt: now(),
        };
        locations.push(location);
        return clone(location);
      },
      async deleteMany() {
        const count = locations.length;
        locations.length = 0;
        return { count };
      },
    },
    product: {
      async create(args: { data: any }) {
        const product = {
          id: ensureId(args.data.id),
          title: args.data.title ?? '',
          slug: args.data.slug ?? randomUUID(),
          description: args.data.description ?? '',
          price: Number(args.data.price ?? 0),
          taxRate: Number(args.data.taxRate ?? 20),
          productOfWeek: Boolean(args.data.productOfWeek ?? false),
          featured: Boolean(args.data.featured ?? false),
          createdAt: now(),
          updatedAt: now(),
        };
        products.push(product);
        return clone(product);
      },
      async deleteMany() {
        const count = products.length;
        products.length = 0;
        return { count };
      },
      async findMany() {
        return products.map((product) => clone(product));
      },
    },
    productImage: {
      async create(args: { data: any }) {
        const image = {
          id: ensureId(args.data.id),
          productId: args.data.productId,
          url: args.data.url ?? '',
          altText: args.data.altText ?? null,
          priority: Number(args.data.priority ?? 0),
          createdAt: now(),
          updatedAt: now(),
        };
        productImages.push(image);
        return clone(image);
      },
      async deleteMany(args?: { where?: { productId?: string } }) {
        const before = productImages.length;
        if (args?.where?.productId) {
          for (let i = productImages.length - 1; i >= 0; i -= 1) {
            if (productImages[i].productId === args.where.productId) {
              productImages.splice(i, 1);
            }
          }
        } else {
          productImages.length = 0;
        }
        return { count: before - productImages.length };
      },
    },
    productVariant: {
      async create(args: { data: any }) {
        const variant = {
          id: ensureId(args.data.id),
          sku: args.data.sku ?? randomUUID(),
          productId: args.data.productId,
          priceOverride: args.data.priceOverride ?? null,
          attributes: args.data.attributes ?? null,
          createdAt: now(),
          updatedAt: now(),
        };
        variants.push(variant);
        return clone(variant);
      },
      async findFirst(args: { where: any }) {
        const entries = variants.filter((variant) =>
          Object.entries(args.where ?? {}).every(([key, value]) =>
            value === undefined ? true : variant[key] === value
          )
        );
        return entries.length > 0 ? clone(entries[0]) : null;
      },
      async deleteMany() {
        const count = variants.length;
        variants.length = 0;
        return { count };
      },
    },
    inventoryStock: {
      async create(args: { data: any }) {
        const record = {
          id: ensureId(args.data.id),
          variantId: args.data.variantId,
          locationId: args.data.locationId,
          quantity: Number(args.data.quantity ?? 0),
          createdAt: now(),
          updatedAt: now(),
        };
        inventory.push(record);
        return clone(record);
      },
      async findMany(args?: {
        include?: {
          variant?: { select?: { sku?: boolean; product?: { select?: { title?: boolean } } } } | true;
          location?: { select?: { name?: boolean } } | true;
        };
      }) {
        return inventory.map((record) => {
          const output: any = clone(record);
          if (args?.include?.variant) {
            const variant = variants.find((entry) => entry.id === record.variantId);
            const variantSelect = typeof args.include.variant === 'object' ? args.include.variant.select : undefined;
            const productSelect = variantSelect?.product?.select;
            const product = variant ? products.find((p) => p.id === variant.productId) : undefined;
            output.variant = {};
            if (!variantSelect || variantSelect.sku) {
              output.variant.sku = variant?.sku ?? null;
            }
            if (!variantSelect || variantSelect.product) {
              output.variant.product = {
                title: productSelect?.title ? product?.title ?? null : product?.title ?? null,
              };
            }
          }
          if (args?.include?.location) {
            const location = locations.find((entry) => entry.id === record.locationId);
            output.location = {
              name: location?.name ?? null,
            };
          }
          return output;
        });
      },
      async findFirst(args: { where?: { variantId?: string } }) {
        const found = inventory.find((record) =>
          args.where?.variantId ? record.variantId === args.where.variantId : true
        );
        return found ? clone(found) : null;
      },
      async update(args: {
        where: { variantId_locationId: { variantId: string; locationId: string } };
        data: { quantity: { increment: number } };
      }) {
        const { variantId, locationId } = args.where.variantId_locationId;
        const record = inventory.find(
          (entry) => entry.variantId === variantId && entry.locationId === locationId
        );
        if (!record) {
          throw new Error('Record not found');
        }
        record.quantity += args.data.quantity.increment;
        record.updatedAt = now();
        return clone(record);
      },
      async deleteMany() {
        const count = inventory.length;
        inventory.length = 0;
        return { count };
      },
    },
    page: {
      async findMany(args?: {
        orderBy?: { slug?: 'asc' | 'desc' };
        include?: { sections?: true | { orderBy?: { order?: 'asc' | 'desc' } } };
      }) {
        let results = [...pages];
        if (args?.orderBy?.slug === 'asc') {
          results.sort((a, b) => a.slug.localeCompare(b.slug));
        }
        if (args?.orderBy?.slug === 'desc') {
          results.sort((a, b) => b.slug.localeCompare(a.slug));
        }
        return results.map((page) => applyPageInclude(page, args?.include));
      },
      async findUnique(args: {
        where: { slug?: string; id?: string };
        include?: { sections?: true | { orderBy?: { order?: 'asc' | 'desc' } } };
      }) {
        const { where } = args;
        const page = pages.find((candidate) =>
          where.id ? candidate.id === where.id : candidate.slug === where.slug
        );
        return page ? applyPageInclude(page, args.include) : null;
      },
      async create(args: {
        data: any;
        include?: { sections?: true | { orderBy?: { order?: 'asc' | 'desc' } } };
      }) {
        const page = {
          id: ensureId(args.data.id),
          slug: args.data.slug ?? '',
          title: args.data.title ?? '',
          status: args.data.status ?? 'DRAFT',
          isDefaultHome: Boolean((args.data as any).isDefaultHome ?? false),
          publishedAt: (args.data as any).publishedAt ?? null,
          createdAt: now(),
          updatedAt: now(),
        };
        pages.push(page);

        const sectionCreates = (args.data.sections?.create ?? []) as any[];
        sectionCreates.forEach((section) => createSectionForPage(page.id, section));

        return applyPageInclude(page, args.include);
      },
      async update(args: {
        where: { id: string };
        data: {
          status?: string;
          publishedAt?: string | Date | null;
          sections?: {
            deleteMany?: { pageId?: string };
            create?: any[];
          };
        };
        include?: { sections?: true | { orderBy?: { order?: 'asc' | 'desc' } } };
      }) {
        const index = pages.findIndex((page) => page.id === args.where.id);
        if (index === -1) {
          throw new Error('Page not found');
        }

        const page = pages[index];
        if (args.data.status !== undefined) {
          page.status = args.data.status;
        }
        if ('publishedAt' in args.data) {
          page.publishedAt = args.data.publishedAt ?? null;
        }
        page.updatedAt = now();

        if (args.data.sections?.deleteMany) {
          sections = sections.filter((section) => section.pageId !== page.id);
        }

        if (Array.isArray(args.data.sections?.create)) {
          args.data.sections.create.forEach((section) => createSectionForPage(page.id, section));
        }

        pages[index] = page;
        return applyPageInclude(page, args.include);
      },
    },
    review: {
      async create(args: { data: any }) {
        const review = {
          id: ensureId(args.data.id),
          productId: args.data.productId,
          userId: args.data.userId,
          rating: args.data.rating ?? 0,
          comment: args.data.comment ?? '',
          createdAt: now(),
        };
        reviews.push(review);
        return clone(review);
      },
      async findMany(args?: { where?: { productId?: string } }) {
        let result = [...reviews];
        if (args?.where?.productId) {
          result = result.filter((review) => review.productId === args.where!.productId);
        }
        return result.map((review) => clone(review));
      },
      async deleteMany() {
        const count = reviews.length;
        reviews.length = 0;
        return { count };
      },
    },
    order: {
      async create(args: { data: any }) {
        const order = {
          id: ensureId(args.data.id),
          orderNumber: args.data.orderNumber ?? randomUUID(),
          userId: args.data.userId ?? null,
          status: args.data.status ?? 'PENDING',
          total: Number(args.data.total ?? 0),
          currency: args.data.currency ?? 'EUR',
          shippingInfo: args.data.shippingInfo ?? null,
          billingInfo: args.data.billingInfo ?? null,
          createdAt: now(),
          updatedAt: now(),
        };
        orders.push(order);
        return clone(order);
      },
      async update(args: { where: { id: string }; data: any }) {
        const order = orders.find((entry) => entry.id === args.where.id);
        if (!order) {
          throw new Error('Order not found');
        }
        Object.assign(order, args.data, { updatedAt: now() });
        return clone(order);
      },
      async findMany() {
        return orders.map((order) => clone(order));
      },
      async deleteMany() {
        const count = orders.length;
        orders.length = 0;
        orderItems.length = 0;
        return { count };
      },
    },
    orderItem: {
      async create(args: { data: any }) {
        const item = {
          id: ensureId(args.data.id),
          orderId: args.data.orderId,
          variantId: args.data.variantId,
          quantity: Number(args.data.quantity ?? 0),
          price: Number(args.data.price ?? 0),
          title: args.data.title ?? '',
          createdAt: now(),
          updatedAt: now(),
        };
        orderItems.push(item);
        return clone(item);
      },
      async deleteMany(args?: { where?: { orderId?: string } }) {
        const before = orderItems.length;
        if (args?.where?.orderId) {
          for (let i = orderItems.length - 1; i >= 0; i -= 1) {
            if (orderItems[i].orderId === args.where.orderId) {
              orderItems.splice(i, 1);
            }
          }
        } else {
          orderItems.length = 0;
        }
        return { count: before - orderItems.length };
      },
    },
  };

  return mock as PrismaClient;
}

beforeAll(() => {
  global.__PRISMA_TEST_MOCK__ = createMockPrisma();
});

export function decorateFastifyWithMock(fastifyInstance: ReturnType<typeof Fastify>) {
  if (!global.__PRISMA_TEST_MOCK__) {
    global.__PRISMA_TEST_MOCK__ = createMockPrisma();
  }
  fastifyInstance.decorate('prisma', global.__PRISMA_TEST_MOCK__);
}

export { createMockPrisma };
