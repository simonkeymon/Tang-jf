import type { RequestHandler } from 'express';

import { AuthError, type AuthService } from './auth.service.js';

export function createAuthMiddleware(authService: AuthService): RequestHandler {
  return (req, res, next) => {
    const authorizationHeader = req.headers.authorization;

    if (!authorizationHeader) {
      res.status(401).json({ message: 'Authentication required' });
      return;
    }

    const [scheme, token] = authorizationHeader.split(' ');

    if (scheme?.toLowerCase() !== 'bearer' || !token) {
      res.status(401).json({ message: 'Authentication required' });
      return;
    }

    try {
      req.user = authService.authenticateAccessToken(token);
      next();
    } catch (error) {
      if (error instanceof AuthError) {
        res.status(error.statusCode).json({ message: error.message });
        return;
      }

      res.status(401).json({ message: 'Authentication required' });
    }
  };
}
