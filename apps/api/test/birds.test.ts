import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
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
  const collections = mongoose.connection.collections;
  for (const key of Object.keys(collections)) {
    await collections[key]!.deleteMany({});
  }
});

function sessionCookie(res: request.Response): string {
  const raw = res.headers['set-cookie'];
  const arr = Array.isArray(raw) ? raw : raw ? [raw] : [];
  const cookie = arr.find((c) => c.startsWith('hw_session='));
  if (!cookie) throw new Error('no session cookie');
  return cookie.split(';')[0]!;
}

// Register a fresh user and return its session cookie.
async function newUser(email: string): Promise<string> {
  const res = await request(app)
    .post('/auth/register')
    .send({ email, password: 'password123', displayName: email.split('@')[0] });
  return sessionCookie(res);
}

const sampleBird = {
  name: 'Very',
  species: 'sun_conure',
  legRing: { number: 'TH-2023 / 123', year: 2023 },
  distinguishingMarks: 'missing left outer toe',
};

describe('Phase 1 — bird passport, ring registry, poster', () => {
  it('creates a passport, normalizes the ring, and grants the owner role', async () => {
    const cookie = await newUser('owner1@example.com');
    const res = await request(app).post('/birds').set('Cookie', cookie).send(sampleBird);

    expect(res.status).toBe(201);
    expect(res.body.bird).toMatchObject({ name: 'Very', species: 'sun_conure', status: 'home' });
    // Raw kept, normalized = uppercase alphanumerics only.
    expect(res.body.bird.legRing.number).toBe('TH-2023 / 123');
    expect(res.body.bird.legRing.normalized).toBe('TH2023123');

    const me = await request(app).get('/me').set('Cookie', cookie);
    expect(me.body.user.roles).toContain('owner');
  });

  it('rejects a duplicate ring with 409', async () => {
    const a = await newUser('owner2@example.com');
    const b = await newUser('owner3@example.com');
    expect((await request(app).post('/birds').set('Cookie', a).send(sampleBird)).status).toBe(201);
    // Different formatting, same normalized ring → conflict.
    const dup = await request(app)
      .post('/birds')
      .set('Cookie', b)
      .send({ name: 'Copycat', species: 'macaw', legRing: { number: 'th 2023 123' } });
    expect(dup.status).toBe(409);
  });

  it('looks up a bird by ring (normalized), no auth required', async () => {
    const cookie = await newUser('owner4@example.com');
    await request(app).post('/birds').set('Cookie', cookie).send(sampleBird);

    const hit = await request(app).get('/birds/lookup').query({ ring: 'th2023123' });
    expect(hit.status).toBe(200);
    expect(hit.body).toMatchObject({
      found: true,
      bird: { name: 'Very', species: 'sun_conure', ring: 'TH2023123' },
    });

    const miss = await request(app).get('/birds/lookup').query({ ring: 'ZZZ999' });
    expect(miss.body).toEqual({ found: false });
  });

  it('lists the owner own birds via ?owner=me', async () => {
    const cookie = await newUser('owner5@example.com');
    await request(app).post('/birds').set('Cookie', cookie).send(sampleBird);
    const res = await request(app).get('/birds').query({ owner: 'me' }).set('Cookie', cookie);
    expect(res.status).toBe(200);
    expect(res.body.birds).toHaveLength(1);
  });

  it('forbids editing a bird you do not own (403)', async () => {
    const owner = await newUser('owner6@example.com');
    const other = await newUser('intruder@example.com');
    const created = await request(app).post('/birds').set('Cookie', owner).send(sampleBird);
    const id = created.body.bird.id;

    const forbidden = await request(app)
      .patch(`/birds/${id}`)
      .set('Cookie', other)
      .send({ name: 'Hacked' });
    expect(forbidden.status).toBe(403);

    const ok = await request(app)
      .patch(`/birds/${id}`)
      .set('Cookie', owner)
      .send({ temperament: 'tame' });
    expect(ok.status).toBe(200);
    expect(ok.body.bird.temperament).toBe('tame');
  });

  it('requires auth to create a bird (401)', async () => {
    const res = await request(app).post('/birds').send(sampleBird);
    expect(res.status).toBe(401);
  });

  it('uploads an image to the media store', async () => {
    const cookie = await newUser('uploader@example.com');
    // 1x1 transparent PNG.
    const png = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      'base64',
    );
    const res = await request(app)
      .post('/uploads/image')
      .set('Cookie', cookie)
      .attach('file', png, { filename: 'p.png', contentType: 'image/png' });
    expect(res.status).toBe(201);
    expect(res.body.url).toMatch(/\/uploads\/birds\/.+\.png$/);
  });

  it('generates a downloadable PNG poster (the wedge acceptance)', async () => {
    const cookie = await newUser('poster@example.com');
    const created = await request(app).post('/birds').set('Cookie', cookie).send(sampleBird);
    const id = created.body.bird.id;

    const res = await request(app)
      .post(`/birds/${id}/poster`)
      .set('Cookie', cookie)
      .send({ mode: 'lost', contact: '08x-xxx-xxxx' });
    expect(res.status).toBe(201);
    expect(res.body.posterUrl).toMatch(/\/uploads\/posters\/.+\.png$/);

    // Confirm a real PNG landed on disk (magic bytes).
    const rel = res.body.posterUrl.split('/uploads/')[1] as string;
    const bytes = await readFile(join(process.env.UPLOAD_DIR!, rel));
    expect(bytes.subarray(0, 8)).toEqual(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
    expect(bytes.length).toBeGreaterThan(1000);
  });
});
