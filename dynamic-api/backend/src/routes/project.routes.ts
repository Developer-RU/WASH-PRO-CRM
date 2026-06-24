import { Router, Response } from 'express';
import { projectService } from '../services';
import { authenticate, requirePermission, asyncHandler, AuthenticatedRequest } from '../middleware';
import { ProjectBundle } from '../services/project.service';

const router = Router();

router.use(authenticate);
router.use(requirePermission('manage_api'));

router.get('/export', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const includeData = req.query.includeData === 'true';
  const includeSettings = req.query.includeSettings === 'true';
  const bundle = await projectService.export({ includeData, includeSettings });
  res.json({ success: true, data: bundle });
}));

router.post('/import', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const body = req.body as ProjectBundle & { mode?: string; includeData?: boolean; bundle?: ProjectBundle };
  const bundle = body.platform ? body : body.bundle;
  if (!bundle?.platform) {
    res.status(400).json({ success: false, error: 'Invalid project bundle' });
    return;
  }
  const mode = body.mode === 'replace' ? 'replace' : 'merge';
  const includeData = body.includeData !== false;
  const stats = await projectService.import(
    bundle,
    { mode, includeData },
    req.user?.userId
  );
  res.json({ success: true, data: stats, message: 'Project imported successfully' });
}));

export default router;
