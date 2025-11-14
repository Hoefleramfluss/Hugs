// This file is executed before all test suites.
// You can use it to set up global configurations or mocks.
//
// Set up environment variables for all tests to ensure consistency.
import { enablePrismaTestMocking } from './tests/setupPrisma';

process.env.JWT_SECRET = 'test-secret-from-global-setup';
 (process.env as Record<string, string>).NODE_ENV = 'test';
process.env.STRIPE_SECRET_KEY = 'sk_test_mockkey';
process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_mocksecret';

enablePrismaTestMocking();
