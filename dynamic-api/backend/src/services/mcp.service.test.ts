import { describe, expect, it } from 'vitest';
import { buildMcpToolName } from '../services/mcp.service';

describe('MCP tool naming', () => {
  it('normalizes method and path into tool name', () => {
    expect(buildMcpToolName('GET', '/api/products')).toBe('get_api_products');
    expect(buildMcpToolName('POST', '/api/machine/sale')).toBe('post_api_machine_sale');
  });
});
