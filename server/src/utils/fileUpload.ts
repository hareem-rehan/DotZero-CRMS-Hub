import multer from 'multer';
import { S3Client, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import { Request } from 'express';
import path from 'path';
import fs from 'fs';
import { env } from '../config/env';

// Local uploads directory (used when S3 is not configured)
export const LOCAL_UPLOADS_DIR = path.resolve(__dirname, '../../uploads');

// ─── S3 Client ───────────────────────────────────────────────────────────────

export const s3 = new S3Client({
  region: env.S3_REGION ?? 'us-east-1',
  credentials:
    env.S3_ACCESS_KEY && env.S3_SECRET_KEY
      ? { accessKeyId: env.S3_ACCESS_KEY, secretAccessKey: env.S3_SECRET_KEY }
      : undefined,
});

// ─── Allowed MIME types ───────────────────────────────────────────────────────

const ALLOWED_MIME_TYPES: Record<string, string> = {
  'application/pdf': '.pdf',
  'application/msword': '.doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
  'application/vnd.ms-excel': '.xls',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx',
  'image/png': '.png',
  'image/jpeg': '.jpg',
};

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

// ─── Multer memory storage (files buffered, then streamed to S3) ─────────────

export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE, files: 5 },
  fileFilter: (_req: Request, file, cb) => {
    if (ALLOWED_MIME_TYPES[file.mimetype]) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported file type: ${file.mimetype}. Allowed: PDF, XLS, XLSX, PNG, JPEG`));
    }
  },
});

// ─── Upload buffer to S3 ─────────────────────────────────────────────────────

export interface UploadedFile {
  key: string;
  url: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
}

export const uploadToS3 = async (
  file: Express.Multer.File,
  folder: string,
): Promise<UploadedFile> => {
  const ext = path.extname(file.originalname) || ALLOWED_MIME_TYPES[file.mimetype] || '';
  const key = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;
  const bucket = env.S3_BUCKET ?? 'dotzero-crms';

  // In development without AWS credentials, save to local filesystem
  if (!env.S3_ACCESS_KEY) {
    const localDir = path.join(LOCAL_UPLOADS_DIR, path.dirname(key));
    fs.mkdirSync(localDir, { recursive: true });
    fs.writeFileSync(path.join(LOCAL_UPLOADS_DIR, key), file.buffer);
    return {
      key,
      url: `http://localhost:${env.PORT ?? 4000}/uploads/${key}`,
      fileName: file.originalname,
      fileSize: file.size,
      mimeType: file.mimetype,
    };
  }

  const uploader = new Upload({
    client: s3,
    params: {
      Bucket: bucket,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype,
      ContentDisposition: `attachment; filename="${file.originalname}"`,
    },
  });

  await uploader.done();

  return {
    key,
    url: `https://${bucket}.s3.${env.S3_REGION ?? 'us-east-1'}.amazonaws.com/${key}`,
    fileName: file.originalname,
    fileSize: file.size,
    mimeType: file.mimetype,
  };
};

export const deleteFromS3 = async (key: string): Promise<void> => {
  await s3.send(
    new DeleteObjectCommand({
      Bucket: env.S3_BUCKET ?? 'dotzero-crms',
      Key: key,
    }),
  );
};
