import type { RequestHandler } from 'express';

export function createAdminGuard(requireAuth: RequestHandler): RequestHandler {
  return (req, res, next) => {
    requireAuth(req, res, (error?: unknown) => {
      if (error) {
        next(error);
        return;
      }

      if (!req.user) {
        res.status(401).json({ message: 'Authentication required' });
        return;
      }

      if (req.user.role !== 'admin') {
        res.status(403).json({ message: 'Admin access required' });
        return;
      }

      next();
    });
  };
}
