import { useEffect, useState } from 'react';
import type { SafeUser } from '@homeward/shared';
import { api } from './lib/api';
import { Login } from './pages/Login';
import { Me } from './pages/Me';

export function App() {
  const [user, setUser] = useState<SafeUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Resume an existing session on load.
    api
      .me()
      .then((res) => setUser(res.user))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="app">
      <div className="brand">
        <h1>Homeward</h1>
        <p>พากลับบ้าน — lost pet recovery network</p>
      </div>

      {loading ? (
        <div className="card">Loading…</div>
      ) : user ? (
        <Me user={user} onLogout={() => setUser(null)} />
      ) : (
        <Login onAuthed={setUser} />
      )}
    </div>
  );
}
