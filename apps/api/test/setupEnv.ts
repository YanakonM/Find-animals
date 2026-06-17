// Runs before each test module is imported. Sets the env that config/env.ts
// validates at import time. The real Mongo URI is supplied by the in-memory
// server inside the test (createApp does not connect to Mongo itself), so a
// placeholder here is enough to pass validation.
import { tmpdir } from 'node:os';
import { join } from 'node:path';

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-test-secret-1234567890';
process.env.MONGODB_URI = 'mongodb://127.0.0.1:27017/homeward-test-placeholder';
process.env.REDIS_URL = 'redis://127.0.0.1:6379';
process.env.WEB_ORIGIN = 'http://localhost:5173';
process.env.PUBLIC_API_URL = 'http://localhost:4000';
// Local media writes here during tests (Cloudinary unconfigured).
process.env.UPLOAD_DIR = join(tmpdir(), 'homeward-test-uploads');
