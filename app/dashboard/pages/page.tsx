'use client';
import { useEffect, useState } from 'react';
import { PagePicture, useWorkspace } from '@/components/AppShell';

export default function PagesPage(){
 const {boot,api,refresh}=useWorkspace(); const [notice,setNotice]=useState('');
 async function connect(){try{const d=await api<any>('/api/facebook/oauth/start',{method:'POST',body:JSON.stringify({})});window.location.href=d.url}catch(e:any){setNotice(e.message)}}
 async function remove(id:string,name:string){if(!confirm(`Ngắt kết nối ${name}?`))return;try{await api(`/api/facebook/pages/${id}`,{method:'DELETE'});await refresh();}catch(e:any){setNotice(e.message)}}
 useEffect(()=>{const p=new URLSearchParams(window.location.search);if(p.get('connected'))setNotice(`Đã đồng bộ ${p.get('connected')} Facebook Page.`);if(p.get('error'))setNotice(p.get('error')!);},[]);
 return <div className="page-grid"><div className="toolbar"><div className="toolbar-left"><button className="btn primary" onClick={connect}>f  Kết nối Facebook</button><a className="btn secondary" href="/dashboard/composer">+ Tạo bài</a></div></div>
 {notice&&<div className="notice">{notice}</div>}
 <section className="card"><div className="card-head"><h2>Facebook Pages</h2><span>{boot.pages.length} Page</span></div><div className="card-body"><div className="table-wrap"><table className="table"><thead><tr><th>Page</th><th>ID</th><th>Trạng thái</th><th>Quyền</th><th></th></tr></thead><tbody>{boot.pages.map(p=><tr key={p.id}><td><div className="page-cell"><PagePicture src={p.pictureUrl} name={p.name}/><div><b>{p.name}</b><div className="muted">Facebook Page</div></div></div></td><td>{p.id}</td><td><span className={`status ${p.connected?'published':'manual'}`}>{p.connected?'Đã kết nối':'Chưa kết nối'}</span></td><td><span className="muted">Page API</span></td><td><button className="btn secondary" onClick={()=>remove(p.id,p.name)}>Ngắt</button></td></tr>)}</tbody></table>{!boot.pages.length&&<div className="empty">Chưa có Page. Kết nối Facebook để đồng bộ Page mà tài khoản của bạn quản lý.</div>}</div></div></section>
 <div className="notice warning">OAuth cần cấu hình Meta App, redirect URI chính xác và các quyền phù hợp. Group/Profile được giữ ở hàng đợi thủ công vì public Groups API đã bị loại bỏ.</div>
 </div>
}
