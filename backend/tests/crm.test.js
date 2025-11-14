"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const crm_1 = require("../src/lib/crm");
(0, globals_1.describe)('CRM Library', () => {
    (0, globals_1.it)('should simulate syncing a customer successfully', async () => {
        const customer = {
            id: 'user-123',
            email: 'customer@example.com',
            name: 'Test Customer',
        };
        const result = await (0, crm_1.syncCustomerToCRM)(customer);
        (0, globals_1.expect)(result.success).toBe(true);
        (0, globals_1.expect)(result.crmId).toBe('crm_user-123');
    });
});
//# sourceMappingURL=crm.test.js.map