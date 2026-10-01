'use client';

import { FormEvent, useEffect, useState } from 'react';
import { createUserWithEmailAndPassword, onAuthStateChanged, signInWithEmailAndPassword, signInWithPopup } from 'firebase/auth';
import { auth, googleProvider } from '@/lib/firebase/client';

export default function LoginPage() {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => onAuthStateChanged(auth, (u) => { if (u) window.location.href = '/dashboard'; }), []);

  async function submit(e: FormEvent) {
    e.preventDefault(); setBusy(true); setError('');
    try {
      if (mode === 'login') await signInWithEmailAndPassword(auth, email, password);
      else await createUserWithEmailAndPassword(auth, email, password);
      window.location.href = '/dashboard';
    } catch (e: any) { setError(e?.message || 'Không đăng nhập được.'); }
    finally { setBusy(false); }
  }

  async function google() {
    setBusy(true); setError('');
    try { await signInWithPopup(auth, googleProvider); window.location.href = '/dashboard'; }
    catch (e: any) { setError(e?.message || 'Đăng nhập Google thất bại.'); }
    finally { setBusy(false); }
  }

  return <main className="auth-page">
    <div className="auth-glow" />
    <section className="auth-card">
      <div className="brand-lockup"><div className="brand-logo">AS</div><div><b>AutoSocial AI</b><span>Facebook publishing workspace</span></div></div>
      <div className="auth-title"><h1>{mode === 'login' ? 'Chào mừng trở lại' : 'Tạo workspace mới'}</h1><p>Quản lý nội dung, AI và lịch đăng từ một nơi.</p></div>
      {error && <div className="alert error">{error}</div>}
      <form onSubmit={submit} className="stack">
        <label>Email<input value={email} onChange={e => setEmail(e.target.value)} type="email" required placeholder="you@company.com" /></label>
        <label>Mật khẩu<input value={password} onChange={e => setPassword(e.target.value)} type="password" required minLength={6} placeholder="••••••••" /></label>
        <button className="btn primary big" disabled={busy}>{busy ? 'Đang xử lý…' : mode === 'login' ? 'Đăng nhập' : 'Tạo tài khoản'}</button>
      </form>
      <div className="divider"><span>hoặc</span></div>
      <button className="btn secondary big" onClick={google} disabled={busy}>G <span>Tiếp tục bằng Google</span></button>
      <button className="switch" onClick={() => setMode(mode === 'login' ? 'register' : 'login')}>
        {mode === 'login' ? 'Chưa có tài khoản? Tạo mới' : 'Đã có tài khoản? Đăng nhập'}
      </button>
      <div className="micro-note">API key AI và Facebook token không nằm trong trình duyệt.</div>
    </section>
  </main>;
}
