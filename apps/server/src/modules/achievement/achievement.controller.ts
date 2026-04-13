import { Router } from 'express';
import type { RequestHandler } from 'express';

import type { AchievementService } from './achievement.service.js';

export function createAchievementRouter(
  achievementService: AchievementService,
  requireAuth: RequestHandler,
): Router {
  const router = Router();

  router.get('/', requireAuth, (req, res) => {
    if (!req.user) {
      res.status(401).json({ message: 'Authentication required' });
      return;
    }

    res.json({ achievements: achievementService.listAchievements(req.user.id) });
  });

  router.get('/badges', requireAuth, (req, res) => {
    if (!req.user) {
      res.status(401).json({ message: 'Authentication required' });
      return;
    }

    const achievements = achievementService.listAchievements(req.user.id);
    res.json({ badges: achievements.filter((achievement) => achievement.unlocked) });
  });

  return router;
}
