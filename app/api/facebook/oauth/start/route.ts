import { NextRequest } from 'next/server';
import { requireUser } from '@/lib/auth';
import { fail, ok } from '@/lib/api';
import { db, FieldValue } from '@/lib/firebase/admin';
import { facebookOAuthUrl } from '@/lib/facebook';
import { randomState } from '@/lib/crypto';
import { NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const user = await requireUser(request);
    const { redirectUri } = await request.json().catch(() => ({}));
    const base = process.env.APP_BASE_URL || new URL(request.url).origin;
    const callback = String(redirectUri || `${base}/api/facebook/oauth/callback`);
    const state = randomState();
    await db.doc(`oauthStates/${state}`).set({ uid: user.uid, createdAt: FieldValue.serverTimestamp() });
    const response = ok({ url: facebookOAuthUrl(state, callback) });
    response.cookies.set('fb_oauth_state', state, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', maxAge: 600, path: '/' });
    return response;
  } catch (e) { return fail(e); }
}
