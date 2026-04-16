import { Router } from 'express';
import type { RequestHandler } from 'express';
import multer from 'multer';

import type { UploadService } from './upload.service.js';
import { uploadImageMiddleware } from './upload.middleware.js';

export function createUploadRouter(
  uploadService: UploadService,
  requireAuth: RequestHandler,
): Router {
  const router = Router();

  router.post('/image', requireAuth, uploadImageMiddleware.single('image'), async (req, res) => {
    if (!req.user) {
      res.status(401).json({ message: 'Authentication required' });
      return;
    }

    if (!req.file) {
      res.status(400).json({ message: 'Image file is required' });
      return;
    }

    try {
      const stored = await uploadService.saveImage(req.file, req.user.id);
      res.json({ file: stored });
    } catch (error) {
      res.status(500).json({ message: error instanceof Error ? error.message : 'Upload failed' });
    }
  });

  router.use(
    (
      error: unknown,
      _req: Parameters<RequestHandler>[0],
      res: Parameters<RequestHandler>[1],
      next: Parameters<RequestHandler>[2],
    ) => {
      if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') {
        res.status(413).json({ message: 'File too large' });
        return;
      }

      if (error instanceof Error && error.message === 'Unsupported file type') {
        res.status(400).json({ message: 'Unsupported file type' });
        return;
      }

      next(error as never);
    },
  );

  return router;
}
