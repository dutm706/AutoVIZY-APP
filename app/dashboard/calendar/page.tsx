'use client';
import { useMemo } from 'react';
import { StatusBadge, useWorkspace } from '@/components/AppShell';

export default function CalendarPage(){
  const {boot}=useWorkspace();
  const days=useMemo(()=>Array.from({length:14},(_,i)=>{const d=new Date();d.setDate(d.getDate()+i);return d;}),[]);
  return <div className="page-grid">
    <div className="toolbar"><div className="toolbar-left"><a className="btn primary" href="/dashboard/composer">＋ Tạo bài</a><span className="api-chip">Worker: mỗi phút</span></div><div className="toolbar-right"><span className="muted">Timezone: {boot.settings.timezone}</span></div></div>
    <section className="card"><div className="card-head"><h2>14 ngày tới</h2><span>{boot.posts.filter(p=>p.status==='scheduled').length} bài đã lên lịch</span></div><div className="card-body"><div className="calendar-grid">{days.map(d=><div key={d.toISOString()}><div className="calendar-head">{d.toLocaleDateString('vi-VN',{weekday:'short'}).toUpperCase()}</div><div className="calendar-day"><b>{d.getDate()}/{d.getMonth()+1}</b>{boot.posts.filter(p=>p.scheduledAt&&new Date(p.scheduledAt).toDateString()===d.toDateString()).map(p=><div className="cal-event" key={p.id}><strong>{p.scheduledAt&&new Date(p.scheduledAt).toLocaleTimeString('vi-VN',{hour:'2-digit',minute:'2-digit'})} · {p.title}</strong><div>{p.targetName}</div><StatusBadge status={p.status}/></div>)}</div></div>)}</div></div></section>
  </div>
}
