import { Router } from 'express';
import type { RequestHandler } from 'express';

import type { ExportService } from './export.service.js';

export function createExportRouter(
  exportService: ExportService,
  requireAuth: RequestHandler,
): Router {
  const router = Router();

  router.get('/data', requireAuth, (req, res) => {
    if (!req.user) {
      res.status(401).json({ message: 'Authentication required' });
      return;
    }

    const format = typeof req.query.format === 'string' ? req.query.format : 'json';

    if (format === 'csv') {
      const csv = exportService.exportCsv(req.user.id);
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.send(csv);
      return;
    }

    res.json(exportService.exportJson(req.user.id));
  });

  return router;
}
