import { Router } from 'express';
import type { RequestHandler } from 'express';

import type { ReportService } from './report.service.js';

export function createReportRouter(
  reportService: ReportService,
  requireAuth: RequestHandler,
): Router {
  const router = Router();

  router.post('/generate', requireAuth, async (req, res) => {
    if (!req.user) {
      res.status(401).json({ message: 'Authentication required' });
      return;
    }

    const type = req.query.type === 'monthly' ? 'monthly' : 'weekly';
    const report = await reportService.generate(req.user.id, type);
    res.status(201).json({ report });
  });

  router.get('/weekly', requireAuth, (req, res) => {
    if (!req.user) {
      res.status(401).json({ message: 'Authentication required' });
      return;
    }
    const report = reportService.getLatest(req.user.id, 'weekly');
    if (!report) {
      res.status(404).json({ message: 'Weekly report not found' });
      return;
    }
    res.json({ report });
  });

  router.get('/monthly', requireAuth, (req, res) => {
    if (!req.user) {
      res.status(401).json({ message: 'Authentication required' });
      return;
    }
    const report = reportService.getLatest(req.user.id, 'monthly');
    if (!report) {
      res.status(404).json({ message: 'Monthly report not found' });
      return;
    }
    res.json({ report });
  });

  return router;
}
