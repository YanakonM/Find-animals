import { v2 as cloudinary } from 'cloudinary';
import { env, cloudinaryConfigured } from '../config/env.js';
import { logger } from '../config/logger.js';

// Phase 0: configure the SDK if credentials are present. Actual uploads/signing
// arrive in Phase 1 (passport photos, posters). We only expose config status.
export function configureCloudinary(): void {
  if (!cloudinaryConfigured) {
    logger.warn('cloudinary: not configured (uploads disabled until Phase 1 creds set)');
    return;
  }
  cloudinary.config({
    cloud_name: env.CLOUDINARY_CLOUD_NAME,
    api_key: env.CLOUDINARY_API_KEY,
    api_secret: env.CLOUDINARY_API_SECRET,
    secure: true,
  });
  logger.info('cloudinary: configured');
}

export function cloudinaryStatus(): 'configured' | 'unconfigured' {
  return cloudinaryConfigured ? 'configured' : 'unconfigured';
}

export { cloudinary };
