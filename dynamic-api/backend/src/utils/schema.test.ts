import { describe, expect, it } from 'vitest';
import { findUnknownFields, pickSchemaData } from './schema';
import { SchemaField } from '../types';

const productSchema: SchemaField[] = [
  { name: 'name', type: 'string', required: true, order: 0 },
  { name: 'price', type: 'number', required: true, order: 1 },
  {
    name: 'meta',
    type: 'object',
    required: false,
    order: 2,
    children: [{ name: 'sku', type: 'string', required: true, order: 0 }],
  },
];

describe('schema data utilities', () => {
  it('detects unknown top-level fields', () => {
    const errors = findUnknownFields({ name: 'A', price: 1, extra: true }, productSchema);
    expect(errors).toContain('Unknown field "extra"');
  });

  it('detects unknown nested fields', () => {
    const errors = findUnknownFields({ meta: { sku: 'x', hack: 1 } }, productSchema);
    expect(errors).toContain('Unknown field "meta.hack"');
  });

  it('picks only schema-defined fields', () => {
    const picked = pickSchemaData(
      { name: 'A', price: 10, extra: 'drop', meta: { sku: 's1', noise: true } },
      productSchema
    );
    expect(picked).toEqual({ name: 'A', price: 10, meta: { sku: 's1' } });
  });
});
