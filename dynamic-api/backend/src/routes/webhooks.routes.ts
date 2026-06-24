import { Router } from 'express';
import { webhookService } from '../services';
import { authenticate, requirePermission, asyncHandler } from '../middleware';
import { paramId } from '../utils/params';

const router = Router();

router.use(authenticate);
router.use(requirePermission('manage_api'));

router.get('/', asyncHandler(async (_req, res) => {
  const hooks = await webhookService.getAll();
  res.json({ success: true, data: hooks });
}));

router.post('/', asyncHandler(async (req, res) => {
  const hook = await webhookService.create(req.body);
  res.status(201).json({ success: true, data: hook });
}));

router.put('/:id', asyncHandler(async (req, res) => {
  const hook = await webhookService.update(paramId(req), req.body);
  res.json({ success: true, data: hook });
}));

router.delete('/:id', asyncHandler(async (req, res) => {
  await webhookService.delete(paramId(req));
  res.json({ success: true, message: 'Webhook deleted' });
}));

router.post('/:id/test', asyncHandler(async (req, res) => {
  const result = await webhookService.test(paramId(req));
  res.json({ success: true, data: result });
}));

export default router;
