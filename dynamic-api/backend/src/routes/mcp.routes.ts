import { Router, Response } from 'express';
import { mcpService } from '../services';
import { asyncHandler, authenticate, requirePermission } from '../middleware';

const router = Router();

router.get('/tools', authenticate, requirePermission('manage_api'), asyncHandler(async (_req, res) => {
  const tools = await mcpService.listTools();
  res.json({ success: true, data: tools });
}));

router.post('/', asyncHandler(async (req, res: Response) => {
  const body = req.body;
  if (Array.isArray(body)) {
    const responses = await Promise.all(body.map((item) => mcpService.handleJsonRpc(item)));
    res.json(responses);
    return;
  }
  const response = await mcpService.handleJsonRpc(body);
  res.json(response);
}));

export default router;
