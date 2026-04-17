import { Router } from 'express';
import type { RequestHandler } from 'express';
import { z } from 'zod';

import type { TrackingService } from './tracking.service.js';

const weightSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  weight_kg: z.number().min(20).max(300),
  note: z.string().optional(),
});

const checkinSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  meal_type: z.enum(['早餐', '午餐', '晚餐', '加餐']),
  status: z.enum(['completed', 'skipped', 'partial']),
  calories: z.number().int().min(0).max(5000).optional(),
  note: z.string().max(1000).optional(),
});

export function createTrackingRouter(
  trackingService: TrackingService,
  requireAuth: RequestHandler,
): Router {
  const router = Router();

  router.post('/weight', requireAuth, (req, res) => {
    if (!req.user) {
      res.status(401).json({ message: 'Authentication required' });
      return;
    }

    const parsed = weightSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ message: 'Invalid request body' });
      return;
    }

    const entry = trackingService.upsertWeight(req.user.id, parsed.data);
    res.status(201).json({ entry });
  });

  router.get('/weight', requireAuth, (req, res) => {
    if (!req.user) {
      res.status(401).json({ message: 'Authentication required' });
      return;
    }

    const from = typeof req.query.from === 'string' ? req.query.from : undefined;
    const to = typeof req.query.to === 'string' ? req.query.to : undefined;
    const entries = trackingService.listWeights(req.user.id, from, to);
    res.json({ entries });
  });

  router.post('/checkin', requireAuth, (req, res) => {
    if (!req.user) {
      res.status(401).json({ message: 'Authentication required' });
      return;
    }

    const parsed = checkinSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ message: 'Invalid request body' });
      return;
    }

    const checkin = trackingService.upsertCheckin(req.user.id, parsed.data);
    res.status(201).json({ checkin });
  });

  router.get('/checkin/today', requireAuth, (req, res) => {
    if (!req.user) {
      res.status(401).json({ message: 'Authentication required' });
      return;
    }

    const entries = trackingService.getTodayCheckins(req.user.id);
    res.json({ entries });
  });

  router.get('/streak', requireAuth, (req, res) => {
    if (!req.user) {
      res.status(401).json({ message: 'Authentication required' });
      return;
    }

    res.json({ streak: trackingService.getStreak(req.user.id) });
  });

  return router;
}
