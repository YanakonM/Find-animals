import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { env, cloudinaryConfigured } from '../config/env.js';
import { logger } from '../config/logger.js';
import { cloudinary } from './cloudinary.js';

export interface UploadInput {
  buffer: Buffer;
  contentType: string; // e.g. "image/png"
  folder?: string; // logical grouping, e.g. "birds" | "posters"
}

export interface UploadResult {
  url: string;
  publicId: string;
}

export interface MediaStore {
  readonly kind: 'cloudinary' | 'local';
  uploadImage(input: UploadInput): Promise<UploadResult>;
}

const EXT_BY_TYPE: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/webp': 'webp',
  'image/gif': 'gif',
};

function extFor(contentType: string): string {
  return EXT_BY_TYPE[contentType] ?? 'bin';
}

// Local disk fallback — used when Cloudinary is not configured, so photo upload
// and poster generation work end-to-end in dev/test without external creds.
class LocalMediaStore implements MediaStore {
  readonly kind = 'local' as const;
  private dir = resolve(process.cwd(), env.UPLOAD_DIR);

  async uploadImage(input: UploadInput): Promise<UploadResult> {
    const folder = input.folder ?? 'misc';
    const id = randomUUID();
    const name = `${id}.${extFor(input.contentType)}`;
    const folderPath = join(this.dir, folder);
    await mkdir(folderPath, { recursive: true });
    await writeFile(join(folderPath, name), input.buffer);
    const publicId = `${folder}/${name}`;
    return { url: `${env.PUBLIC_API_URL}/uploads/${publicId}`, publicId };
  }
}

class CloudinaryMediaStore implements MediaStore {
  readonly kind = 'cloudinary' as const;

  uploadImage(input: UploadInput): Promise<UploadResult> {
    return new Promise((resolvePromise, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder: `homeward/${input.folder ?? 'misc'}`, resource_type: 'image' },
        (err, result) => {
          if (err || !result) return reject(err ?? new Error('Cloudinary upload failed'));
          resolvePromise({ url: result.secure_url, publicId: result.public_id });
        },
      );
      stream.end(input.buffer);
    });
  }
}

export const mediaStore: MediaStore = cloudinaryConfigured
  ? new CloudinaryMediaStore()
  : new LocalMediaStore();

logger.info({ kind: mediaStore.kind }, 'media store initialised');
