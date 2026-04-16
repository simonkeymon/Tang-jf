import { Router } from 'express';
import type { RequestHandler } from 'express';

import { PlanError, type PlanService } from './plan.service.js';

export function createPlanRouter(planService: PlanService, requireAuth: RequestHandler): Router {
  const router = Router();

  router.post('/generate', requireAuth, async (req, res) => {
    if (!req.user) {
      res.status(401).json({ message: 'Authentication required' });
      return;
    }

    try {
      const plan = await planService.generatePlan(req.user.id);
      res.status(201).json({ plan });
    } catch (error) {
      sendPlanError(res, error);
    }
  });

  router.get('/current', requireAuth, (req, res) => {
    if (!req.user) {
      res.status(401).json({ message: 'Authentication required' });
      return;
    }

    const plan = planService.getCurrentPlan(req.user.id);
    if (!plan) {
      res.status(404).json({ message: 'Active plan not found' });
      return;
    }

    res.json({ plan });
  });

  router.get('/list', requireAuth, (req, res) => {
    if (!req.user) {
      res.status(401).json({ message: 'Authentication required' });
      return;
    }

    res.json({ plans: planService.listPlans(req.user.id) });
  });

  router.get('/:id', requireAuth, (req, res) => {
    if (!req.user) {
      res.status(401).json({ message: 'Authentication required' });
      return;
    }

    const plan = planService.getPlan(req.user.id, req.params.id);
    if (!plan) {
      res.status(404).json({ message: 'Plan not found' });
      return;
    }

    res.json({ plan });
  });

  return router;
}

function sendPlanError(res: Parameters<RequestHandler>[1], error: unknown): void {
  if (error instanceof PlanError) {
    res.status(error.statusCode).json({ message: error.message });
    return;
  }

  console.error('Plan generation failed:', error);

  res.status(500).json({ message: 'Internal server error' });
}
