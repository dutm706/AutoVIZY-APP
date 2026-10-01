'use client';
import { useMemo, useState } from 'react';
import { useWorkspace } from '@/components/AppShell';
import type { AiProvider, TargetType } from '@/lib/types';

function localDateTimeValue() { const d = new Date(Date.now() + 30 * 60 * 1000); d.setSeconds(0,0); return new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,16); }

export default function ComposerPage() {
  const { boot, api, refresh } = useWorkspace();
  const [targetType, setTargetType] = useState<TargetType>('page');
  const [targetId, setTargetId] = useState(boot.pages[0]?.id || '');
  const [targetName, setTargetName] = useState(boot.pages[0]?.name || '');
  const [title, setTitle] = useState('Bài Facebook mới');
  const [topic, setTopic] = useState('');
  const [instruction, setInstruction] = useState('');
  const [content, setContent] = useState('');
  const [imagePath, setImagePath] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [contentProvider, setContentProvider] = useState<AiProvider>(boot.settings.defaultContentProvider);
  const [imageProvider, setImageProvider] = useState<AiProvider>(boot.settings.defaultImageProvider);
  const [scheduleAt, setScheduleAt] = useState(localDateTimeValue());
  const [busy, setBusy] = useState('');
  const [notice, setNotice] = useState('');

  const chosenPage = useMemo(() => boot.pages.find(p => p.id === targetId), [boot.pages, targetId]);
  const canPublishNow = targetType === 'page' && Boolean(targetId);

  function changeType(type: TargetType) {
    setTargetType(type);
    if (type === 'page') { const page = boot.pages[0]; setTargetId(page?.id || ''); setTargetName(page?.name || ''); }
    else { setTargetId('manual'); setTargetName(type === 'group' ? 'Group Facebook' : 'Trang cá nhân'); }
  }

  async function generateContent() {
    setBusy('content'); setNotice('');
    try { const d = await api<any>('/api/ai/content', { method:'POST', body: JSON.stringify({ provider: contentProvider, topic: topic || 'Bài đăng thương hiệu', instruction, length: 1200 }) }); setContent(d.text || ''); setNotice(`Đã tạo content bằng ${contentProvider}.`); }
    catch(e:any){setNotice(e.message)} finally{setBusy('')}
  }
  async function generateImage() {
    setBusy('image'); setNotice('');
    try { const d = await api<any>('/api/ai/image', { method:'POST', body: JSON.stringify({ provider: imageProvider, prompt: `${topic || 'Social media post'}\n${instruction}\nBrand: ${boot.settings.brandContext}`, aspectRatio:'4:5' }) }); if (d.url) { setImageUrl(d.url); setImagePath(d.path || ''); setNotice(`Đã tạo ảnh bằng ${imageProvider}.`); } else { setNotice(`Claude đã tạo image prompt: ${d.imagePrompt}`); } }
    catch(e:any){setNotice(e.message)} finally{setBusy('')}
  }
  async function uploadImage(file: File) {
    setBusy('upload'); setNotice('');
    try {
      const signed = await api<any>('/api/media/upload-url', { method:'POST', body: JSON.stringify({ name:file.name, mimeType:file.type, size:file.size }) });
      const up = await fetch(signed.uploadUrl, { method:'PUT', headers:{ 'Content-Type': file.type }, body:file });
      if (!up.ok) throw new Error('Upload ảnh thất bại.');
      const preview = await api<any>(`/api/media/sign-url?path=${encodeURIComponent(signed.path)}`);
      setImagePath(signed.path); setImageUrl(preview.url); setNotice('Đã tải ảnh lên Media Library.');
    } catch(e:any){setNotice(e.message)} finally{setBusy('')}
  }
  async function save(mode: 'draft'|'scheduled'|'publish') {
    if (!content.trim()) { setNotice('Nội dung đang trống.'); return; }
    setBusy('save'); setNotice('');
    try {
      const saved = await api<any>('/api/posts', { method:'POST', body: JSON.stringify({ title, targetType, targetId, targetName, content, imagePath, scheduledAt: scheduleAt, status: mode === 'draft' ? 'draft' : 'scheduled' }) });
      if (mode === 'publish') { await api(`/api/posts/${saved.id}/publish`, { method:'POST', body:'{}' }); setNotice('Đã đăng lên Facebook Page.'); }
      else setNotice(mode==='draft' ? 'Đã lưu bản nháp.' : targetType==='page' ? 'Đã đưa vào lịch Page.' : 'Đã đưa vào hàng đợi thủ công.');
      await refresh();
    } catch(e:any){setNotice(e.message)} finally{setBusy('')}
  }

  return <div className="composer-grid">
    <div className="page-grid">
      <section className="card"><div className="card-head"><h2>Composer</h2><span>AI + Facebook</span></div><div className="card-body stack">
        <div className="form-grid">
          <div className="field"><span className="label">Nơi đăng</span><select className="select" value={targetType} onChange={e=>changeType(e.target.value as TargetType)}><option value="page">Facebook Page</option><option value="group">Group / Cộng đồng</option><option value="profile">Profile cá nhân</option></select></div>
          <div className="field"><span className="label">Đích đăng</span>{targetType==='page'?<select className="select" value={targetId} onChange={e=>{setTargetId(e.target.value);setTargetName(boot.pages.find(p=>p.id===e.target.value)?.name||'')}}>{boot.pages.map(p=><option value={p.id} key={p.id}>{p.name}</option>)}{!boot.pages.length&&<option value="">Chưa có Page</option>}</select>:<input className="input" value={targetName} onChange={e=>setTargetName(e.target.value)} placeholder="Tên Group / Profile"/>}</div>
          <div className="field full"><span className="label">Tên bài</span><input className="input" value={title} onChange={e=>setTitle(e.target.value)}/></div>
          <div className="field full"><span className="label">Chủ đề / brief</span><input className="input" value={topic} onChange={e=>setTopic(e.target.value)} placeholder="Ví dụ: Ra mắt sản phẩm mới, khuyến mãi, kiến thức…"/></div>
          <div className="field full"><span className="label">Yêu cầu thêm</span><input className="input" value={instruction} onChange={e=>setInstruction(e.target.value)} placeholder="Hook mạnh, CTA, đối tượng, thông tin bắt buộc…"/></div>
        </div>
        <div className="form-grid">
          <div className="field"><span className="label">AI Content</span><select className="select" value={contentProvider} onChange={e=>setContentProvider(e.target.value as AiProvider)}><option value="openai">OpenAI GPT</option><option value="gemini">Google Gemini</option><option value="claude">Anthropic Claude</option></select></div>
          <div className="field"><span className="label">AI Image</span><select className="select" value={imageProvider} onChange={e=>setImageProvider(e.target.value as AiProvider)}><option value="gemini">Gemini Image</option><option value="openai">OpenAI Image</option><option value="claude">Claude → image prompt</option></select></div>
        </div>
        <div className="ai-buttons"><button className="ai-btn" onClick={generateContent} disabled={!!busy}>{busy==='content'?'Đang tạo…':'✦ Tạo content AI'}</button><button className="ai-btn" onClick={generateImage} disabled={!!busy}>{busy==='image'?'Đang tạo…':'▧ Tạo ảnh AI'}</button><label className="ai-btn">＋ Tải ảnh<input type="file" accept="image/*" hidden onChange={e=>e.target.files?.[0]&&uploadImage(e.target.files[0])}/></label></div>
        <div className="field"><span className="label">Nội dung</span><textarea className="textarea" value={content} onChange={e=>setContent(e.target.value)} placeholder="Nội dung bài đăng…"/></div>
        <div className="form-grid"><div className="field"><span className="label">Thời gian đăng</span><input className="input" type="datetime-local" value={scheduleAt} onChange={e=>setScheduleAt(e.target.value)}/></div><div className="field"><span className="label">Ảnh</span><input className="input" value={imagePath ? 'Đã chọn media' : ''} readOnly placeholder="Chưa có ảnh"/></div></div>
        {notice && <div className={`notice ${notice.toLowerCase().includes('lỗi')||notice.toLowerCase().includes('thất bại')?'warning':''}`}>{notice}</div>}
        <div className="toolbar"><div className="toolbar-left"><button className="btn secondary" onClick={()=>save('draft')} disabled={!!busy}>Lưu nháp</button><button className="btn primary" onClick={()=>save('scheduled')} disabled={!!busy}>＋ {targetType==='page'?'Lên lịch':'Đưa vào hàng đợi'}</button></div>{canPublishNow&&<div className="toolbar-right"><button className="btn ghost" onClick={()=>save('publish')} disabled={!!busy}>Đăng ngay →</button></div>}</div>
      </div></section>
      {targetType!=='page'&&<div className="notice warning">Group/Profile không có public Groups publishing API hiện hành. App chỉ tạo hàng đợi, ảnh, nội dung và lịch để bạn đăng thủ công.</div>}
      {targetType==='page'&&!chosenPage&&<div className="notice warning">Chưa có Facebook Page. Kết nối Page trước trong menu Facebook Page.</div>}
    </div>
    <section className="preview"><div className="preview-top">LIVE PREVIEW · {targetName || 'Facebook'}</div><div className="fb-post"><div className="fb-head"><div className="fb-avatar">{(targetName||'A').slice(0,1).toUpperCase()}</div><div><b>{targetName||'Tên Page'}</b><small>Vừa xong · Công khai</small></div></div><div className="fb-text">{content||'Nội dung xem trước sẽ xuất hiện tại đây…'}</div><div className="fb-image">{imageUrl?<img src={imageUrl} alt="Generated"/>:'Khu vực ảnh'}</div></div></section>
  </div>;
}
