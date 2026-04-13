import { Router } from 'express';
import type { RequestHandler } from 'express';

import type { AuthService } from '../auth/auth.service.js';
import type { AIConfigService } from '../ai/ai-config.service.js';
import type { PlanService } from '../plan/plan.service.js';
import type { TrackingService } from '../tracking/tracking.service.js';

export function createAdminUserRouter(
  authService: AuthService,
  aiConfigService: AIConfigService,
  planService: PlanService,
  trackingService: TrackingService,
  requireAdmin: RequestHandler,
): Router {
  const router = Router();

  router.get('/users', requireAdmin, (_req, res) => {
    const users = authService.listUsers().map((user) => ({
      id: user.id,
      email: user.email,
      hasPlan: planService.listPlans(user.id).length > 0,
      streak: trackingService.getStreak(user.id),
    }));

    res.json({ users, total: users.length });
  });

  router.get('/users/:id', requireAdmin, (req, res) => {
    const user = authService.listUsers().find((item) => item.id === req.params.id);
    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    res.json({
      user: {
        id: user.id,
        email: user.email,
        hasPlan: planService.listPlans(user.id).length > 0,
        streak: trackingService.getStreak(user.id),
      },
    });
  });

  router.get('/dashboard', requireAdmin, (_req, res) => {
    const users = authService.listUsers();
    const activeToday = users.filter(
      (user) => trackingService.getTodayCheckins(user.id).length > 0,
    ).length;

    res.json({
      stats: {
        totalUsers: users.length,
        activeToday,
        plansCreated: users.reduce((sum, user) => sum + planService.listPlans(user.id).length, 0),
        platformAiConfigured: Boolean(aiConfigService.getPlatformConfig()),
      },
    });
  });

  return router;
}
