import { NextRequest } from 'next/server';
import { requireUser, ensureUserProfile } from '@/lib/auth';
import { fail, ok } from '@/lib/api';
import { db, FieldValue } from '@/lib/firebase/admin';

export async function PUT(request: NextRequest) {
  try {
    const user = await requireUser(request);
    await ensureUserProfile(user.uid, user.email, user.name);
    const b = await request.json();
    await db.doc(`users/${user.uid}/settings/main`).set({
      brandName: String(b.brandName || 'AutoSocial AI').slice(0, 120),
      defaultTone: String(b.defaultTone || '').slice(0, 1000),
      brandContext: String(b.brandContext || '').slice(0, 8000),
      hashtag: String(b.hashtag || '').slice(0, 1000),
      defaultContentProvider: ['openai','gemini','claude'].includes(b.defaultContentProvider) ? b.defaultContentProvider : 'openai',
      defaultImageProvider: ['openai','gemini','claude'].includes(b.defaultImageProvider) ? b.defaultImageProvider : 'gemini',
      timezone: String(b.timezone || 'Asia/Ho_Chi_Minh'),
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });
    return ok({ success: true });
  } catch (e) { return fail(e); }
}
