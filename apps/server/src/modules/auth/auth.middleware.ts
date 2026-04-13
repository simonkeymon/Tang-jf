import type { RequestHandler } from 'express';
import type { Request, Response } from 'express';

import { AuthError, type AuthService } from './auth.service.js';

export function createAuthMiddleware(authService: AuthService): RequestHandler {
  return (req, res, next) => {
    const authorizationHeader = req.headers.authorization;

    if (!authorizationHeader) {
      rejectUnauthorizedRequest(req, res);
      return;
    }

    const [scheme, token] = authorizationHeader.split(' ');

    if (scheme?.toLowerCase() !== 'bearer' || !token) {
      rejectUnauthorizedRequest(req, res);
      return;
    }

    try {
      req.user = authService.authenticateAccessToken(token);
      next();
    } catch (error) {
      if (error instanceof AuthError) {
        rejectUnauthorizedRequest(req, res, error.statusCode, error.message);
        return;
      }

      rejectUnauthorizedRequest(req, res);
    }
  };
}

function rejectUnauthorizedRequest(
  req: Request,
  res: Response,
  statusCode = 401,
  message = 'Authentication required',
) {
  if (req.complete || req.readableEnded || !isStreamingRequest(req)) {
    res.status(statusCode).json({ message });
    return;
  }

  const respond = () => {
    if (!res.headersSent) {
      res.status(statusCode).json({ message });
    }
  };

  req.once('end', respond);
  req.once('error', respond);
  req.resume();
}

function isStreamingRequest(req: Request): boolean {
  const contentType = req.headers['content-type'];
  return typeof contentType === 'string' && contentType.includes('multipart/form-data');
}
