import { Router } from 'express';
import type { RequestHandler } from 'express';
import { z } from 'zod';

import { FoodAnalysisError, type FoodAnalysisService } from './food-analysis.service.js';

const analyzeSchema = z.object({
  image_url: z.string().url(),
  note: z.string().optional(),
});

export function createFoodAnalysisRouter(
  foodAnalysisService: FoodAnalysisService,
  requireAuth: RequestHandler,
): Router {
  const router = Router();

  router.post('/analyze', requireAuth, async (req, res) => {
    if (!req.user) {
      res.status(401).json({ message: 'Authentication required' });
      return;
    }

    const parsed = analyzeSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ message: 'Invalid request body' });
      return;
    }

    try {
      const analysis = await foodAnalysisService.analyze(
        req.user.id,
        parsed.data.image_url,
        parsed.data.note,
      );
      res.json({ analysis });
    } catch (error) {
      sendFoodAnalysisError(res, error);
    }
  });

  router.get('/:id', requireAuth, (req, res) => {
    if (!req.user) {
      res.status(401).json({ message: 'Authentication required' });
      return;
    }

    const analysis = foodAnalysisService.getAnalysis(req.params.id);
    if (!analysis) {
      res.status(404).json({ message: 'Analysis not found' });
      return;
    }

    res.json({ analysis });
  });

  return router;
}

function sendFoodAnalysisError(res: Parameters<RequestHandler>[1], error: unknown): void {
  if (error instanceof FoodAnalysisError) {
    res.status(error.statusCode).json({ message: error.message });
    return;
  }

  res.status(500).json({ message: 'Internal server error' });
}
