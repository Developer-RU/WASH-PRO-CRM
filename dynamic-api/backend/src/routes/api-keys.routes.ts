import { Router } from 'express';
import { apiKeyService } from '../services';
import { authenticate, requirePermission, asyncHandler } from '../middleware';
import { paramId } from '../utils/params';

const router = Router();

router.use(authenticate);
router.use(requirePermission('manage_api'));

router.get('/', asyncHandler(async (_req, res) => {
  const keys = await apiKeyService.getAll();
  res.json({ success: true, data: keys });
}));

router.post('/', asyncHandler(async (req, res) => {
  const key = await apiKeyService.create(req.body);
  res.status(201).json({ success: true, data: key });
}));

router.delete('/:id', asyncHandler(async (req, res) => {
  await apiKeyService.delete(paramId(req));
  res.json({ success: true, message: 'API key revoked' });
}));

export default router;
