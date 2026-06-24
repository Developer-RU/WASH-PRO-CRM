import { SchemaField } from '../types';

export function findUnknownFields(
  data: Record<string, unknown>,
  schema: SchemaField[],
  prefix = ''
): string[] {
  const errors: string[] = [];
  const allowed = new Set(schema.map((field) => field.name));

  for (const key of Object.keys(data)) {
    if (!allowed.has(key)) {
      errors.push(`Unknown field "${prefix}${key}"`);
    }
  }

  for (const field of schema) {
    const value = data[field.name];
    if (
      field.type === 'object' &&
      field.children?.length &&
      value !== undefined &&
      value !== null &&
      typeof value === 'object' &&
      !Array.isArray(value)
    ) {
      errors.push(
        ...findUnknownFields(value as Record<string, unknown>, field.children, `${prefix}${field.name}.`)
      );
    }
  }

  return errors;
}

/** Keep only fields defined in the endpoint schema (nested objects included). */
export function pickSchemaData(data: Record<string, unknown>, schema: SchemaField[]): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const field of schema) {
    if (!(field.name in data)) continue;
    const value = data[field.name];

    if (
      field.type === 'object' &&
      field.children?.length &&
      value !== null &&
      typeof value === 'object' &&
      !Array.isArray(value)
    ) {
      result[field.name] = pickSchemaData(value as Record<string, unknown>, field.children);
      continue;
    }

    result[field.name] = value;
  }

  return result;
}
