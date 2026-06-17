import type { UserDocument } from '../models/User.js';

// Augment Express Request with auth context set by requireAuth.
declare global {
  namespace Express {
    interface Request {
      userId?: string;
      userDoc?: UserDocument;
    }
  }
}

export {};
