import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

import sharp from 'sharp';

export interface StoredUpload {
  filename: string;
  relativePath: string;
  url: string;
}

export interface UploadService {
  saveImage(file: Express.Multer.File): Promise<StoredUpload>;
}

const DEFAULT_UPLOAD_ROOT = path.resolve(process.cwd(), 'uploads');

export function createUploadService(options?: {
  uploadRoot?: string;
  publicBaseUrl?: string;
}): UploadService {
  const uploadRoot = options?.uploadRoot ?? process.env.UPLOAD_ROOT ?? DEFAULT_UPLOAD_ROOT;
  const publicBaseUrl = options?.publicBaseUrl ?? '';

  return {
    async saveImage(file) {
      const now = new Date();
      const year = String(now.getFullYear());
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const extension = getExtension(file.mimetype);
      const filename = `${randomUUID()}.${extension}`;
      const relativePath = path.posix.join(year, month, filename);
      const outputDirectory = path.join(uploadRoot, year, month);
      const outputPath = path.join(outputDirectory, filename);

      await mkdir(outputDirectory, { recursive: true });

      const optimized = await sharp(file.buffer)
        .rotate()
        .resize({ width: 1920, withoutEnlargement: true })
        .jpeg({ quality: 80 })
        .toBuffer();

      await writeFile(outputPath, optimized);

      return {
        filename,
        relativePath,
        url: publicBaseUrl
          ? `${publicBaseUrl.replace(/\/$/, '')}/${relativePath}`
          : `/uploads/${relativePath}`,
      };
    },
  };
}

function getExtension(mimetype: string): string {
  switch (mimetype) {
    case 'image/png':
      return 'png';
    case 'image/webp':
      return 'webp';
    case 'image/jpeg':
    case 'image/jpg':
    default:
      return 'jpg';
  }
}
