import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase/admin';
import { exchangeCodeForUserToken, fetchPages, savePage } from '@/lib/facebook';

export async function GET(request: NextRequest) {
  const base = process.env.APP_BASE_URL || request.nextUrl.origin;
  const dashboard = `${base}/dashboard/pages`;
  try {
    const code = request.nextUrl.searchParams.get('code');
    const state = request.nextUrl.searchParams.get('state');
    const error = request.nextUrl.searchParams.get('error_description');
    if (error) throw new Error(error);
    if (!code || !state) throw new Error('Thiếu OAuth code/state.');
    const cookieState = request.cookies.get('fb_oauth_state')?.value;
    if (!cookieState || cookieState !== state) throw new Error('OAuth state không hợp lệ hoặc đã hết hạn.');
    const stateSnap = await db.doc(`oauthStates/${state}`).get();
    if (!stateSnap.exists) throw new Error('OAuth state không tồn tại.');
    const uid = String(stateSnap.data()?.uid || '');
    await db.doc(`oauthStates/${state}`).delete();
    const redirectUri = `${base}/api/facebook/oauth/callback`;
    const userToken = await exchangeCodeForUserToken(code, redirectUri);
    const pages = await fetchPages(userToken);
    for (const page of pages) await savePage(uid, page);
    const url = new URL(dashboard);
    url.searchParams.set('connected', String(pages.length));
    const response = NextResponse.redirect(url);
    response.cookies.delete('fb_oauth_state');
    return response;
  } catch (e) {
    const url = new URL(dashboard);
    url.searchParams.set('error', e instanceof Error ? e.message : 'Facebook OAuth thất bại');
    return NextResponse.redirect(url);
  }
}
