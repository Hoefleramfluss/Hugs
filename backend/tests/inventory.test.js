"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const fastify_1 = __importDefault(require("fastify"));
const inventory_1 = __importDefault(require("../src/routes/inventory"));
const prisma_1 = __importDefault(require("../src/plugins/prisma"));
const jwt_1 = __importDefault(require("@fastify/jwt"));
// Mock authenticate function
const mockAuthenticate = async (request, reply) => { };
(0, globals_1.describe)('Inventory Routes', () => {
    let app;
    let prisma;
    let testProduct;
    let testVariant;
    let testLocation;
    let adminToken;
    (0, globals_1.beforeAll)(async () => {
        app = (0, fastify_1.default)();
        app.register(jwt_1.default, { secret: 'test-secret' });
        app.register(prisma_1.default);
        app.register(inventory_1.default);
        // Mock the preHandler for all routes in this test
        app.addHook('preHandler', (request, reply, done) => {
            request.user = { id: 'admin-id', email: 'admin@test.com', role: 'ADMIN' };
            done();
        });
        await app.ready();
        prisma = app.prisma;
        // Setup test data
        testLocation = await prisma.location.create({ data: { name: 'Test Warehouse' } });
        testProduct = await prisma.product.create({ data: { title: 'Test Inv Product', slug: 'test-inv-prod', description: '', price: 10 } });
        testVariant = await prisma.productVariant.create({ data: { productId: testProduct.id, sku: 'TEST-INV-SKU' } });
        await prisma.inventoryStock.create({ data: { variantId: testVariant.id, locationId: testLocation.id, quantity: 100 } });
        adminToken = app.jwt.sign({ id: 'admin-id', role: 'ADMIN' });
    });
    (0, globals_1.afterAll)(async () => {
        // Clean up test data
        await prisma.inventoryStock.deleteMany({});
        await prisma.productVariant.deleteMany({});
        await prisma.product.deleteMany({});
        await prisma.location.deleteMany({});
        await app.close();
    });
    (0, globals_1.it)('should get all stock levels', async () => {
        const response = await app.inject({
            method: 'GET',
            url: '/api/inventory/stock',
            headers: { 'Authorization': `Bearer ${adminToken}` }
        });
        (0, globals_1.expect)(response.statusCode).toBe(200);
        const stockLevels = JSON.parse(response.body);
        (0, globals_1.expect)(stockLevels.length).toBeGreaterThan(0);
        (0, globals_1.expect)(stockLevels[0].quantity).toBe(100);
    });
    (0, globals_1.it)('should adjust stock for a variant', async () => {
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
        (0, globals_1.expect)(response.statusCode).toBe(200);
        const updatedStock = JSON.parse(response.body);
        (0, globals_1.expect)(updatedStock.quantity).toBe(90);
        // Verify in DB
        const dbStock = await prisma.inventoryStock.findFirst({ where: { variantId: testVariant.id } });
        (0, globals_1.expect)(dbStock?.quantity).toBe(90);
    });
});
//# sourceMappingURL=inventory.test.js.map