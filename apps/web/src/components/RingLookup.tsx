import { useState } from 'react';
import { api, type RingLookupResult } from '../lib/api';

export function RingLookup() {
  const [ring, setRing] = useState('');
  const [result, setResult] = useState<RingLookupResult | null>(null);
  const [busy, setBusy] = useState(false);

  async function lookup(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setResult(null);
    try {
      setResult(await api.lookupRing(ring));
    } catch {
      setResult({ found: false });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card">
      <h2 className="section-title">ค้นด้วยเลขห่วงขา / Ring lookup</h2>
      <form onSubmit={lookup} className="lookup-row">
        <input value={ring} onChange={(e) => setRing(e.target.value)} placeholder="เลขห่วงขา" required />
        <button className="primary" type="submit" disabled={busy}>
          ค้นหา
        </button>
      </form>
      {result &&
        (result.found && result.bird ? (
          <div className="lookup-hit">
            ✓ พบ: <strong>{result.bird.name}</strong> ({result.bird.species.replace(/_/g, ' ')}) —{' '}
            ring {result.bird.ring}, สถานะ {result.bird.status}
          </div>
        ) : (
          <div className="hint">ไม่พบนกที่ตรงกับเลขนี้</div>
        ))}
    </div>
  );
}
