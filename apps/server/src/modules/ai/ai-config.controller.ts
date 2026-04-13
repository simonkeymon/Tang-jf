import { Router } from 'express';
import type { RequestHandler } from 'express';
import { z } from 'zod';

import type { AuthenticatedUser } from '../auth/auth.service.js';
import type { AIConfigInput, AIConfigService } from './ai-config.service.js';

const aiConfigSchema = z.object({
  base_url: z.string().url('base_url must be a valid URL'),
  api_key: z.string().min(1, 'api_key is required'),
  model: z.string().min(1, 'model is required'),
  temperature: z.number().min(0).max(2),
  max_tokens: z.number().int().positive(),
  is_custom: z.boolean(),
});

export function createAIConfigRouter(
  aiConfigService: AIConfigService,
  requireAuth: RequestHandler,
): Router {
  const router = Router();

  router.get('/config', requireAuth, (req, res) => {
    if (!req.user) {
      res.status(401).json({ message: 'Authentication required' });
      return;
    }

    const config = aiConfigService.getUserConfig(req.user.id);
    if (!config) {
      res.status(404).json({ message: 'AI config not found' });
      return;
    }

    res.json({ config });
  });

  router.put('/config', requireAuth, (req, res) => {
    if (!req.user) {
      res.status(401).json({ message: 'Authentication required' });
      return;
    }

    const parsed = aiConfigSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        message: 'Invalid request body',
        errors: parsed.error.issues.map((issue) => ({
          field: issue.path.join('.') || 'body',
          message: issue.message,
        })),
      });
      return;
    }

    const config = aiConfigService.setUserConfig(req.user.id, parsed.data);
    res.json({ config });
  });

  router.get('/admin/config', requireAuth, (req, res) => {
    if (!req.user) {
      res.status(401).json({ message: 'Authentication required' });
      return;
    }

    if (!isAdmin(req.user)) {
      res.status(403).json({ message: 'Admin access required' });
      return;
    }

    const config = aiConfigService.getPlatformConfig();
    if (!config) {
      res.status(404).json({ message: 'Platform AI config not found' });
      return;
    }

    res.json({ config });
  });

  router.put('/admin/config', requireAuth, (req, res) => {
    if (!req.user) {
      res.status(401).json({ message: 'Authentication required' });
      return;
    }

    if (!isAdmin(req.user)) {
      res.status(403).json({ message: 'Admin access required' });
      return;
    }

    const parsed = aiConfigSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        message: 'Invalid request body',
        errors: parsed.error.issues.map((issue) => ({
          field: issue.path.join('.') || 'body',
          message: issue.message,
        })),
      });
      return;
    }

    const config = aiConfigService.setPlatformConfig(parsed.data as AIConfigInput);
    res.json({ config });
  });

  return router;
}

export function createAdminAIConfigRouter(
  aiConfigService: AIConfigService,
  requireAuth: RequestHandler,
): Router {
  const router = Router();

  router.get('/config', requireAuth, (req, res) => {
    if (!req.user) {
      res.status(401).json({ message: 'Authentication required' });
      return;
    }

    if (!isAdmin(req.user)) {
      res.status(403).json({ message: 'Admin access required' });
      return;
    }

    const config = aiConfigService.getPlatformConfig();
    if (!config) {
      res.status(404).json({ message: 'Platform AI config not found' });
      return;
    }

    res.json({ config });
  });

  router.put('/config', requireAuth, (req, res) => {
    if (!req.user) {
      res.status(401).json({ message: 'Authentication required' });
      return;
    }

    if (!isAdmin(req.user)) {
      res.status(403).json({ message: 'Admin access required' });
      return;
    }

    const parsed = aiConfigSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        message: 'Invalid request body',
        errors: parsed.error.issues.map((issue) => ({
          field: issue.path.join('.') || 'body',
          message: issue.message,
        })),
      });
      return;
    }

    const config = aiConfigService.setPlatformConfig(parsed.data as AIConfigInput);
    res.json({ config });
  });

  return router;
}

function isAdmin(user: AuthenticatedUser): boolean {
  return user.email === 'admin@example.com';
}
