import { Router, type Response } from 'express';

import { createAuthMiddleware } from './auth.middleware.js';
import { AuthError, type AuthService } from './auth.service.js';
import {
  forgotPasswordSchema,
  formatValidationErrors,
  loginSchema,
  refreshTokenSchema,
  registerSchema,
  resetPasswordSchema,
} from './auth.validator.js';

export function createAuthRouter(authService: AuthService): Router {
  const router = Router();
  const requireAuth = createAuthMiddleware(authService);

  router.post('/register', async (req, res) => {
    const parsedBody = registerSchema.safeParse(req.body);

    if (!parsedBody.success) {
      res.status(400).json({
        message: 'Invalid request body',
        errors: formatValidationErrors(parsedBody.error),
      });
      return;
    }

    try {
      const authResult = await authService.register(parsedBody.data);
      res.status(201).json(authResult);
    } catch (error) {
      sendAuthError(res, error);
    }
  });

  router.get('/admin-bootstrap/status', async (_req, res) => {
    try {
      const hasAdminUsers = await authService.hasAdminUsers();
      res.json({ needsBootstrap: !hasAdminUsers });
    } catch (error) {
      sendAuthError(res, error);
    }
  });

  router.post('/admin-bootstrap/register', async (req, res) => {
    const parsedBody = registerSchema.safeParse(req.body);

    if (!parsedBody.success) {
      res.status(400).json({
        message: 'Invalid request body',
        errors: formatValidationErrors(parsedBody.error),
      });
      return;
    }

    try {
      const authResult = await authService.bootstrapAdmin(parsedBody.data);
      res.status(201).json(authResult);
    } catch (error) {
      sendAuthError(res, error);
    }
  });

  router.post('/login', async (req, res) => {
    const parsedBody = loginSchema.safeParse(req.body);

    if (!parsedBody.success) {
      res.status(400).json({
        message: 'Invalid request body',
        errors: formatValidationErrors(parsedBody.error),
      });
      return;
    }

    try {
      const authResult = await authService.login(parsedBody.data);
      res.json(authResult);
    } catch (error) {
      sendAuthError(res, error);
    }
  });

  router.post('/refresh', async (req, res) => {
    const parsedBody = refreshTokenSchema.safeParse(req.body);

    if (!parsedBody.success) {
      res.status(400).json({
        message: 'Invalid request body',
        errors: formatValidationErrors(parsedBody.error),
      });
      return;
    }

    try {
      const authResult = await authService.refresh(parsedBody.data);
      res.json(authResult);
    } catch (error) {
      sendAuthError(res, error);
    }
  });

  router.post('/logout', async (req, res) => {
    const parsedBody = refreshTokenSchema.safeParse(req.body);

    if (!parsedBody.success) {
      res.status(400).json({
        message: 'Invalid request body',
        errors: formatValidationErrors(parsedBody.error),
      });
      return;
    }

    try {
      await authService.logout(parsedBody.data);
      res.json({ success: true });
    } catch (error) {
      sendAuthError(res, error);
    }
  });

  router.post('/forgot-password', async (req, res) => {
    const parsedBody = forgotPasswordSchema.safeParse(req.body);

    if (!parsedBody.success) {
      res.status(400).json({
        message: 'Invalid request body',
        errors: formatValidationErrors(parsedBody.error),
      });
      return;
    }

    try {
      const result = await authService.requestPasswordReset(parsedBody.data.email);
      res.json({
        success: true,
        resetToken: result.resetToken,
        message: 'If the email exists, a reset token has been created.',
      });
    } catch (error) {
      sendAuthError(res, error);
    }
  });

  router.post('/reset-password', async (req, res) => {
    const parsedBody = resetPasswordSchema.safeParse(req.body);

    if (!parsedBody.success) {
      res.status(400).json({
        message: 'Invalid request body',
        errors: formatValidationErrors(parsedBody.error),
      });
      return;
    }

    try {
      await authService.resetPassword(parsedBody.data.token, parsedBody.data.password);
      res.json({ success: true });
    } catch (error) {
      sendAuthError(res, error);
    }
  });

  router.get('/me', requireAuth, (req, res) => {
    if (!req.user) {
      res.status(401).json({ message: 'Authentication required' });
      return;
    }

    res.json({ user: req.user });
  });

  return router;
}

function sendAuthError(res: Response, error: unknown): void {
  if (error instanceof AuthError) {
    res.status(error.statusCode).json({ message: error.message });
    return;
  }

  res.status(500).json({ message: 'Internal server error' });
}
