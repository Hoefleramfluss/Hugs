import bcrypt from 'bcrypt';
import { exit } from 'node:process';
import { PrismaClient, Prisma, LocationType, PageStatus } from '@prisma/client';
import productsJson from './seed-data.json';

type VariantSeed = {
  sku: string;
  attributes?: Record<string, unknown>;
  stock?: Record<string, number>;
  priceOverride?: number;
};

type ProductSeed = {
  title: string;
  slug: string;
  description: string;
  price: number;
  taxRate?: number;
  productOfWeek?: boolean;
  variants: VariantSeed[];
};

const productSeeds = productsJson as ProductSeed[];
const toJsonValue = (value?: Record<string, unknown>): Prisma.InputJsonValue | undefined =>
  value ? (value as Prisma.JsonObject) : undefined;

const prisma = new PrismaClient();

const DEFAULT_ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL ?? 'admin@example.com';
const DEFAULT_ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? 'admin-password-placeholder';
const CONFIRM_PROD_FLAG = process.env.CONFIRM_PROD_SEED;

const locationSeeds = [
  { name: 'store_main', type: LocationType.STORE },
  { name: 'warehouse', type: LocationType.WAREHOUSE },
];

const pageSeeds = [
  {
    slug: 'home',
    title: 'Homepage',
    status: PageStatus.PUBLISHED,
    isDefaultHome: true,
    sections: [
      {
        type: 'hero',
        order: 0,
        props: {
          eyebrow: 'Head & Growshop',
          title: 'Premium grow gear shipped EU-wide',
          subtitle: 'Lighting, nutrients, automation, and expert support in one store.',
          ctaLabel: 'Shop products',
          ctaHref: '/product',
        },
      },
      {
        type: 'product-grid',
        order: 1,
        props: {
          title: 'Featured essentials',
          limit: 4,
        },
      },
    ],
  },
  {
    slug: 'legal',
    title: 'Legal & Compliance',
    status: PageStatus.DRAFT,
    isDefaultHome: false,
    sections: [
      {
        type: 'text-block',
        order: 0,
        props: {
          title: 'Terms & Conditions',
          body: 'Replace with your actual AGB text before publishing.',
        },
      },
    ],
  },
];

export function isProductionDatabase(databaseUrl?: string): boolean {
  if (!databaseUrl) {
    return false;
  }
  const lowered = databaseUrl.toLowerCase();
  return lowered.includes('hugs-headshop') || lowered.includes('hugs-pg-instance-prod');
}

export function requiresProdConfirmation(databaseUrl?: string, confirmationFlag?: string): boolean {
  return isProductionDatabase(databaseUrl) && confirmationFlag !== 'true';
}

async function ensureLocations() {
  const locationMap = new Map<string, string>();

  for (const seed of locationSeeds) {
    const record = await prisma.location.upsert({
      where: { name: seed.name },
      update: {},
      create: { name: seed.name, type: seed.type },
    });
    locationMap.set(seed.name, record.id);
  }

  return locationMap;
}

async function seedAdmin() {
  const hashedPassword = await bcrypt.hash(DEFAULT_ADMIN_PASSWORD, 10);

  const adminUser = await prisma.user.upsert({
    where: { email: DEFAULT_ADMIN_EMAIL },
    update: {
      password: hashedPassword,
      role: 'ADMIN',
      status: 'ACTIVE',
    },
    create: {
      email: DEFAULT_ADMIN_EMAIL,
      name: 'Headshop Admin',
      password: hashedPassword,
      role: 'ADMIN',
    },
  });

  return adminUser;
}

async function seedPages() {
  for (const page of pageSeeds) {
    const upserted = await prisma.page.upsert({
      where: { slug: page.slug },
      update: {
        title: page.title,
        status: page.status,
        isDefaultHome: page.isDefaultHome,
        publishedAt: page.status === PageStatus.PUBLISHED ? new Date() : null,
        sections: {
          deleteMany: {},
          create: page.sections.map(section => ({
            type: section.type,
            order: section.order,
            props: section.props,
          })),
        },
      },
      create: {
        slug: page.slug,
        title: page.title,
        status: page.status,
        isDefaultHome: page.isDefaultHome,
        publishedAt: page.status === PageStatus.PUBLISHED ? new Date() : null,
        sections: {
          create: page.sections.map(section => ({
            type: section.type,
            order: section.order,
            props: section.props,
          })),
        },
      },
      include: { sections: true },
    });

    if (page.isDefaultHome) {
      await prisma.page.updateMany({
        where: { NOT: { slug: page.slug } },
        data: { isDefaultHome: false },
      });
    }

    console.log(`Seeded page ${upserted.slug}`);
  }
}

async function seedProducts(locationMap: Map<string, string>) {
  const flaggedSlug = productSeeds.find(product => product.productOfWeek)?.slug;
  if (flaggedSlug) {
    await prisma.product.updateMany({ data: { productOfWeek: false } });
  }

  for (const product of productSeeds) {
    const productRecord = await prisma.product.upsert({
      where: { slug: product.slug },
      update: {
        title: product.title,
        description: product.description,
        price: product.price,
        taxRate: product.taxRate ?? 20,
        productOfWeek: product.slug === flaggedSlug,
      },
      create: {
        title: product.title,
        slug: product.slug,
        description: product.description,
        price: product.price,
        taxRate: product.taxRate ?? 20,
        productOfWeek: product.slug === flaggedSlug,
      },
    });

    await prisma.productImage.deleteMany({ where: { productId: productRecord.id } });
    await prisma.productImage.create({
      data: {
        productId: productRecord.id,
        url: `https://placehold.co/600x600?text=${encodeURIComponent(product.title)}`,
        altText: product.title,
        priority: 0,
      },
    });

    for (const variant of product.variants) {
      const attributesValue = toJsonValue(variant.attributes);
      const variantRecord = await prisma.productVariant.upsert({
        where: { sku: variant.sku },
        update: {
          productId: productRecord.id,
          priceOverride: variant.priceOverride ?? null,
          ...(attributesValue !== undefined ? { attributes: attributesValue } : {}),
        },
        create: {
          sku: variant.sku,
          productId: productRecord.id,
          priceOverride: variant.priceOverride ?? null,
          ...(attributesValue !== undefined ? { attributes: attributesValue } : {}),
        },
      });

      const stockByLocation = variant.stock ?? {};
      for (const [locationName, quantity] of Object.entries(stockByLocation)) {
        let locationId = locationMap.get(locationName);
        if (!locationId) {
          const location = await prisma.location.upsert({
            where: { name: locationName },
            update: {},
            create: { name: locationName, type: LocationType.WAREHOUSE },
          });
          const newLocationId = location.id;
          locationMap.set(locationName, newLocationId);
          locationId = newLocationId;
        }

        if (!locationId) {
          throw new Error(`Failed to resolve locationId for ${locationName}`);
        }

        await prisma.inventoryStock.upsert({
          where: {
            variantId_locationId: {
              variantId: variantRecord.id,
              locationId,
            },
          },
          update: { quantity },
          create: {
            variantId: variantRecord.id,
            locationId,
            quantity,
          },
        });
      }
    }

    console.log(`Upserted product ${productRecord.slug}`);
  }
}

export async function runSeed() {
  const databaseUrl = process.env.DATABASE_URL;
  if (requiresProdConfirmation(databaseUrl, CONFIRM_PROD_FLAG)) {
    throw new Error(
      'Refusing to seed production database. Re-run with CONFIRM_PROD_SEED=true after taking a backup.'
    );
  }

  console.log('🏁 Starting Prisma seed');
  const locationMap = await ensureLocations();
  await seedAdmin();
  await seedProducts(locationMap);
  await seedPages();
  console.log('✅ Seed completed successfully');
}

export async function runSeedCli() {
  try {
    await runSeed();
  } catch (error) {
    console.error(error);
    exit(1);
  } finally {
    await prisma.$disconnect();
  }
}
