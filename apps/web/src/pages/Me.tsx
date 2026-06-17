import type { SafeUser } from '@homeward/shared';
import { api } from '../lib/api';

export function Me({ user, onLogout }: { user: SafeUser; onLogout: () => void }) {
  async function logout() {
    await api.logout().catch(() => {});
    onLogout();
  }

  return (
    <div className="card">
      <div className="row">
        <strong>{user.displayName}</strong>
        <button className="ghost" onClick={logout}>
          ออกจากระบบ
        </button>
      </div>
      <p className="hint">
        สถานะ: เข้าสู่ระบบแล้ว ✓ — นี่คือผลลัพธ์จาก <code>GET /me</code> (เกณฑ์ผ่านของ Phase 0)
      </p>
      <pre>{JSON.stringify(user, null, 2)}</pre>
    </div>
  );
}
