import { describe, it, expect } from '@jest/globals';
import { syncCustomerToCRM } from '../src/lib/crm';

describe('CRM Library', () => {
    it('should simulate syncing a customer successfully', async () => {
        const customer = {
            id: 'user-123',
            email: 'customer@example.com',
            name: 'Test Customer',
        };

        const result = await syncCustomerToCRM(customer);

        expect(result.success).toBe(true);
        expect(result.crmId).toBe('crm_user-123');
    });
});
