import { useState } from 'react';
import type { SafeUser } from '@homeward/shared';
import { api } from '../lib/api';
import { getLineIdToken, liffConfigured } from '../lib/liff';

type Mode = 'login' | 'register';

export function Login({ onAuthed }: { onAuthed: (u: SafeUser) => void }) {
  const [mode, setMode] = useState<Mode>('register');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res =
        mode === 'register'
          ? await api.register(email, password, displayName)
          : await api.login(email, password);
      onAuthed(res.user);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setBusy(false);
    }
  }

  async function lineLogin() {
    setError(null);
    setBusy(true);
    try {
      const idToken = await getLineIdToken();
      const res = await api.lineLogin(idToken);
      onAuthed(res.user);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'LINE login failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card">
      <div className="tabs">
        <button className={mode === 'register' ? 'active' : ''} onClick={() => setMode('register')}>
          สมัคร / Register
        </button>
        <button className={mode === 'login' ? 'active' : ''} onClick={() => setMode('login')}>
          เข้าสู่ระบบ / Login
        </button>
      </div>

      <form onSubmit={submit}>
        {mode === 'register' && (
          <>
            <label htmlFor="displayName">ชื่อที่แสดง / Display name</label>
            <input
              id="displayName"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              required
            />
          </>
        )}
        <label htmlFor="email">อีเมล / Email</label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <label htmlFor="password">รหัสผ่าน / Password</label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <button className="primary" type="submit" disabled={busy}>
          {busy ? '…' : mode === 'register' ? 'สมัครสมาชิก' : 'เข้าสู่ระบบ'}
        </button>
      </form>

      <button className="line" onClick={lineLogin} disabled={busy}>
        เข้าสู่ระบบด้วย LINE
      </button>

      {error && <div className="error">{error}</div>}

      {!liffConfigured && (
        <p className="hint">
          โหมดพัฒนา: ยังไม่ได้ตั้งค่า LIFF — ปุ่ม LINE จะใช้ตัวตรวจสอบแบบ stub
          (dev only). The LINE button uses the dev stub verifier until VITE_LIFF_ID is set.
        </p>
      )}
    </div>
  );
}
