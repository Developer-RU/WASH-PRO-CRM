import { Router } from 'express';
import { cronScheduler } from '../services';
import { authenticate, requirePermission, asyncHandler } from '../middleware';
import { paramId } from '../utils/params';

const router = Router();

router.use(authenticate);
router.use(requirePermission('manage_api'));

router.get('/', asyncHandler(async (_req, res) => {
  const jobs = await cronScheduler.getAll();
  res.json({ success: true, data: jobs });
}));

router.post('/', asyncHandler(async (req, res) => {
  const job = await cronScheduler.create(req.body);
  res.status(201).json({ success: true, data: job });
}));

router.put('/:id', asyncHandler(async (req, res) => {
  const job = await cronScheduler.update(paramId(req), req.body);
  res.json({ success: true, data: job });
}));

router.delete('/:id', asyncHandler(async (req, res) => {
  await cronScheduler.delete(paramId(req));
  res.json({ success: true, message: 'Cron job deleted' });
}));

router.post('/:id/run', asyncHandler(async (req, res) => {
  const result = await cronScheduler.runJob(paramId(req));
  res.json({ success: true, data: result });
}));

export default router;
