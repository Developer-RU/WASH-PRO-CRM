import { Router, Response } from 'express';
import { updateService } from '../services/update.service';
import { updateSettingsService, UpdateSettings } from '../services/update-settings.service';
import { updateScheduler } from '../services/update-scheduler.service';
import { UpdateJob } from '../models/UpdateJob';
import { authenticate, requirePermission, asyncHandler, AuthenticatedRequest } from '../middleware';

const router = Router();

router.use(authenticate);
router.use(requirePermission('manage_users', 'manage_api'));

router.get('/status', asyncHandler(async (_req, res) => {
  const status = await updateService.getStatus();
  res.json({ success: true, data: status });
}));

router.post('/check', asyncHandler(async (_req, res) => {
  const result = await updateService.checkForUpdates(true);
  const status = await updateService.getStatus();
  res.json({ success: true, data: { ...result, settings: status.settings } });
}));

router.get('/settings', asyncHandler(async (_req, res) => {
  const settings = await updateSettingsService.load();
  res.json({ success: true, data: settings });
}));

router.put('/settings', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const settings = await updateSettingsService.update(req.body as Partial<UpdateSettings>);
  await updateScheduler.reloadSchedule();
  res.json({ success: true, data: settings });
}));

router.post('/apply', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const job = await updateService.startUpdate({
    targetVersion: req.body?.targetVersion,
    targetTag: req.body?.targetTag,
    userId: req.user?.userId,
    trigger: 'manual',
  });
  res.json({ success: true, data: job, message: `Update to ${job.targetVersion} started` });
}));

router.post('/dismiss', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const version = req.body?.version as string;
  if (!version) {
    res.status(400).json({ success: false, error: 'version required' });
    return;
  }
  await updateService.dismissNotification(version);
  res.json({ success: true, message: 'Notification dismissed' });
}));

router.get('/jobs', asyncHandler(async (_req, res) => {
  const jobs = await UpdateJob.find().sort({ createdAt: -1 }).limit(20);
  res.json({ success: true, data: jobs });
}));

router.get('/jobs/:id', asyncHandler(async (req, res) => {
  const job = await UpdateJob.findById(req.params.id);
  if (!job) {
    res.status(404).json({ success: false, error: 'Job not found' });
    return;
  }
  res.json({ success: true, data: job });
}));

router.post('/jobs/:id/cancel', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const jobId = String(req.params.id);
  const job = await updateService.cancelJob(jobId);
  res.json({ success: true, data: job, message: 'Update cancelled' });
}));

router.post('/jobs/:id/rollback', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const jobId = String(req.params.id);
  const job = await updateService.rollback(jobId, req.user?.userId);
  res.json({ success: true, data: job, message: 'Rollback initiated' });
}));

export default router;
