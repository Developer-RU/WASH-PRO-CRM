import { Router } from 'express';
import { openApiService } from '../services';

const router = Router();

router.get('/openapi.json', async (_req, res) => {
  const spec = await openApiService.generateSpec('/api');
  res.json(spec);
});

router.get('/swagger', (_req, res) => {
  res.type('html').send(openApiService.swaggerHtml('/api/openapi.json'));
});

export default router;
