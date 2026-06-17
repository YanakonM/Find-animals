import { useEffect, useState } from 'react';
import type { SafeUser, BirdProfile } from '@homeward/shared';
import { api } from '../lib/api';
import { BirdForm } from '../components/BirdForm';
import { BirdList } from '../components/BirdList';
import { RingLookup } from '../components/RingLookup';

export function Dashboard({ user, onLogout }: { user: SafeUser; onLogout: () => void }) {
  const [birds, setBirds] = useState<BirdProfile[]>([]);

  async function refresh() {
    const { birds: list } = await api.listMyBirds();
    setBirds(list);
  }

  useEffect(() => {
    refresh().catch(() => setBirds([]));
  }, []);

  async function logout() {
    await api.logout().catch(() => {});
    onLogout();
  }

  return (
    <>
      <div className="card">
        <div className="row">
          <strong>{user.displayName}</strong>
          <button className="ghost" onClick={logout}>
            ออกจากระบบ
          </button>
        </div>
        <p className="hint">เข้าสู่ระบบแล้ว ✓ — ลงทะเบียนนกและสร้างโปสเตอร์ได้เลย</p>
      </div>

      <BirdForm onCreated={() => void refresh()} />
      <BirdList birds={birds} />
      <RingLookup />
    </>
  );
}
