import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import Fastify, { FastifyInstance } from 'fastify';
// FIX: Using named imports for Prisma Client and model types to resolve module resolution issues.
import { PrismaClient, Product, ProductVariant, Location } from '@prisma/client';
import inventoryRoutes from '../src/routes/inventory';
import prismaPlugin from '../src/plugins/prisma';
import fastifyJwt from '@fastify/jwt';

// Mock authenticate function
const mockAuthenticate = async (request: any, reply: any) => {};

describe('Inventory Routes', () => {
    let app: FastifyInstance;
    let prisma: PrismaClient;
    let testProduct: Product;
    let testVariant: ProductVariant;
    let testLocation: Location;
    let adminToken: string;

    beforeAll(async () => {
        app = Fastify();
        app.register(fastifyJwt, { secret: 'test-secret' });
        app.register(prismaPlugin);
        app.register(inventoryRoutes);
        
        // Mock the preHandler for all routes in this test
        app.addHook('preHandler', (request, reply, done) => {
            request.user = { id: 'admin-id', email: 'admin@test.com', role: 'ADMIN' };
            done();
        });
        
        await app.ready();
        prisma = app.prisma;

        // Setup test data
        testLocation = await prisma.location.create({ data: { name: 'Test Warehouse', type: 'WAREHOUSE' }});
        testProduct = await prisma.product.create({ data: { title: 'Test Inv Product', slug: 'test-inv-prod', description: '', price: 10 }});
        testVariant = await prisma.productVariant.create({ data: { productId: testProduct.id, sku: 'TEST-INV-SKU' }});
        await prisma.inventoryStock.create({ data: { variantId: testVariant.id, locationId: testLocation.id, quantity: 100 }});

        adminToken = app.jwt.sign({ id: 'admin-id', role: 'ADMIN' });
    });

    afterAll(async () => {
        // Clean up test data
        await prisma.inventoryStock.deleteMany({});
        await prisma.productVariant.deleteMany({});
        await prisma.product.deleteMany({});
        await prisma.location.deleteMany({});
        await app.close();
    });

    it('should get all stock levels', async () => {
        const response = await app.inject({
            method: 'GET',
            url: '/api/inventory/stock',
            headers: { 'Authorization': `Bearer ${adminToken}` }
        });

        expect(response.statusCode).toBe(200);
        const stockLevels = JSON.parse(response.body);
        expect(stockLevels.length).toBeGreaterThan(0);
        expect(stockLevels[0].quantity).toBe(100);
    });

    it('should adjust stock for a variant', async () => {
        const response = await app.inject({
            method: 'POST',
            url: '/api/inventory/stock/adjust',
            headers: { 'Authorization': `Bearer ${adminToken}` },
            payload: {
                variantId: testVariant.id,
                locationId: testLocation.id,
                change: -10
            }
        });

        expect(response.statusCode).toBe(200);
        const updatedStock = JSON.parse(response.body);
        expect(updatedStock.quantity).toBe(90);

        // Verify in DB
        const dbStock = await prisma.inventoryStock.findFirst({ where: { variantId: testVariant.id }});
        expect(dbStock?.quantity).toBe(90);
    });
});