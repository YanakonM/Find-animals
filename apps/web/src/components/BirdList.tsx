import { useState } from 'react';
import type { BirdProfile } from '@homeward/shared';
import { api } from '../lib/api';

function BirdCard({ bird }: { bird: BirdProfile }) {
  const [posterUrl, setPosterUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function makePoster(mode: 'registered' | 'lost') {
    setError(null);
    setBusy(true);
    try {
      const { posterUrl: url } = await api.generatePoster(bird.id, { mode });
      setPosterUrl(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Poster failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="bird-card">
      <div className="bird-head">
        {bird.photos[0] ? (
          <img className="bird-thumb" src={bird.photos[0]} alt={bird.name} />
        ) : (
          <div className="bird-thumb placeholder">🦜</div>
        )}
        <div>
          <strong>{bird.name}</strong>
          <div className="muted">{bird.species.replace(/_/g, ' ')}</div>
          {bird.legRing && (
            <div className="ring-tag">ring: {bird.legRing.normalized}</div>
          )}
        </div>
      </div>

      <div className="poster-actions">
        <button className="ghost" disabled={busy} onClick={() => makePoster('registered')}>
          โปสเตอร์พาสปอร์ต
        </button>
        <button className="ghost danger" disabled={busy} onClick={() => makePoster('lost')}>
          โปสเตอร์ "หาย"
        </button>
      </div>

      {error && <div className="error">{error}</div>}
      {posterUrl && (
        <div className="poster-preview">
          <img src={posterUrl} alt={`${bird.name} poster`} />
          <a className="primary download" href={posterUrl} download={`${bird.name}-poster.png`}>
            ดาวน์โหลดโปสเตอร์ / Download
          </a>
        </div>
      )}
    </div>
  );
}

export function BirdList({ birds }: { birds: BirdProfile[] }) {
  if (birds.length === 0) {
    return <p className="hint">ยังไม่มีนกที่ลงทะเบียน — เพิ่มตัวแรกด้านบน</p>;
  }
  return (
    <div className="bird-list">
      {birds.map((b) => (
        <BirdCard key={b.id} bird={b} />
      ))}
    </div>
  );
}
