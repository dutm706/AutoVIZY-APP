import type { NextRequest } from 'next/server';
import { adminAuth, db, FieldValue } from '@/lib/firebase/admin';

export class AuthError extends Error {
  status = 401;
}

export async function requireUser(request: NextRequest) {
  const header = request.headers.get('authorization') || '';
  const match = header.match(/^Bearer\s+(.+)$/i);
  if (!match) throw new AuthError('Bạn cần đăng nhập.');

  try {
    return await adminAuth.verifyIdToken(match[1]);
  } catch {
    throw new AuthError('Phiên đăng nhập đã hết hạn.');
  }
}

export async function ensureUserProfile(uid: string, email?: string | null, displayName?: string | null) {
  const ref = db.doc(`users/${uid}`);
  const snap = await ref.get();
  if (!snap.exists) {
    await ref.set({
      email: email || '',
      displayName: displayName || '',
      role: 'admin',
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
  } else {
    await ref.set({ updatedAt: FieldValue.serverTimestamp() }, { merge: true });
  }

  const settingsRef = ref.collection('settings').doc('main');
  const settings = await settingsRef.get();
  if (!settings.exists) {
    await settingsRef.set({
      brandName: 'AutoSocial AI',
      defaultTone: 'Tự nhiên, rõ ràng, chuyên nghiệp nhưng gần gũi',
      brandContext: 'Mô tả thương hiệu, sản phẩm, khách hàng mục tiêu và điều cần tránh.',
      hashtag: '#AutoSocialAI',
      defaultContentProvider: 'openai',
      defaultImageProvider: 'gemini',
      timezone: 'Asia/Ho_Chi_Minh',
      updatedAt: FieldValue.serverTimestamp(),
    });
  }
}
