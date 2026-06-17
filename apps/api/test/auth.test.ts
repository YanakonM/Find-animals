import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import request from 'supertest';
import { createApp } from '../src/app.js';

let mongod: MongoMemoryServer;
const app = createApp();

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
  await mongoose.syncIndexes();
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

beforeEach(async () => {
  // Clean slate between tests.
  const collections = mongoose.connection.collections;
  for (const key of Object.keys(collections)) {
    await collections[key]!.deleteMany({});
  }
});

// Pull the session cookie out of a Set-Cookie header for the next request.
function sessionCookie(res: request.Response): string {
  const raw = res.headers['set-cookie'];
  const arr = Array.isArray(raw) ? raw : raw ? [raw] : [];
  const cookie = arr.find((c) => c.startsWith('hw_session='));
  if (!cookie) throw new Error('no session cookie set');
  return cookie.split(';')[0]!;
}

describe('auth + /me (Phase 0 acceptance)', () => {
  it('registers, sets a session cookie, and returns a safe user', async () => {
    const res = await request(app)
      .post('/auth/register')
      .send({ email: 'ada@example.com', password: 'password123', displayName: 'Ada' });

    expect(res.status).toBe(201);
    expect(res.body.user).toMatchObject({
      email: 'ada@example.com',
      displayName: 'Ada',
      roles: ['eyes'],
      reputation: 0,
    });
    // Server-only fields must never leak.
    expect(res.body.user.passwordHash).toBeUndefined();
    expect(res.body.user.preciseHome).toBeUndefined();
    expect(sessionCookie(res)).toContain('hw_session=');
  });

  it('rejects duplicate email registration with 409', async () => {
    const body = { email: 'dup@example.com', password: 'password123', displayName: 'Dup' };
    await request(app).post('/auth/register').send(body);
    const res = await request(app).post('/auth/register').send(body);
    expect(res.status).toBe(409);
  });

  it('rejects weak passwords with 400', async () => {
    const res = await request(app)
      .post('/auth/register')
      .send({ email: 'weak@example.com', password: 'short', displayName: 'Weak' });
    expect(res.status).toBe(400);
  });

  it('logs in with correct credentials and fetches /me', async () => {
    await request(app)
      .post('/auth/register')
      .send({ email: 'log@example.com', password: 'password123', displayName: 'Logan' });

    const login = await request(app)
      .post('/auth/login')
      .send({ email: 'log@example.com', password: 'password123' });
    expect(login.status).toBe(200);

    const me = await request(app).get('/me').set('Cookie', sessionCookie(login));
    expect(me.status).toBe(200);
    expect(me.body.user.email).toBe('log@example.com');
  });

  it('rejects login with wrong password (401)', async () => {
    await request(app)
      .post('/auth/register')
      .send({ email: 'pw@example.com', password: 'password123', displayName: 'Pat' });
    const res = await request(app)
      .post('/auth/login')
      .send({ email: 'pw@example.com', password: 'wrongpassword' });
    expect(res.status).toBe(401);
  });

  it('rejects /me without a session (401)', async () => {
    const res = await request(app).get('/me');
    expect(res.status).toBe(401);
  });

  it('signs in via the LINE stub verifier and creates a user', async () => {
    const res = await request(app).post('/auth/line').send({ idToken: 'U-test-line-id' });
    expect(res.status).toBe(200);
    expect(res.body.user.lineUserId).toBe('stub:U-test-line-id');

    // Same id_token resolves to the same user (find-or-create).
    const me = await request(app).get('/me').set('Cookie', sessionCookie(res));
    expect(me.body.user.lineUserId).toBe('stub:U-test-line-id');
  });

  it('updates search prefs through PATCH /me/search-prefs', async () => {
    const reg = await request(app)
      .post('/auth/register')
      .send({ email: 'prefs@example.com', password: 'password123', displayName: 'Prrefs' });
    const cookie = sessionCookie(reg);

    const res = await request(app)
      .patch('/me/search-prefs')
      .set('Cookie', cookie)
      .send({ radiusKm: 5, available: true, species: ['sun_conure'] });

    expect(res.status).toBe(200);
    expect(res.body.user.searchPrefs).toMatchObject({
      radiusKm: 5,
      available: true,
      species: ['sun_conure'],
    });
  });
});
