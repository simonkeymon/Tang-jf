import { Router } from 'express';
import type { RequestHandler } from 'express';
import { z } from 'zod';

import { SummaryError, type SummaryService } from './summary.service.js';

const generateSchema = z.object({
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
});

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export function createSummaryRouter(
  summaryService: SummaryService,
  requireAuth: RequestHandler,
): Router {
  const router = Router();

  router.post('/generate', requireAuth, async (req, res) => {
    if (!req.user) {
      res.status(401).json({ message: 'Authentication required' });
      return;
    }

    const parsed = generateSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      res.status(400).json({ message: 'Invalid request body' });
      return;
    }

    try {
      const summary = await summaryService.generateSummary(req.user.id, parsed.data.date);
      res.json({ summary });
    } catch (error) {
      sendSummaryError(res, error);
    }
  });

  router.get('/today', requireAuth, (req, res) => {
    if (!req.user) {
      res.status(401).json({ message: 'Authentication required' });
      return;
    }

    const today = new Date().toISOString().slice(0, 10);
    const summary = summaryService.getSummary(req.user.id, today);
    if (!summary) {
      res.status(404).json({ message: 'Summary not found' });
      return;
    }

    res.json({ summary });
  });

  router.get('/:date', requireAuth, (req, res) => {
    if (!req.user) {
      res.status(401).json({ message: 'Authentication required' });
      return;
    }

    const parsedDate = dateSchema.safeParse(req.params.date);
    if (!parsedDate.success) {
      res.status(400).json({ message: 'Invalid date parameter' });
      return;
    }

    const summary = summaryService.getSummary(req.user.id, parsedDate.data);
    if (!summary) {
      res.status(404).json({ message: 'Summary not found' });
      return;
    }

    res.json({ summary });
  });

  return router;
}

function sendSummaryError(res: Parameters<RequestHandler>[1], error: unknown): void {
  if (error instanceof SummaryError) {
    res.status(error.statusCode).json({ message: error.message });
    return;
  }

  res.status(500).json({ message: 'Internal server error' });
}
