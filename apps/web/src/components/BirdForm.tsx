import { useState } from 'react';
import { SEED_SPECIES, normalizeRing, type BirdProfile } from '@homeward/shared';
import { api } from '../lib/api';

export function BirdForm({ onCreated }: { onCreated: (bird: BirdProfile) => void }) {
  const [name, setName] = useState('');
  const [species, setSpecies] = useState<string>(SEED_SPECIES[0]);
  const [ring, setRing] = useState('');
  const [marks, setMarks] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      let photos: string[] = [];
      if (file) {
        const up = await api.uploadImage(file);
        photos = [up.url];
      }
      const { bird } = await api.createBird({
        name,
        category: 'bird',
        species,
        photos,
        legRing: ring.trim() ? { number: ring.trim() } : undefined,
        distinguishingMarks: marks.trim() || undefined,
        status: 'home',
      });
      onCreated(bird);
      setName('');
      setRing('');
      setMarks('');
      setFile(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to register');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card">
      <h2 className="section-title">ลงทะเบียนนก / Register a bird</h2>
      <form onSubmit={submit}>
        <label htmlFor="b-name">ชื่อ / Name</label>
        <input id="b-name" value={name} onChange={(e) => setName(e.target.value)} required />

        <label htmlFor="b-species">ชนิด / Species</label>
        <select id="b-species" value={species} onChange={(e) => setSpecies(e.target.value)}>
          {SEED_SPECIES.map((s) => (
            <option key={s} value={s}>
              {s.replace(/_/g, ' ')}
            </option>
          ))}
        </select>

        <label htmlFor="b-ring">เลขห่วงขา / Leg ring (optional)</label>
        <input id="b-ring" value={ring} onChange={(e) => setRing(e.target.value)} placeholder="TH-2023 / 123" />
        {ring.trim() && (
          <p className="hint">normalized: <code>{normalizeRing(ring)}</code></p>
        )}

        <label htmlFor="b-marks">ตำหนิ / Distinguishing marks (optional)</label>
        <input id="b-marks" value={marks} onChange={(e) => setMarks(e.target.value)} />

        <label htmlFor="b-photo">รูป / Photo (optional)</label>
        <input
          id="b-photo"
          type="file"
          accept="image/*"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />

        <button className="primary" type="submit" disabled={busy}>
          {busy ? 'กำลังบันทึก…' : 'บันทึก / Register'}
        </button>
      </form>
      {error && <div className="error">{error}</div>}
    </div>
  );
}
