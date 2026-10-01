'use client';
import AppShell, { PagePicture, StatCard, StatusBadge, useWorkspace } from '@/components/AppShell';

export default function DashboardPage() {
  const { boot } = useWorkspace();
  const posts = boot.posts;
  const scheduled = posts.filter(p => p.status === 'scheduled').length;
  const published = posts.filter(p => p.status === 'published').length;
  const manual = posts.filter(p => p.status === 'manual_ready').length;
  const connected = boot.pages.filter(p => p.connected).length;
  const recent = posts.slice(0, 6);
  return <>
    <div className="stats-grid">
      <StatCard icon="▣" label="Bài đã lên lịch" value={scheduled} helper="đang chờ worker" />
      <StatCard icon="✓" label="Đã đăng" value={published} helper="trong workspace" />
      <StatCard icon="◎" label="Chờ đăng thủ công" value={manual} helper="Group / Profile" />
      <StatCard icon="●" label="Facebook Page" value={connected} helper="đang kết nối" />
    </div>
    <div className="two-col">
      <section className="card"><div className="card-head"><h2>Bài viết gần đây</h2><span>{posts.length} bài</span></div><div className="card-body post-list">
        {recent.length ? recent.map(p => <div className="post-item" key={p.id}><div className="post-thumb">{p.targetType.toUpperCase()}</div><div><div className="post-title">{p.title}</div><div className="post-meta">{p.targetName || 'Chưa chọn đích'} · {p.scheduledAt ? new Date(p.scheduledAt).toLocaleString('vi-VN') : 'chưa lên lịch'}</div></div><StatusBadge status={p.status}/></div>) : <div className="empty">Chưa có bài viết. Hãy tạo bài đầu tiên.</div>}
      </div></section>
      <aside className="page-grid">
        <section className="card"><div className="card-head"><h2>AI workflow</h2><span>3 providers</span></div><div className="card-body"><div className="quick-grid">
          <a className="quick" href="/dashboard/composer"><b>✦ Tạo content</b><span>GPT / Gemini / Claude độc lập</span></a>
          <a className="quick" href="/dashboard/composer"><b>▧ Tạo ảnh</b><span>OpenAI Image / Gemini Image</span></a>
          <a className="quick" href="/dashboard/calendar"><b>◫ Lịch đăng</b><span>Worker chạy mỗi phút</span></a>
          <a className="quick" href="/dashboard/pages"><b>▣ Facebook Pages</b><span>Kết nối OAuth + token mã hóa</span></a>
        </div></div></section>
        <section className="card"><div className="card-head"><h2>Page đang kết nối</h2><a className="btn ghost" href="/dashboard/pages">Quản lý</a></div><div className="card-body stack">{boot.pages.filter(p=>p.connected).slice(0,4).map(p => <div className="account-row" key={p.id}><div className="account-main"><PagePicture src={p.pictureUrl} name={p.name}/><div><b style={{fontSize:11}}>{p.name}</b><div className="muted">ID {p.id}</div></div></div><span className="status published">Connected</span></div>)}{!connected&&<div className="empty">Chưa kết nối Page.</div>}</div></section>
      </aside>
    </div>
  </>;
}
