export function enablePrismaTestMocking() {
  process.env.PRISMA_TEST_MODE = 'mock';
  if (!process.env.DATABASE_URL) {
    process.env.DATABASE_URL = 'postgresql://localhost:5432/hugs_test';
  }
}
