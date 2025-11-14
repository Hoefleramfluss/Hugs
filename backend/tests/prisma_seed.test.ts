import { describe, it, expect } from '@jest/globals';
import { isProductionDatabase, requiresProdConfirmation } from '../prisma/seed';

describe('prisma seed safety helpers', () => {
  it('detects production database URLs', () => {
    expect(isProductionDatabase(undefined)).toBe(false);
    expect(isProductionDatabase('postgresql://localhost:5432/app')).toBe(false);
    expect(isProductionDatabase('postgres://hugs-headshop-20251108122937/db')).toBe(true);
    expect(isProductionDatabase('postgres://user@hugs-pg-instance-prod')).toBe(true);
  });

  it('enforces confirmation for production', () => {
    const prodUrl = 'postgres://hugs-headshop-20251108122937/db';
    expect(requiresProdConfirmation(prodUrl, undefined)).toBe(true);
    expect(requiresProdConfirmation(prodUrl, 'true')).toBe(false);
    expect(requiresProdConfirmation('postgres://localhost/dev', undefined)).toBe(false);
  });
});
