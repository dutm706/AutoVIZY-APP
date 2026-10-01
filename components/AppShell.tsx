'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { onAuthStateChanged, signOut, type User } from 'firebase/auth';
import { auth } from '@/lib/firebase/client';
import type { PageAccount, SocialPost, WorkspaceSettings } from '@/lib/types';

const nav = [
  ['dashboard', '⌂', 'Tổng quan'], ['composer', '✎', 'Soạn bài'], ['calendar', '◫', 'Lịch đăng'],
  ['accounts', '◎', 'Tài khoản'], ['pages', '▣', 'Facebook Page'], ['groups', '◉', 'Group / Profile'],
  ['library', '▤', 'Thư viện'], ['ai', '✦', 'AI Studio'], ['settings', '⚙', 'Cài đặt'],
];
const titles: Record<string,string> = Object.fromEntries(nav.map(x => [x[0], x[2]]));

export type Bootstrap = { settings: WorkspaceSettings; pages: PageAccount[]; posts: SocialPost[]; media: any[]; providers: Record<string, boolean>; };

type WorkspaceContextValue = { user: User; boot: Bootstrap; refresh: () => Promise<void>; api: <T>(url: string, init?: RequestInit) => Promise<T>; };
const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

export async function loadBootstrapForUser(user: User) {
  const token = await user.getIdToken();
  const res = await fetch('/api/bootstrap', { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || 'Không tải được workspace.');
  return data as Bootstrap;
}

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [boot, setBoot] = useState<Bootstrap | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function refreshFor(u: User) {
    setBoot(await loadBootstrapForUser(u));
  }

  useEffect(() => onAuthStateChanged(auth, async u => {
    if (!u) { window.location.href = '/login'; return; }
    try { setUser(u); await refreshFor(u); } catch (e: any) { setError(e?.message || 'Không tải được workspace.'); }
    finally { setLoading(false); }
  }), []);

  const api = async <T,>(url: string, init: RequestInit = {}): Promise<T> => {
    const current = auth.currentUser;
    if (!current) throw new Error('Bạn chưa đăng nhập.');
    const token = await current.getIdToken();
    const res = await fetch(url, {
      ...init,
      headers: { ...(init.body ? { 'Content-Type': 'application/json' } : {}), ...(init.headers || {}), Authorization: `Bearer ${token}` },
      cache: 'no-store',
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.error || 'Yêu cầu thất bại.');
    return data;
  };

  if (loading) return <div className="loading-screen"><div className="spinner" />Đang khởi tạo workspace…</div>;
  if (error || !user || !boot) return <div className="loading-screen"><div className="alert error">{error || 'Workspace chưa sẵn sàng.'}</div></div>;
  return <WorkspaceContext.Provider value={{ user, boot, refresh: async () => refreshFor(user), api }}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspace() {
  const value = useContext(WorkspaceContext);
  if (!value) throw new Error('useWorkspace phải được dùng trong WorkspaceProvider.');
  return value;
}

export default function AppShell({ active, children }: { active: string; children: React.ReactNode }) {
  const { user, boot } = useWorkspace();
  const [openMobile, setOpenMobile] = useState(false);
  const initials = useMemo(() => (user.displayName || user.email || 'A').slice(0,1).toUpperCase(), [user]);
  const connected = boot.pages.filter(p => p.connected).length;
  async function logout() { await signOut(auth); window.location.href = '/login'; }

  return <div className="app-shell">
    {openMobile && <div className="mobile-backdrop" onClick={() => setOpenMobile(false)} />}
    <aside className={`sidebar ${openMobile ? 'mobile-open' : ''}`}>
      <div className="side-brand"><div className="brand-logo">AS</div><div><b>AutoSocial</b><span>AI Publisher</span></div></div>
      <div className="workspace-pill"><div className="workspace-dot" /><div><span>WORKSPACE</span><b>{boot.settings.brandName || 'AutoSocial AI'}</b></div></div>
      <nav className="side-nav">
        {nav.map(([id, icon, label]) => <a key={id} className={active === id ? 'active' : ''} href={`/dashboard/${id === 'dashboard' ? '' : id}`} onClick={() => setOpenMobile(false)}><i>{icon}</i><span>{label}</span></a>)}
      </nav>
      <div className="side-bottom">
        <div className="system-status"><span className="live-dot" /><div><b>Hệ thống hoạt động</b><small>{connected} Page đang kết nối</small></div></div>
        <button className="logout" onClick={logout}>↪ <span>Đăng xuất</span></button>
      </div>
    </aside>
    <main className="main-area">
      <header className="topbar">
        <button className="mobile-menu" onClick={() => setOpenMobile(true)}>☰</button>
        <div><span className="crumb">Workspace / Facebook</span><h1>{titles[active] || 'Tổng quan'}</h1></div>
        <div className="top-actions"><div className="api-chip"><span className="live-dot" /> API-first</div><button className="btn primary" onClick={() => window.location.href='/dashboard/composer'}>＋ Tạo bài mới</button><div className="avatar" title={user.email || ''}>{initials}</div></div>
      </header>
      <div className="page-content">{children}</div>
    </main>
  </div>;
}

export function StatCard({ label, value, helper, icon }: { label: string; value: string|number; helper: string; icon: string }) {
  return <div className="stat-card"><div className="stat-icon">{icon}</div><div><span>{label}</span><strong>{value}</strong><small>{helper}</small></div></div>;
}

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string,[string,string]> = { scheduled:['scheduled','Đã lên lịch'], published:['published','Đã đăng'], manual_ready:['manual','Đăng thủ công'], failed:['failed','Lỗi'], draft:['draft','Bản nháp'], processing:['processing','Đang xử lý'] };
  const [cls,text] = map[status] || ['draft',status];
  return <span className={`status ${cls}`}>{text}</span>;
}

export function PagePicture({ src, name }: { src?: string; name: string }) {
  return src ? <img className="page-picture" src={src} alt="" /> : <div className="page-picture fallback">{name.slice(0,1).toUpperCase()}</div>;
}
