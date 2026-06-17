import { Router } from 'express';
import multer from 'multer';
import { asyncHandler } from '../lib/asyncHandler.js';
import { requireAuth } from '../middleware/auth.js';
import { HttpError } from '../lib/httpError.js';
import { mediaStore } from '../lib/media.js';

export const uploadsRouter = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 }, // 8 MB
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new HttpError(400, 'Only image uploads are allowed', 'bad_request'));
  },
});

// Upload a single image → MediaStore (Cloudinary or local). Returns the URL the
// client then stores in BirdProfile.photos.
uploadsRouter.post(
  '/uploads/image',
  requireAuth,
  upload.single('file'),
  asyncHandler(async (req, res) => {
    if (!req.file) throw HttpError.badRequest('No file provided (field "file")');
    const result = await mediaStore.uploadImage({
      buffer: req.file.buffer,
      contentType: req.file.mimetype,
      folder: 'birds',
    });
    res.status(201).json(result);
  }),
);
