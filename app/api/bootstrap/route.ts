import { NextRequest } from 'next/server';
import { ensureUserProfile, requireUser } from '@/lib/auth';
import { fail, ok, cleanDoc } from '@/lib/api';
import { db } from '@/lib/firebase/admin';
import { providerStatus } from '@/lib/ai';

export async function GET(request: NextRequest) {
  try {
    const user = await requireUser(request);
    await ensureUserProfile(user.uid, user.email, user.name);
    const root = db.doc(`users/${user.uid}`);
    const [settingsSnap, pagesSnap, postsSnap, mediaSnap] = await Promise.all([
      root.collection('settings').doc('main').get(),
      root.collection('pages').orderBy('name').get(),
      root.collection('posts').orderBy('createdAt', 'desc').limit(80).get(),
      root.collection('media').orderBy('createdAt', 'desc').limit(60).get(),
    ]);
    const settings = settingsSnap.data() || {};
    return ok({
      settings: cleanDoc({
        brandName: settings.brandName || 'AutoSocial AI',
        defaultTone: settings.defaultTone || '',
        brandContext: settings.brandContext || '',
        hashtag: settings.hashtag || '',
        defaultContentProvider: settings.defaultContentProvider || 'openai',
        defaultImageProvider: settings.defaultImageProvider || 'gemini',
        timezone: settings.timezone || 'Asia/Ho_Chi_Minh',
      }),
      pages: pagesSnap.docs.map(d => cleanDoc({ id: d.id, ...d.data() })),
      posts: postsSnap.docs.map(d => cleanDoc({ id: d.id, ...d.data() })),
      media: mediaSnap.docs.map(d => cleanDoc({ id: d.id, ...d.data() })),
      providers: providerStatus(),
    });
  } catch (e) { return fail(e); }
}
