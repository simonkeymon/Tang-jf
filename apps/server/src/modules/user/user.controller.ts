import { Router } from 'express';
import type { RequestHandler } from 'express';

import type { UserService } from './user.service.js';
import {
  formatValidationErrors,
  patchProfileSchema,
  putProfileSchema,
  updateAllergiesSchema,
  updateRestrictionsSchema,
} from './user.validator.js';

export function createUserRouter(userService: UserService, requireAuth: RequestHandler): Router {
  const router = Router();

  router.get('/profile', requireAuth, (req, res) => {
    if (!req.user) {
      res.status(401).json({ message: 'Authentication required' });
      return;
    }

    const profile = userService.getProfile(req.user.id);

    if (!profile) {
      res.status(404).json({ message: 'Profile not found' });
      return;
    }

    res.json({ profile });
  });

  router.put('/profile', requireAuth, (req, res) => {
    if (!req.user) {
      res.status(401).json({ message: 'Authentication required' });
      return;
    }

    const parsed = putProfileSchema.safeParse(req.body);

    if (!parsed.success) {
      res.status(400).json({
        message: 'Invalid request body',
        errors: formatValidationErrors(parsed.error),
      });
      return;
    }

    const profile = userService.putProfile(req.user.id, parsed.data);
    res.json({ profile });
  });

  router.patch('/profile', requireAuth, (req, res) => {
    if (!req.user) {
      res.status(401).json({ message: 'Authentication required' });
      return;
    }

    const parsed = patchProfileSchema.safeParse(req.body);

    if (!parsed.success) {
      res.status(400).json({
        message: 'Invalid request body',
        errors: formatValidationErrors(parsed.error),
      });
      return;
    }

    const profile = userService.patchProfile(req.user.id, parsed.data);

    if (!profile) {
      res.status(404).json({ message: 'Profile not found' });
      return;
    }

    res.json({ profile });
  });

  router.patch('/allergies', requireAuth, (req, res) => {
    if (!req.user) {
      res.status(401).json({ message: 'Authentication required' });
      return;
    }

    const parsed = updateAllergiesSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        message: 'Invalid request body',
        errors: formatValidationErrors(parsed.error),
      });
      return;
    }

    const profile = userService.updateAllergies(req.user.id, parsed.data.allergies);
    if (!profile) {
      res.status(404).json({ message: 'Profile not found' });
      return;
    }

    res.json({ profile });
  });

  router.patch('/restrictions', requireAuth, (req, res) => {
    if (!req.user) {
      res.status(401).json({ message: 'Authentication required' });
      return;
    }

    const parsed = updateRestrictionsSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        message: 'Invalid request body',
        errors: formatValidationErrors(parsed.error),
      });
      return;
    }

    const profile = userService.updateRestrictions(req.user.id, parsed.data.dietary_restrictions);
    if (!profile) {
      res.status(404).json({ message: 'Profile not found' });
      return;
    }

    res.json({ profile });
  });

  return router;
}
